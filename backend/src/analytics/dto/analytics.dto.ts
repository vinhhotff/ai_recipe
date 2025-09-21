import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsEventType {
  RECIPE_GENERATION = 'RECIPE_GENERATION',
  VIDEO_GENERATION = 'VIDEO_GENERATION',
  COMMUNITY_POST = 'COMMUNITY_POST',
  COMMUNITY_COMMENT = 'COMMUNITY_COMMENT',
  COMMUNITY_LIKE = 'COMMUNITY_LIKE',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  USER_REGISTRATION = 'USER_REGISTRATION',
  USER_LOGIN = 'USER_LOGIN',
  INGREDIENT_SCAN = 'INGREDIENT_SCAN',
  RECIPE_VIEW = 'RECIPE_VIEW',
  VIDEO_VIEW = 'VIDEO_VIEW'
}

export enum AdminReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export enum MetricType {
  USAGE = 'usage',
  REVENUE = 'revenue',
  SUBSCRIPTIONS = 'subscriptions',
  MODEL_COST = 'model_cost',
  USER_ENGAGEMENT = 'user_engagement'
}

export class RecordEventDto {
  @ApiProperty({
    enum: AnalyticsEventType,
    example: AnalyticsEventType.RECIPE_GENERATION,
    description: 'Type of analytics event'
  })
  @IsEnum(AnalyticsEventType)
  eventType: AnalyticsEventType;

  @ApiPropertyOptional({
    example: { recipeId: 'uuid-123', ingredients: ['tomato', 'cheese'], cost: 0.05 },
    description: 'Event metadata and details'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'session-123',
    description: 'User session ID'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    description: 'User agent string'
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description: 'User IP address (anonymized)'
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'End date (YYYY-MM-DD)'
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: AnalyticsEventType,
    example: AnalyticsEventType.RECIPE_GENERATION,
    description: 'Filter by event type'
  })
  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;

  @ApiPropertyOptional({
    example: 'uuid-user-123',
    description: 'Filter by user ID'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 'Pro',
    description: 'Filter by subscription plan'
  })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({
    example: 'daily',
    description: 'Aggregation interval',
    enum: ['hourly', 'daily', 'weekly', 'monthly']
  })
  @IsOptional()
  @IsString()
  interval?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Page number for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 100,
    minimum: 1,
    maximum: 1000,
    description: 'Items per page'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class UsageAnalyticsResponseDto {
  @ApiProperty({
    example: [
      { date: '2024-01-01', count: 150, uniqueUsers: 45 },
      { date: '2024-01-02', count: 200, uniqueUsers: 60 }
    ],
    description: 'Usage data points over time'
  })
  data: Array<{
    date: string;
    count: number;
    uniqueUsers: number;
  }>;

  @ApiProperty({
    example: {
      totalEvents: 5000,
      uniqueUsers: 250,
      averagePerUser: 20,
      growthRate: 15.5
    },
    description: 'Summary statistics'
  })
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    averagePerUser: number;
    growthRate: number;
  };

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  totalPages: number;
}

export class RevenueAnalyticsResponseDto {
  @ApiProperty({
    example: [
      { date: '2024-01-01', revenue: 1500000, transactions: 15, newSubscriptions: 5 },
      { date: '2024-01-02', revenue: 2000000, transactions: 20, newSubscriptions: 8 }
    ],
    description: 'Revenue data points over time'
  })
  data: Array<{
    date: string;
    revenue: number;
    transactions: number;
    newSubscriptions: number;
  }>;

  @ApiProperty({
    example: {
      totalRevenue: 50000000,
      totalTransactions: 500,
      averageOrderValue: 100000,
      monthlyRecurringRevenue: 15000000
    },
    description: 'Revenue summary'
  })
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    monthlyRecurringRevenue: number;
  };

  @ApiProperty({
    example: {
      'Pro': 30000000,
      'Premium': 20000000
    },
    description: 'Revenue by subscription plan'
  })
  byPlan: Record<string, number>;

  @ApiProperty({
    example: {
      'STRIPE': 35000000,
      'MOMO': 10000000,
      'ZALOPAY': 5000000
    },
    description: 'Revenue by payment method'
  })
  byPaymentMethod: Record<string, number>;
}

