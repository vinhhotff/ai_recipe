import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  FeatureType, 
  UsageUpdateDto, 
  UsageCheckResponseDto,
  UsageQuota,
  PlanFeatures
} from '../dto';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  // Check if user can use a feature
  async checkUsage(userId: string, featureType: FeatureType): Promise<UsageCheckResponseDto> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    // No subscription means free plan with limited features
    if (!subscription || subscription.status !== 'ACTIVE') {
      return this.getFreeUsageCheck(featureType);
    }

    const usageQuota = subscription.usageQuota as unknown as UsageQuota;
    const planFeatures = subscription.plan.features as unknown as PlanFeatures;

    let remainingQuota: number;
    let totalQuota: number;

    switch (featureType) {
      case FeatureType.RECIPE_GENERATION:
        remainingQuota = usageQuota.recipeGenerationsLeft;
        totalQuota = planFeatures.maxRecipeGenerations;
        break;
      case FeatureType.VIDEO_GENERATION:
        remainingQuota = usageQuota.videoGenerationsLeft;
        totalQuota = planFeatures.maxVideoGenerations;
        break;
      case FeatureType.COMMUNITY_POST:
        remainingQuota = usageQuota.communityPostsLeft;
        totalQuota = planFeatures.maxCommunityPosts;
        break;
      case FeatureType.COMMUNITY_COMMENT:
        remainingQuota = usageQuota.communityCommentsLeft;
        totalQuota = planFeatures.maxCommunityComments;
        break;
      default:
        throw new Error(`Unknown feature type: ${featureType}`);
    }

    const canUse = remainingQuota > 0;

    return {
      canUse,
      remainingQuota,
      totalQuota,
      message: canUse ? undefined : this.getUpgradeMessage(featureType, subscription.plan.name),
      suggestedPlan: canUse ? undefined : this.getSuggestedPlan(subscription.plan.name)
    };
  }

  // Decrement usage quota
  async updateUsage(userId: string, updateDto: UsageUpdateDto): Promise<void> {
    // First check if user can use the feature
    const usageCheck = await this.checkUsage(userId, updateDto.featureType);
    
    if (!usageCheck.canUse) {
      throw new ForbiddenException(
        usageCheck.message || 'Usage quota exceeded for this feature'
      );
    }

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      // For free users, we might want to track usage differently
      // For now, just allow limited free usage
      return;
    }

    // Update the quota
    const currentQuota = subscription.usageQuota as unknown as UsageQuota;
    const updatedQuota = { ...currentQuota };

    switch (updateDto.featureType) {
      case FeatureType.RECIPE_GENERATION:
        updatedQuota.recipeGenerationsLeft = Math.max(0, currentQuota.recipeGenerationsLeft - updateDto.amount);
        break;
      case FeatureType.VIDEO_GENERATION:
        updatedQuota.videoGenerationsLeft = Math.max(0, currentQuota.videoGenerationsLeft - updateDto.amount);
        break;
      case FeatureType.COMMUNITY_POST:
        updatedQuota.communityPostsLeft = Math.max(0, currentQuota.communityPostsLeft - updateDto.amount);
        break;
      case FeatureType.COMMUNITY_COMMENT:
        updatedQuota.communityCommentsLeft = Math.max(0, currentQuota.communityCommentsLeft - updateDto.amount);
        break;
    }

    await this.prisma.userSubscription.update({
      where: { userId },
      data: { usageQuota: updatedQuota }
    });
  }

  // Convenient method to check and update in one go
  async checkAndUpdateUsage(userId: string, featureType: FeatureType, amount: number = 1): Promise<void> {
    const usageCheck = await this.checkUsage(userId, featureType);
    
    if (!usageCheck.canUse) {
      throw new ForbiddenException(
        usageCheck.message || 'Usage quota exceeded for this feature'
      );
    }

    await this.updateUsage(userId, { featureType, amount });
  }

  // Get user's current usage summary
  async getUserUsageSummary(userId: string): Promise<{
    planName: string;
    usageQuota: UsageQuota;
    planFeatures: PlanFeatures;
  }> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      // Return free plan limits
      const freeFeatures: PlanFeatures = {
        maxRecipeGenerations: 5,
        maxVideoGenerations: 1,
        maxCommunityPosts: 3,
        maxCommunityComments: 10,
        aiSuggestions: false,
        premiumTemplates: false,
        exportToPdf: false,
        prioritySupport: false
      };

      const freeQuota: UsageQuota = {
        recipeGenerationsLeft: 5,
        videoGenerationsLeft: 1,
        communityPostsLeft: 3,
        communityCommentsLeft: 10
      };

      return {
        planName: 'Free',
        usageQuota: freeQuota,
        planFeatures: freeFeatures
      };
    }

    return {
      planName: subscription.plan.name,
      usageQuota: subscription.usageQuota as unknown as UsageQuota,
      planFeatures: subscription.plan.features as unknown as PlanFeatures
    };
  }

  // Check if user has access to premium features
  async hasFeatureAccess(userId: string, feature: keyof PlanFeatures): Promise<boolean> {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      // Free plan features
      const freeFeatures = ['maxRecipeGenerations', 'maxVideoGenerations', 'maxCommunityPosts', 'maxCommunityComments'];
      return freeFeatures.includes(feature);
    }

    const planFeatures = subscription.plan.features as unknown as PlanFeatures;
    
    if (typeof planFeatures[feature] === 'boolean') {
      return planFeatures[feature] as boolean;
    }
    
    return true; // For numeric features, access is always granted (quota is checked separately)
  }

  // Admin function to reset all user quotas (for billing cycle refresh)
  async resetAllUserQuotas(): Promise<void> {
    const activeSubscriptions = await this.prisma.userSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true }
    });

    for (const subscription of activeSubscriptions) {
      const planFeatures = subscription.plan.features as unknown as PlanFeatures;
      const refreshedQuota: UsageQuota = {
        recipeGenerationsLeft: planFeatures.maxRecipeGenerations,
        videoGenerationsLeft: planFeatures.maxVideoGenerations,
        communityPostsLeft: planFeatures.maxCommunityPosts,
        communityCommentsLeft: planFeatures.maxCommunityComments
      };

      await this.prisma.userSubscription.update({
        where: { id: subscription.id },
        data: { usageQuota: refreshedQuota as any }
      });
    }
  }

  // Private helper methods
  private getFreeUsageCheck(featureType: FeatureType): UsageCheckResponseDto {
    // Define free plan limits
    const freeLimits = {
      [FeatureType.RECIPE_GENERATION]: { remaining: 0, total: 5 },
      [FeatureType.VIDEO_GENERATION]: { remaining: 0, total: 1 },
      [FeatureType.COMMUNITY_POST]: { remaining: 0, total: 3 },
      [FeatureType.COMMUNITY_COMMENT]: { remaining: 0, total: 10 }
    };

    const limit = freeLimits[featureType];

    return {
      canUse: false,
      remainingQuota: limit.remaining,
      totalQuota: limit.total,
      message: `Free plan limit reached for ${featureType}. Upgrade to Pro for more features.`,
      suggestedPlan: 'Pro'
    };
  }

  private getUpgradeMessage(featureType: FeatureType, currentPlan: string): string {
    const featureNames = {
      [FeatureType.RECIPE_GENERATION]: 'recipe generation',
      [FeatureType.VIDEO_GENERATION]: 'video generation',
      [FeatureType.COMMUNITY_POST]: 'community posts',
      [FeatureType.COMMUNITY_COMMENT]: 'community comments'
    };

    const featureName = featureNames[featureType] || featureType;
    
    return `You have reached your monthly limit for ${featureName}. ${
      currentPlan === 'Free' ? 'Upgrade to Pro' : 'Upgrade to Premium'
    } for higher limits.`;
  }

  private getSuggestedPlan(currentPlan: string): string {
    if (currentPlan === 'Free') return 'Pro';
    if (currentPlan === 'Pro') return 'Premium';
    return 'Premium';
  }

  // Middleware helper method
  async enforceFeatureAccess(userId: string, featureType: FeatureType): Promise<void> {
    const usageCheck = await this.checkUsage(userId, featureType);
    
    if (!usageCheck.canUse) {
      throw new ForbiddenException({
        message: usageCheck.message,
        suggestedPlan: usageCheck.suggestedPlan,
        featureType,
        remainingQuota: usageCheck.remainingQuota,
        totalQuota: usageCheck.totalQuota
      });
    }
  }
}
