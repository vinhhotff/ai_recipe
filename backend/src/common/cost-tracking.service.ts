import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from './logger.service';
import { MetricsService } from './metrics.service';

export interface CostUsage {
  userId: string;
  feature: 'ai_generation' | 'video_generation' | 'storage' | 'bandwidth';
  model?: string;
  tokensUsed?: number;
  videoSeconds?: number;
  storageBytes?: number;
  bandwidthBytes?: number;
  cost: number;
  currency: string;
  metadata?: any;
}

export interface CostSummary {
  userId?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  totalCost: number;
  breakdown: {
    aiGeneration: number;
    videoGeneration: number;
    storage: number;
    bandwidth: number;
  };
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    exceeded: boolean;
  };
}

@Injectable()
export class CostTrackingService {
  private costLimits = {
    free: { daily: 1.00, monthly: 10.00 },
    basic: { daily: 10.00, monthly: 50.00 },
    pro: { daily: 50.00, monthly: 200.00 },
    enterprise: { daily: 200.00, monthly: 1000.00 },
  };

  private modelCosts = {
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }, // per 1K tokens
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'video-generation': { perSecond: 0.12 },
    'image-generation': { perImage: 0.04 },
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private logger: AppLoggerService,
    private metrics: MetricsService,
  ) {}

  async trackUsage(usage: CostUsage): Promise<void> {
    try {
      // Store usage in database
      await this.storeUsageRecord(usage);
      
      // Update metrics
      this.metrics.recordAIRequest(
        usage.model || usage.feature,
        await this.getUserTier(usage.userId),
        'success'
      );
      
      // Log usage
      this.logger.logAIUsage(usage.userId, usage.model || usage.feature, usage.tokensUsed || 0, usage.cost);
      
      // Check limits and send alerts if needed
      await this.checkUsageLimits(usage.userId);
      
    } catch (error) {
      this.logger.error(`Failed to track usage for user ${usage.userId}`, error.stack, 'CostTracking');
    }
  }

  private async storeUsageRecord(usage: CostUsage): Promise<void> {
    // This would store in your database - placeholder for now
    console.log('Storing usage record:', usage);
  }

  async calculateAICost(model: string, inputTokens: number, outputTokens: number): Promise<number> {
    const modelCost = this.modelCosts[model];
    if (!modelCost) {
      this.logger.warn(`Unknown model cost for: ${model}`, 'CostTracking');
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelCost.input;
    const outputCost = (outputTokens / 1000) * modelCost.output;
    
    return Number((inputCost + outputCost).toFixed(4));
  }

  async calculateVideoCost(durationSeconds: number): Promise<number> {
    const videoCost = this.modelCosts['video-generation'];
    return Number((durationSeconds * videoCost.perSecond).toFixed(4));
  }

  async calculateImageCost(imageCount: number): Promise<number> {
    const imageCost = this.modelCosts['image-generation'];
    return Number((imageCount * imageCost.perImage).toFixed(4));
  }

  async getUserCostSummary(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<CostSummary> {
    const startDate = this.getPeriodStartDate(period);
    const userTier = await this.getUserTier(userId);
    
    try {
      // This would query your database for usage records
      const usageRecords = await this.getUsageRecords(userId, startDate);
      
      const breakdown = {
        aiGeneration: 0,
        videoGeneration: 0,
        storage: 0,
        bandwidth: 0,
      };

      let totalCost = 0;
      
      for (const record of usageRecords) {
        totalCost += record.cost;
        
        switch (record.feature) {
          case 'ai_generation':
            breakdown.aiGeneration += record.cost;
            break;
          case 'video_generation':
            breakdown.videoGeneration += record.cost;
            break;
          case 'storage':
            breakdown.storage += record.cost;
            break;
          case 'bandwidth':
            breakdown.bandwidth += record.cost;
            break;
        }
      }

      const limits = this.costLimits[userTier] || this.costLimits.free;
      const currentLimit = period === 'daily' ? limits.daily : limits.monthly;
      
      return {
        userId,
        period,
        totalCost: Number(totalCost.toFixed(4)),
        breakdown,
        limits: {
          dailyLimit: limits.daily,
          monthlyLimit: limits.monthly,
          exceeded: totalCost > currentLimit,
        },
      };
      
    } catch (error) {
      this.logger.error(`Failed to get cost summary for user ${userId}`, error.stack, 'CostTracking');
      throw error;
    }
  }

  async getSystemCostSummary(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    totalCost: number;
    userCount: number;
    avgCostPerUser: number;
    breakdown: any;
    topUsers: Array<{ userId: string; cost: number; tier: string }>;
  }> {
    const startDate = this.getPeriodStartDate(period);
    
    try {
      // This would aggregate all usage records
      const allUsage = await this.getAllUsageRecords(startDate);
      
      const breakdown = {
        aiGeneration: 0,
        videoGeneration: 0,
        storage: 0,
        bandwidth: 0,
      };

      let totalCost = 0;
      const userCosts = new Map<string, number>();
      
      for (const record of allUsage) {
        totalCost += record.cost;
        userCosts.set(record.userId, (userCosts.get(record.userId) || 0) + record.cost);
        
        switch (record.feature) {
          case 'ai_generation':
            breakdown.aiGeneration += record.cost;
            break;
          case 'video_generation':
            breakdown.videoGeneration += record.cost;
            break;
          case 'storage':
            breakdown.storage += record.cost;
            break;
          case 'bandwidth':
            breakdown.bandwidth += record.cost;
            break;
        }
      }

      const userCount = userCosts.size;
      const avgCostPerUser = userCount > 0 ? totalCost / userCount : 0;
      
      // Get top 10 users by cost
      const topUsers = Array.from(userCosts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, cost]) => ({
          userId,
          cost: Number(cost.toFixed(4)),
          tier: 'unknown', // Would need to query user tier
        }));

      return {
        totalCost: Number(totalCost.toFixed(4)),
        userCount,
        avgCostPerUser: Number(avgCostPerUser.toFixed(4)),
        breakdown,
        topUsers,
      };
      
    } catch (error) {
      this.logger.error('Failed to get system cost summary', error.stack, 'CostTracking');
      throw error;
    }
  }

  async checkUsageLimits(userId: string): Promise<void> {
    const dailySummary = await this.getUserCostSummary(userId, 'daily');
    const monthlySummary = await this.getUserCostSummary(userId, 'monthly');
    
    // Check daily limits
    if (dailySummary.totalCost >= dailySummary.limits.dailyLimit * 0.9) {
      await this.sendUsageAlert(userId, 'daily', dailySummary.totalCost, dailySummary.limits.dailyLimit);
    }
    
    // Check monthly limits
    if (monthlySummary.totalCost >= monthlySummary.limits.monthlyLimit * 0.9) {
      await this.sendUsageAlert(userId, 'monthly', monthlySummary.totalCost, monthlySummary.limits.monthlyLimit);
    }
  }

  private async sendUsageAlert(userId: string, period: string, currentUsage: number, limit: number): Promise<void> {
    const percentage = (currentUsage / limit) * 100;
    
    this.logger.warn(
      `User ${userId} has used ${percentage.toFixed(1)}% of their ${period} limit (${currentUsage}/${limit})`,
      'CostTracking'
    );
    
    // Here you would integrate with your notification system
    // For now, just logging the alert
  }

  async optimizeCosts(): Promise<{
    recommendations: string[];
    potentialSavings: number;
  }> {
    const recommendations: string[] = [];
    let potentialSavings = 0;

    try {
      // Analyze usage patterns and provide recommendations
      const systemSummary = await this.getSystemCostSummary('monthly');
      
      // Check for inefficient model usage
      if (systemSummary.breakdown.aiGeneration > systemSummary.breakdown.videoGeneration * 2) {
        recommendations.push('Consider using more efficient AI models for simple text generation tasks');
        potentialSavings += systemSummary.breakdown.aiGeneration * 0.2; // Estimated 20% savings
      }
      
      // Check for storage optimization opportunities
      if (systemSummary.breakdown.storage > 100) {
        recommendations.push('Implement data lifecycle policies to reduce storage costs');
        potentialSavings += systemSummary.breakdown.storage * 0.3; // Estimated 30% savings
      }
      
      // Check for caching opportunities
      recommendations.push('Implement Redis caching for frequently requested AI responses');
      potentialSavings += systemSummary.breakdown.aiGeneration * 0.15; // Estimated 15% savings
      
      return {
        recommendations,
        potentialSavings: Number(potentialSavings.toFixed(2)),
      };
      
    } catch (error) {
      this.logger.error('Failed to generate cost optimization recommendations', error.stack, 'CostTracking');
      return { recommendations: [], potentialSavings: 0 };
    }
  }

  private getPeriodStartDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
        return new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  private async getUserTier(userId: string): Promise<string> {
    // This would query your database for the user's subscription tier
    // For now, returning a default
    return 'free';
  }

  private async getUsageRecords(userId: string, startDate: Date): Promise<CostUsage[]> {
    // This would query your database for usage records
    // For now, returning empty array
    return [];
  }

  private async getAllUsageRecords(startDate: Date): Promise<CostUsage[]> {
    // This would query your database for all usage records
    // For now, returning empty array
    return [];
  }
}