export class SubscriptionAnalyticsResponseDto {
  @ApiProperty({
    example: [
      { date: '2024-01-01', active: 100, new: 5, canceled: 2, upgraded: 3 },
      { date: '2024-01-02', active: 103, new: 8, canceled: 1, upgraded: 2 }
    ],
    description: 'Subscription metrics over time'
  })
  data: Array<{
    date: string;
    active: number;
    new: number;
    canceled: number;
    upgraded: number;
  }>;

  @ApiProperty({
    example: {
      totalActive: 500,
      totalCanceled: 50,
      churnRate: 5.5,
      retentionRate: 85.0
    },
    description: 'Subscription summary'
  })
  summary: {
    totalActive: number;
    totalCanceled: number;
    churnRate: number;
    retentionRate: number;
  };

  @ApiProperty({
    example: {
      'Free': 200,
      'Pro': 250,
      'Premium': 50
    },
    description: 'Active subscriptions by plan'
  })
  byPlan: Record<string, number>;

  @ApiProperty({
    example: {
      'ACTIVE': 450,
      'PAST_DUE': 30,
      'CANCELED': 20
    },
    description: 'Subscriptions by status'
  })
  byStatus: Record<string, number>;
}

export class ModelCostAnalyticsResponseDto {
  @ApiProperty({
    example: [
      { date: '2024-01-01', cost: 25.50, tokens: 50000, requests: 100 },
      { date: '2024-01-02', cost: 30.25, tokens: 60000, requests: 120 }
    ],
    description: 'AI model cost data over time'
  })
  data: Array<{
    date: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;

  @ApiProperty({
    example: {
      totalCost: 1500.75,
      totalTokens: 3000000,
      totalRequests: 6000,
      averageCostPerRequest: 0.25
    },
    description: 'Cost summary'
  })
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    averageCostPerRequest: number;
  };

  @ApiProperty({
    example: {
      'gpt-4': 800.50,
      'claude-3': 450.25,
      'dall-e': 250.00
    },
    description: 'Cost breakdown by model'
  })
  byModel: Record<string, number>;

  @ApiProperty({
    example: {
      'recipe-generation': 900.00,
      'video-generation': 400.00,
      'image-generation': 200.75
    },
    description: 'Cost breakdown by operation'
  })
  byOperation: Record<string, number>;
}

export class DashboardOverviewResponseDto {
  @ApiProperty({
    example: {
      totalUsers: 1000,
      activeUsers: 750,
      newUsersToday: 25,
      userGrowthRate: 12.5
    },
    description: 'User metrics'
  })
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    userGrowthRate: number;
  };

  @ApiProperty({
    example: {
      totalRevenue: 50000000,
      monthlyRevenue: 15000000,
      dailyRevenue: 500000,
      revenueGrowthRate: 18.5
    },
    description: 'Revenue metrics'
  })
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    dailyRevenue: number;
    revenueGrowthRate: number;
  };

  @ApiProperty({
    example: {
      recipeGenerations: 1500,
      videoGenerations: 200,
      communityPosts: 800,
      totalEvents: 10000
    },
    description: 'Feature usage metrics'
  })
  usage: {
    recipeGenerations: number;
    videoGenerations: number;
    communityPosts: number;
    totalEvents: number;
  };

  @ApiProperty({
    example: {
      totalCost: 500.75,
      todayCost: 25.50,
      averageCostPerUser: 0.50
    },
    description: 'AI model cost metrics'
  })
  costs: {
    totalCost: number;
    todayCost: number;
    averageCostPerUser: number;
  };
}

export class TopUsersResponseDto {
  @ApiProperty({
    example: [
      {
        userId: 'uuid-123',
        userName: 'john@example.com',
        planName: 'Pro',
        totalEvents: 150,
        recipeGenerations: 80,
        videoGenerations: 20,
        communityPosts: 50,
        totalRevenue: 500000
      }
    ],
    description: 'Top users by activity'
  })
  users: Array<{
    userId: string;
    userName: string;
    planName: string;
    totalEvents: number;
    recipeGenerations: number;
    videoGenerations: number;
    communityPosts: number;
    totalRevenue: number;
  }>;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 5, description: 'Total pages' })
  totalPages: number;
}

export class ExportRequestDto {
  @ApiProperty({
    enum: MetricType,
    example: MetricType.USAGE,
    description: 'Type of metrics to export'
  })
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiProperty({
    example: 'csv',
    description: 'Export format',
    enum: ['csv', 'json']
  })
  @IsString()
  format: 'csv' | 'json';

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date for export'
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'End date for export'
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Additional filters for export'
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
