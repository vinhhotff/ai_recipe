import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDecimal,
  Min,
  Max,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED'
}

export enum PaymentMethod {
  STRIPE = 'STRIPE',
  MOMO = 'MOMO',
  ZALOPAY = 'ZALOPAY'
}

export interface PlanFeatures {
  maxRecipeGenerations: number;
  maxVideoGenerations: number;
  maxCommunityPosts: number;
  maxCommunityComments: number;
  aiSuggestions: boolean;
  premiumTemplates: boolean;
  exportToPdf: boolean;
  prioritySupport: boolean;
}

export interface UsageQuota {
  recipeGenerationsLeft: number;
  videoGenerationsLeft: number;
  communityPostsLeft: number;
  communityCommentsLeft: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ 
    example: 'uuid-plan-pro',
    description: 'Subscription plan ID' 
  })
  @IsUUID()
  planId: string;

  @ApiProperty({ 
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method for subscription' 
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ 
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle preference' 
  })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Enable auto-renewal' 
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = true;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ 
    example: 'uuid-plan-premium',
    description: 'New subscription plan ID' 
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ 
    enum: SubscriptionStatus,
    example: SubscriptionStatus.CANCELED,
    description: 'Subscription status' 
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ 
    enum: BillingCycle,
    description: 'Change billing cycle' 
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({ 
    example: false,
    description: 'Auto-renewal setting' 
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 'uuid-plan-123', description: 'Plan ID' })
  id: string;

  @ApiProperty({ example: 'Pro', description: 'Plan name' })
  name: string;

  @ApiProperty({ example: '99000', description: 'Monthly price in VND' })
  price: string;

  @ApiPropertyOptional({ example: '990000', description: 'Yearly price in VND' })
  yearlyPrice?: string;

  @ApiProperty({ 
    example: {
      maxRecipeGenerations: 50,
      maxVideoGenerations: 10,
      maxCommunityPosts: 100,
      maxCommunityComments: 500,
      aiSuggestions: true,
      premiumTemplates: true,
      exportToPdf: true,
      prioritySupport: false
    },
    description: 'Plan features and limits' 
  })
  features: PlanFeatures;

  @ApiProperty({ example: true, description: 'Whether plan is active' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Display sort order' })
  sortOrder: number;
}

export class UserSubscriptionResponseDto {
  @ApiProperty({ example: 'uuid-sub-123', description: 'Subscription ID' })
  id: string;

  @ApiProperty({ example: 'uuid-user-456', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'uuid-plan-pro', description: 'Plan ID' })
  planId: string;

  @ApiProperty({ 
    example: 'Pro',
    description: 'Current plan name' 
  })
  planName: string;

  @ApiProperty({ 
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
    description: 'Subscription status' 
  })
  status: SubscriptionStatus;

  @ApiProperty({ 
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Current billing cycle' 
  })
  billingCycle: BillingCycle;

  @ApiProperty({ 
    example: {
      recipeGenerationsLeft: 35,
      videoGenerationsLeft: 8,
      communityPostsLeft: 85,
      communityCommentsLeft: 450
    },
    description: 'Remaining usage quotas' 
  })
  usageQuota: UsageQuota;

  @ApiProperty({ 
    example: {
      maxRecipeGenerations: 50,
      maxVideoGenerations: 10,
      maxCommunityPosts: 100,
      maxCommunityComments: 500,
      aiSuggestions: true,
      premiumTemplates: true,
      exportToPdf: true,
      prioritySupport: false
    },
    description: 'Plan features and limits' 
  })
  planFeatures: PlanFeatures;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Subscription start date' })
  startDate: string;

  @ApiPropertyOptional({ example: '2024-02-20T10:30:00Z', description: 'Next billing date' })
  nextBillingDate?: string;

  @ApiPropertyOptional({ example: '2025-01-20T10:30:00Z', description: 'Subscription end date' })
  endDate?: string;

  @ApiProperty({ example: true, description: 'Auto-renewal enabled' })
  autoRenew: boolean;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Created timestamp' })
  createdAt: string;
}

export class SubscriptionStatsResponseDto {
  @ApiProperty({ example: 1250, description: 'Total subscribers' })
  totalSubscribers: number;

  @ApiProperty({ example: 450, description: 'Active subscribers' })
  activeSubscribers: number;

  @ApiProperty({ example: 125000000, description: 'Monthly recurring revenue' })
  monthlyRevenue: number;

  @ApiProperty({ 
    example: {
      Free: 800,
      Pro: 350,
      Premium: 100
    },
    description: 'Subscribers by plan' 
  })
  subscribersByPlan: Record<string, number>;

  @ApiProperty({ example: 85.5, description: 'Retention rate percentage' })
  retentionRate: number;
}

export enum FeatureType {
  RECIPE_GENERATION = 'recipe_generation',
  VIDEO_GENERATION = 'video_generation',
  COMMUNITY_POST = 'community_post',
  COMMUNITY_COMMENT = 'community_comment'
}

export class UsageUpdateDto {
  @ApiProperty({ 
    enum: FeatureType,
    example: FeatureType.RECIPE_GENERATION,
    description: 'Type of feature being used' 
  })
  @IsEnum(FeatureType)
  featureType: FeatureType;

  @ApiProperty({ 
    example: 1,
    description: 'Amount to decrement (default: 1)',
    minimum: 1,
    maximum: 10
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  amount: number = 1;
}

export class UsageCheckResponseDto {
  @ApiProperty({ example: true, description: 'Whether user can use this feature' })
  canUse: boolean;

  @ApiProperty({ example: 5, description: 'Remaining quota for this feature' })
  remainingQuota: number;

  @ApiProperty({ example: 50, description: 'Total quota limit for this feature' })
  totalQuota: number;

  @ApiPropertyOptional({ 
    example: 'You have reached your monthly limit for recipe generation. Upgrade to Pro for more.',
    description: 'Message if usage is blocked' 
  })
  message?: string;

  @ApiPropertyOptional({ 
    example: 'Pro',
    description: 'Suggested plan to upgrade to' 
  })
  suggestedPlan?: string;
}
