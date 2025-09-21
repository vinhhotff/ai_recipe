import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch,
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './services/subscription.service';
import { PaymentService } from './services/payment.service';
import { UsageService } from './services/usage.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionPlanResponseDto,
  UserSubscriptionResponseDto,
  SubscriptionStatsResponseDto,
  CreatePaymentDto,
  PaymentResponseDto,
  PaymentWebhookDto,
  RefundPaymentDto,
  PaymentStatsResponseDto,
  UsageUpdateDto,
  UsageCheckResponseDto,
  FeatureType,
  PlanFeatures
} from './dto';

@ApiTags('Monetization & Subscriptions')
@Controller('monetization')
export class MonetizationController {
  constructor(
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
    private usageService: UsageService
  ) {}

  // Subscription Plan Endpoints
  @Get('subscription-plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ type: [SubscriptionPlanResponseDto] })
  async getAvailablePlans(): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionService.getAvailablePlans();
  }

  @Get('subscription-plans/:planId')
  @ApiOperation({ summary: 'Get subscription plan details by ID' })
  @ApiResponse({ type: SubscriptionPlanResponseDto })
  async getPlanById(@Param('planId') planId: string): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionService.getPlanById(planId);
  }

  // User Subscription Management
  @Get('user/subscription')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get current user subscription and usage' })
  @ApiResponse({ type: UserSubscriptionResponseDto })
  async getUserSubscription(@Request() req): Promise<UserSubscriptionResponseDto | null> {
    return this.subscriptionService.getUserSubscription(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Create or upgrade subscription' })
  @ApiResponse({ type: UserSubscriptionResponseDto, status: 201 })
  async createSubscription(
    @Request() req,
    @Body() createDto: CreateSubscriptionDto
  ): Promise<UserSubscriptionResponseDto> {
    return this.subscriptionService.createSubscription(req.user.id, createDto);
  }

  @Put('user/subscription')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Update user subscription' })
  @ApiResponse({ type: UserSubscriptionResponseDto })
  async updateSubscription(
    @Request() req,
    @Body() updateDto: UpdateSubscriptionDto
  ): Promise<UserSubscriptionResponseDto> {
    return this.subscriptionService.updateSubscription(req.user.id, updateDto);
  }

  @Delete('user/subscription')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Cancel user subscription' })
  @ApiResponse({ type: UserSubscriptionResponseDto })
  async cancelSubscription(@Request() req): Promise<UserSubscriptionResponseDto> {
    return this.subscriptionService.cancelSubscription(req.user.id);
  }

  // Usage Management Endpoints
  @Get('usage/check/:featureType')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Check if user can use a specific feature' })
  @ApiResponse({ type: UsageCheckResponseDto })
  async checkUsage(
    @Request() req,
    @Param('featureType') featureType: FeatureType
  ): Promise<UsageCheckResponseDto> {
    return this.usageService.checkUsage(req.user.id, featureType);
  }

  @Post('usage/update')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Update usage quota (decrement)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateUsage(
    @Request() req,
    @Body() updateDto: UsageUpdateDto
  ): Promise<void> {
    return this.usageService.updateUsage(req.user.id, updateDto);
  }

  @Get('usage/summary')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get user usage summary' })
  async getUserUsageSummary(@Request() req) {
    return this.usageService.getUserUsageSummary(req.user.id);
  }

  // Payment Endpoints
  @Post('payments')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Create payment transaction' })
  @ApiResponse({ type: PaymentResponseDto, status: 201 })
  async createPayment(
    @Request() req,
    @Body() createDto: CreatePaymentDto
  ): Promise<PaymentResponseDto> {
    return this.paymentService.createPayment(req.user.id, createDto);
  }

  @Get('payments/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get payment status by ID' })
  @ApiResponse({ type: PaymentResponseDto })
  async getPaymentById(
    @Request() req,
    @Param('paymentId') paymentId: string
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.getPaymentById(paymentId);
    
    // Ensure user can only access their own payments
    if (payment.userId !== req.user.id) {
      throw new ForbiddenException('Access denied to this payment');
    }
    
    return payment;
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get user payment history' })
  async getUserPayments(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.paymentService.getUserPayments(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Webhook endpoint (no auth required)
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle payment provider webhooks' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() webhookData: any
  ): Promise<void> {
    const webhookDto: PaymentWebhookDto = {
      provider,
      eventType: webhookData.type || webhookData.event_type,
      externalId: webhookData.id || webhookData.data?.object?.id,
      payload: webhookData,
      signature: undefined // Would be extracted from headers in real implementation
    };
    
    return this.paymentService.handleWebhook(webhookDto);
  }

  // Admin Endpoints (would require admin guard in real implementation)
  @Get('admin/stats/subscriptions')
  @UseGuards(JwtAuthGuard) // In real app, also add AdminGuard
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get subscription statistics (Admin)' })
  @ApiResponse({ type: SubscriptionStatsResponseDto })
  async getSubscriptionStats(@Request() req): Promise<SubscriptionStatsResponseDto> {
    // Basic admin check (in real app, use proper role-based auth)
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    
    return this.subscriptionService.getSubscriptionStats();
  }

  @Get('admin/stats/payments')
  @UseGuards(JwtAuthGuard) // In real app, also add AdminGuard
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get payment statistics (Admin)' })
  @ApiResponse({ type: PaymentStatsResponseDto })
  async getPaymentStats(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<PaymentStatsResponseDto> {
    // Basic admin check (in real app, use proper role-based auth)
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.paymentService.getPaymentStats(start, end);
  }

  @Post('admin/payments/refund')
  @UseGuards(JwtAuthGuard) // In real app, also add AdminGuard
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Process payment refund (Admin)' })
  @ApiResponse({ type: PaymentResponseDto })
  async refundPayment(
    @Request() req,
    @Body() refundDto: RefundPaymentDto
  ): Promise<PaymentResponseDto> {
    // Basic admin check (in real app, use proper role-based auth)
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    
    return this.paymentService.refundPayment(refundDto);
  }

  @Post('admin/usage/reset-quotas')
  @UseGuards(JwtAuthGuard) // In real app, also add AdminGuard
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Reset all user quotas (Admin)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetAllUserQuotas(@Request() req): Promise<void> {
    // Basic admin check (in real app, use proper role-based auth)
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    
    return this.usageService.resetAllUserQuotas();
  }

  // Feature Access Check Endpoints
  @Get('features/:feature/access')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Check if user has access to premium feature' })
  async checkFeatureAccess(
    @Request() req,
    @Param('feature') feature: string
  ): Promise<{ hasAccess: boolean; feature: string }> {
    const hasAccess = await this.usageService.hasFeatureAccess(req.user.id, feature as keyof PlanFeatures);
    return { hasAccess, feature };
  }

  // Quick subscription status for middleware/guards
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get quick subscription status' })
  async getQuickStatus(@Request() req): Promise<{
    isActive: boolean;
    planName: string;
    canUseRecipeGeneration: boolean;
    canUseVideoGeneration: boolean;
    canUseCommunityFeatures: boolean;
  }> {
    const [
      isActive,
      planName,
      recipeCheck,
      videoCheck,
      postCheck
    ] = await Promise.all([
      this.subscriptionService.isUserSubscriptionActive(req.user.id),
      this.subscriptionService.getUserPlanName(req.user.id),
      this.usageService.checkUsage(req.user.id, FeatureType.RECIPE_GENERATION),
      this.usageService.checkUsage(req.user.id, FeatureType.VIDEO_GENERATION),
      this.usageService.checkUsage(req.user.id, FeatureType.COMMUNITY_POST)
    ]);

    return {
      isActive,
      planName,
      canUseRecipeGeneration: recipeCheck.canUse,
      canUseVideoGeneration: videoCheck.canUse,
      canUseCommunityFeatures: postCheck.canUse
    };
  }
}
