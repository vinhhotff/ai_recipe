import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache.service';
import { 
  CreateSubscriptionDto, 
  UpdateSubscriptionDto,
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscriptionStatsResponseDto,
  PlanFeatures,
  UsageQuota,
  SubscriptionStatus,
  BillingCycle
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // Plan Management
  async getAvailablePlans(): Promise<SubscriptionPlanResponseDto[]> {
    const plans = await this.cacheService.getOrSet(
      CacheService.KEYS.SUBSCRIPTION_PLANS,
      async () => {
        return await this.prisma.subscriptionPlan.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        });
      },
      CacheService.TTL.VERY_LONG // 1 hour
    );

    return plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price.toString(),
      yearlyPrice: plan.yearlyPrice?.toString(),
      features: plan.features as unknown as PlanFeatures,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder
    }));
  }

  async getPlanById(planId: string): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${planId} not found`);
    }

    return {
      id: plan.id,
      name: plan.name,
      price: plan.price.toString(),
      yearlyPrice: plan.yearlyPrice?.toString(),
      features: plan.features as unknown as PlanFeatures,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder
    };
  }

  // User Subscription Management
  async getUserSubscription(userId: string): Promise<UserSubscriptionResponseDto | null> {
    const subscription = await this.cacheService.getOrSet(
      CacheService.KEYS.USER_SUBSCRIPTION(userId),
      async () => {
        return await this.prisma.userSubscription.findUnique({
          where: { userId },
          include: { plan: true }
        });
      },
      CacheService.TTL.MEDIUM // 5 minutes
    );

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      planName: subscription.plan.name,
      status: subscription.status as SubscriptionStatus,
      billingCycle: subscription.billingCycle as BillingCycle,
      usageQuota: subscription.usageQuota as unknown as UsageQuota,
      planFeatures: subscription.plan.features as unknown as PlanFeatures,
      startDate: subscription.startDate.toISOString(),
      nextBillingDate: subscription.nextBillingDate?.toISOString(),
      endDate: subscription.endDate?.toISOString(),
      autoRenew: subscription.autoRenew,
      createdAt: subscription.createdAt.toISOString()
    };
  }

  async createSubscription(userId: string, createDto: CreateSubscriptionDto): Promise<UserSubscriptionResponseDto> {
    // Check if user already has an active subscription
    const existingSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId }
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      throw new ConflictException('User already has an active subscription');
    }

    // Validate plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: createDto.planId }
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Subscription plan with ID ${createDto.planId} not found or inactive`);
    }

    // Calculate billing dates
    const startDate = new Date();
    const nextBillingDate = this.calculateNextBillingDate(startDate, createDto.billingCycle);
    
    // Initialize usage quota from plan features
    const planFeatures = plan.features as unknown as PlanFeatures;
    const usageQuota: UsageQuota = {
      recipeGenerationsLeft: planFeatures.maxRecipeGenerations,
      videoGenerationsLeft: planFeatures.maxVideoGenerations,
      communityPostsLeft: planFeatures.maxCommunityPosts,
      communityCommentsLeft: planFeatures.maxCommunityComments
    };

    // Create or update subscription
    const subscription = await this.prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: createDto.planId,
        status: 'ACTIVE',
        startDate,
        nextBillingDate,
        usageQuota: usageQuota as any,
        billingCycle: createDto.billingCycle,
        autoRenew: createDto.autoRenew
      },
      update: {
        planId: createDto.planId,
        status: 'ACTIVE',
        startDate,
        nextBillingDate,
        usageQuota: usageQuota as any,
        billingCycle: createDto.billingCycle,
        autoRenew: createDto.autoRenew,
        canceledAt: null
      },
      include: { plan: true }
    });

    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      planName: subscription.plan.name,
      status: subscription.status as SubscriptionStatus,
      billingCycle: subscription.billingCycle as BillingCycle,
      usageQuota: subscription.usageQuota as unknown as UsageQuota,
      planFeatures: subscription.plan.features as unknown as PlanFeatures,
      startDate: subscription.startDate.toISOString(),
      nextBillingDate: subscription.nextBillingDate?.toISOString(),
      endDate: subscription.endDate?.toISOString(),
      autoRenew: subscription.autoRenew,
      createdAt: subscription.createdAt.toISOString()
    };
  }

  async updateSubscription(userId: string, updateDto: UpdateSubscriptionDto): Promise<UserSubscriptionResponseDto> {
    const existingSubscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!existingSubscription) {
      throw new NotFoundException('No subscription found for user');
    }

    let updateData: any = {};

    // Handle plan upgrade/downgrade
    if (updateDto.planId && updateDto.planId !== existingSubscription.planId) {
      const newPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: updateDto.planId }
      });

      if (!newPlan || !newPlan.isActive) {
        throw new NotFoundException(`New subscription plan not found or inactive`);
      }

      updateData.planId = updateDto.planId;
      
      // Reset usage quota for new plan
      const newPlanFeatures = newPlan.features as unknown as PlanFeatures;
      updateData.usageQuota = {
        recipeGenerationsLeft: newPlanFeatures.maxRecipeGenerations,
        videoGenerationsLeft: newPlanFeatures.maxVideoGenerations,
        communityPostsLeft: newPlanFeatures.maxCommunityPosts,
        communityCommentsLeft: newPlanFeatures.maxCommunityComments
      };
    }

    // Handle status changes
    if (updateDto.status) {
      updateData.status = updateDto.status;
      
      if (updateDto.status === 'CANCELED') {
        updateData.canceledAt = new Date();
        updateData.autoRenew = false;
      }
    }

    // Handle billing cycle changes
    if (updateDto.billingCycle) {
      updateData.billingCycle = updateDto.billingCycle;
      updateData.nextBillingDate = this.calculateNextBillingDate(
        existingSubscription.startDate,
        updateDto.billingCycle
      );
    }

    if (updateDto.autoRenew !== undefined) {
      updateData.autoRenew = updateDto.autoRenew;
    }

    const updatedSubscription = await this.prisma.userSubscription.update({
      where: { userId },
      data: updateData,
      include: { plan: true }
    });

    return {
      id: updatedSubscription.id,
      userId: updatedSubscription.userId,
      planId: updatedSubscription.planId,
      planName: updatedSubscription.plan.name,
      status: updatedSubscription.status as SubscriptionStatus,
      billingCycle: updatedSubscription.billingCycle as BillingCycle,
      usageQuota: updatedSubscription.usageQuota as unknown as UsageQuota,
      planFeatures: updatedSubscription.plan.features as unknown as PlanFeatures,
      startDate: updatedSubscription.startDate.toISOString(),
      nextBillingDate: updatedSubscription.nextBillingDate?.toISOString(),
      endDate: updatedSubscription.endDate?.toISOString(),
      autoRenew: updatedSubscription.autoRenew,
      createdAt: updatedSubscription.createdAt.toISOString()
    };
  }

  async cancelSubscription(userId: string): Promise<UserSubscriptionResponseDto> {
    return this.updateSubscription(userId, { 
      status: SubscriptionStatus.CANCELED,
      autoRenew: false 
    });
  }

  // Usage Management
  async refreshUsageQuota(userId: string): Promise<void> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      return;
    }

    const planFeatures = subscription.plan.features as unknown as PlanFeatures;
    const refreshedQuota: UsageQuota = {
      recipeGenerationsLeft: planFeatures.maxRecipeGenerations,
      videoGenerationsLeft: planFeatures.maxVideoGenerations,
      communityPostsLeft: planFeatures.maxCommunityPosts,
      communityCommentsLeft: planFeatures.maxCommunityComments
    };

    await this.prisma.userSubscription.update({
      where: { userId },
      data: { 
        usageQuota: refreshedQuota as any,
        nextBillingDate: this.calculateNextBillingDate(new Date(), subscription.billingCycle as BillingCycle)
      }
    });
  }

  // Statistics
  async getSubscriptionStats(): Promise<SubscriptionStatsResponseDto> {
    const totalSubscribers = await this.prisma.userSubscription.count();
    const activeSubscribers = await this.prisma.userSubscription.count({
      where: { status: 'ACTIVE' }
    });

    const monthlyRevenue = await this.prisma.paymentTransaction.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: { amount: true }
    });

    const subscribersByPlan = await this.prisma.userSubscription.groupBy({
      by: ['planId'],
      _count: { planId: true }
    });

    const subscribersByPlanMap: Record<string, number> = {};
    for (const group of subscribersByPlan) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: group.planId },
        select: { name: true }
      });
      if (plan) {
        subscribersByPlanMap[plan.name] = group._count.planId;
      }
    }

    return {
      totalSubscribers,
      activeSubscribers,
      monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
      subscribersByPlan: subscribersByPlanMap,
      retentionRate: totalSubscribers > 0 ? (activeSubscribers / totalSubscribers) * 100 : 0
    };
  }

  // Private helper methods
  private calculateNextBillingDate(startDate: Date, billingCycle: BillingCycle): Date {
    const nextBilling = new Date(startDate);
    
    if (billingCycle === BillingCycle.MONTHLY) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else if (billingCycle === BillingCycle.YEARLY) {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }
    
    return nextBilling;
  }

  async isUserSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId }
    });

    return subscription?.status === 'ACTIVE';
  }

  async getUserPlanName(userId: string): Promise<string> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    return subscription?.plan.name || 'Free';
  }
}
