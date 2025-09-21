import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  AnalyticsEventType, 
  RecordEventDto, 
  AnalyticsQueryDto,
  UsageAnalyticsResponseDto,
  RevenueAnalyticsResponseDto,
  SubscriptionAnalyticsResponseDto,
  ModelCostAnalyticsResponseDto
} from '../dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // Event Recording
  async recordEvent(
    userId: string | null, 
    eventData: RecordEventDto
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId,
          eventType: eventData.eventType,
          metadata: eventData.metadata || {},
          sessionId: eventData.sessionId,
          userAgent: eventData.userAgent,
          ipAddress: eventData.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record analytics event: ${error.message}`, error.stack);
      // Don't throw - analytics shouldn't break core functionality
    }
  }

  // Convenience methods for common events
  async recordRecipeGeneration(
    userId: string, 
    metadata: { recipeId?: string; ingredients?: string[]; cost?: number } = {}
  ): Promise<void> {
    await this.recordEvent(userId, {
      eventType: AnalyticsEventType.RECIPE_GENERATION,
      metadata,
    });
  }

  async recordVideoGeneration(
    userId: string, 
    metadata: { videoId?: string; recipeId?: string; duration?: number; cost?: number } = {}
  ): Promise<void> {
    await this.recordEvent(userId, {
      eventType: AnalyticsEventType.VIDEO_GENERATION,
      metadata,
    });
  }

  async recordCommunityPost(
    userId: string, 
    metadata: { postId?: string; recipeId?: string } = {}
  ): Promise<void> {
    await this.recordEvent(userId, {
      eventType: AnalyticsEventType.COMMUNITY_POST,
      metadata,
    });
  }

  async recordPaymentSuccess(
    userId: string, 
    metadata: { paymentId?: string; amount?: number; planId?: string } = {}
  ): Promise<void> {
    await this.recordEvent(userId, {
      eventType: AnalyticsEventType.PAYMENT_SUCCESS,
      metadata,
    });
  }

  // Usage Analytics
  async getUsageAnalytics(query: AnalyticsQueryDto): Promise<UsageAnalyticsResponseDto> {
    const { from, to, eventType, userId, interval = 'daily', page = 1, limit = 100 } = query;
    
    // Build base where clause
    const where: any = {};
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;

    // Get aggregated data based on interval
    const data = await this.getUsageDataByInterval(where, interval);
    
    // Get summary statistics
    const summary = await this.getUsageSummary(where, from, to);
    
    // Calculate pagination
    const totalPages = Math.ceil(data.length / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      summary,
      page,
      totalPages,
    };
  }

  // Revenue Analytics
  async getRevenueAnalytics(query: AnalyticsQueryDto): Promise<RevenueAnalyticsResponseDto> {
    const { from, to, interval = 'daily' } = query;
    
    const dateFilter: any = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    }

    // Get revenue data by day
    const revenueData = await this.getRevenueDataByInterval(dateFilter, interval);
    
    // Get revenue summary
    const summary = await this.getRevenueSummary(dateFilter);
    
    // Get revenue by plan
    const byPlan = await this.getRevenueByPlan(dateFilter);
    
    // Get revenue by payment method
    const byPaymentMethod = await this.getRevenueByPaymentMethod(dateFilter);

    return {
      data: revenueData,
      summary,
      byPlan,
      byPaymentMethod,
    };
  }

  // Subscription Analytics
  async getSubscriptionAnalytics(query: AnalyticsQueryDto): Promise<SubscriptionAnalyticsResponseDto> {
    const { from, to, interval = 'daily' } = query;
    
    // Get subscription data by interval
    const data = await this.getSubscriptionDataByInterval(from, to, interval);
    
    // Get subscription summary
    const summary = await this.getSubscriptionSummary();
    
    // Get subscriptions by plan
    const byPlan = await this.getSubscriptionsByPlan();
    
    // Get subscriptions by status
    const byStatus = await this.getSubscriptionsByStatus();

    return {
      data,
      summary,
      byPlan,
      byStatus,
    };
  }

  // Model Cost Analytics
  async getModelCostAnalytics(query: AnalyticsQueryDto): Promise<ModelCostAnalyticsResponseDto> {
    const { from, to, interval = 'daily' } = query;
    
    const dateFilter: any = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
    }

    // Get cost data by interval
    const data = await this.getModelCostDataByInterval(dateFilter, interval);
    
    // Get cost summary
    const summary = await this.getModelCostSummary(dateFilter);
    
    // Get cost by model
    const byModel = await this.getCostByModel(dateFilter);
    
    // Get cost by operation
    const byOperation = await this.getCostByOperation(dateFilter);

    return {
      data,
      summary,
      byModel,
      byOperation,
    };
  }

  // Record Model Usage
  async recordModelUsage(
    userId: string | null,
    model: string,
    operation: string,
    tokensUsed?: number,
    processingTime?: number,
    estimatedCost?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.prisma.modelUsageLog.create({
        data: {
          userId,
          model,
          operation,
          tokensUsed,
          processingTime,
          estimatedCost: estimatedCost ? estimatedCost : null,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record model usage: ${error.message}`, error.stack);
    }
  }

  // Private helper methods
  private async getUsageDataByInterval(where: any, interval: string) {
    const dateFormat = this.getDateFormat(interval);
    
    const rawData = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${interval}, created_at) as date,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics_events 
      WHERE ${this.buildWhereClause(where)}
      GROUP BY DATE_TRUNC(${interval}, created_at)
      ORDER BY date ASC
    `;

    return (rawData as any[]).map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
      uniqueUsers: parseInt(row.unique_users),
    }));
  }

  private async getUsageSummary(where: any, from?: string, to?: string) {
    const [totalEvents, uniqueUsers] = await Promise.all([
      this.prisma.analyticsEvent.count({ where }),
      this.prisma.analyticsEvent.aggregate({
        where,
        _count: { userId: true }
      }),
    ]);

    // Calculate growth rate (simplified - compare to previous period)
    let growthRate = 0;
    if (from && to) {
      const prevPeriodStart = new Date(from);
      const prevPeriodEnd = new Date(to);
      const periodDuration = prevPeriodEnd.getTime() - prevPeriodStart.getTime();
      
      const prevStart = new Date(prevPeriodStart.getTime() - periodDuration);
      const prevEnd = new Date(prevPeriodEnd.getTime() - periodDuration);
      
      const prevPeriodEvents = await this.prisma.analyticsEvent.count({
        where: {
          ...where,
          createdAt: {
            gte: prevStart,
            lte: prevEnd,
          },
        },
      });
      
      if (prevPeriodEvents > 0) {
        growthRate = ((totalEvents - prevPeriodEvents) / prevPeriodEvents) * 100;
      }
    }

    return {
      totalEvents,
      uniqueUsers: uniqueUsers._count.userId || 0,
      averagePerUser: uniqueUsers._count.userId ? totalEvents / uniqueUsers._count.userId : 0,
      growthRate,
    };
  }

  private async getRevenueDataByInterval(dateFilter: any, interval: string) {
    const whereClause = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const rawData = await this.prisma.paymentTransaction.groupBy({
      by: ['createdAt'],
      where: { ...whereClause, status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    });

    // Group by interval and aggregate
    const groupedData: Record<string, { revenue: number; transactions: number }> = {};
    
    rawData.forEach(row => {
      const date = this.truncateDate(row.createdAt, interval);
      if (!groupedData[date]) {
        groupedData[date] = { revenue: 0, transactions: 0 };
      }
      groupedData[date].revenue += Number(row._sum.amount || 0);
      groupedData[date].transactions += row._count;
    });

    return Object.entries(groupedData)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        transactions: data.transactions,
        newSubscriptions: 0, // Would need to join with subscription data
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getRevenueSummary(dateFilter: any) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const [totalStats, monthlyStats] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { ...where, status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(totalStats._sum.amount || 0);
    const totalTransactions = totalStats._count;
    const monthlyRecurringRevenue = Number(monthlyStats._sum.amount || 0);

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      monthlyRecurringRevenue,
    };
  }

  private async getRevenueByPlan(dateFilter: any) {
    // This would require joining with subscription data
    // For now, return empty object
    return {};
  }

  private async getRevenueByPaymentMethod(dateFilter: any) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const data = await this.prisma.paymentTransaction.groupBy({
      by: ['paymentMethod'],
      where: { ...where, status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const result: Record<string, number> = {};
    data.forEach(row => {
      result[row.paymentMethod] = Number(row._sum.amount || 0);
    });

    return result;
  }

  private async getSubscriptionDataByInterval(from?: string, to?: string, interval: string = 'daily') {
    // This would require complex subscription state tracking
    // For now, return mock data
    return [
      { date: '2024-01-01', active: 100, new: 5, canceled: 2, upgraded: 3 },
    ];
  }

  private async getSubscriptionSummary() {
    const [totalActive, totalCanceled] = await Promise.all([
      this.prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userSubscription.count({ where: { status: 'CANCELED' } }),
    ]);

    const total = totalActive + totalCanceled;
    const churnRate = total > 0 ? (totalCanceled / total) * 100 : 0;
    const retentionRate = 100 - churnRate;

    return {
      totalActive,
      totalCanceled,
      churnRate,
      retentionRate,
    };
  }

  private async getSubscriptionsByPlan() {
    const data = await this.prisma.userSubscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const row of data) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: row.planId },
        select: { name: true },
      });
      if (plan) {
        result[plan.name] = row._count;
      }
    }

    return result;
  }

  private async getSubscriptionsByStatus() {
    const data = await this.prisma.userSubscription.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: Record<string, number> = {};
    data.forEach(row => {
      result[row.status] = row._count;
    });

    return result;
  }

  private async getModelCostDataByInterval(dateFilter: any, interval: string) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const rawData = await this.prisma.modelUsageLog.groupBy({
      by: ['createdAt'],
      where,
      _sum: { estimatedCost: true, tokensUsed: true },
      _count: true,
    });

    // Group by interval
    const groupedData: Record<string, { cost: number; tokens: number; requests: number }> = {};
    
    rawData.forEach(row => {
      const date = this.truncateDate(row.createdAt, interval);
      if (!groupedData[date]) {
        groupedData[date] = { cost: 0, tokens: 0, requests: 0 };
      }
      groupedData[date].cost += Number(row._sum.estimatedCost || 0);
      groupedData[date].tokens += Number(row._sum.tokensUsed || 0);
      groupedData[date].requests += row._count;
    });

    return Object.entries(groupedData)
      .map(([date, data]) => ({
        date,
        cost: data.cost,
        tokens: data.tokens,
        requests: data.requests,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getModelCostSummary(dateFilter: any) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const stats = await this.prisma.modelUsageLog.aggregate({
      where,
      _sum: { estimatedCost: true, tokensUsed: true },
      _count: true,
    });

    const totalCost = Number(stats._sum.estimatedCost || 0);
    const totalTokens = Number(stats._sum.tokensUsed || 0);
    const totalRequests = stats._count;

    return {
      totalCost,
      totalTokens,
      totalRequests,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    };
  }

  private async getCostByModel(dateFilter: any) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const data = await this.prisma.modelUsageLog.groupBy({
      by: ['model'],
      where,
      _sum: { estimatedCost: true },
    });

    const result: Record<string, number> = {};
    data.forEach(row => {
      result[row.model] = Number(row._sum.estimatedCost || 0);
    });

    return result;
  }

  private async getCostByOperation(dateFilter: any) {
    const where = dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {};
    
    const data = await this.prisma.modelUsageLog.groupBy({
      by: ['operation'],
      where,
      _sum: { estimatedCost: true },
    });

    const result: Record<string, number> = {};
    data.forEach(row => {
      result[row.operation] = Number(row._sum.estimatedCost || 0);
    });

    return result;
  }

  // Utility methods
  private getDateFormat(interval: string): string {
    switch (interval) {
      case 'hourly': return 'hour';
      case 'daily': return 'day';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      default: return 'day';
    }
  }

  private truncateDate(date: Date, interval: string): string {
    switch (interval) {
      case 'hourly':
        return date.toISOString().substr(0, 13) + ':00:00';
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return date.toISOString().substr(0, 7) + '-01';
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private buildWhereClause(where: any): string {
    // This is a simplified version - in production, you'd want proper SQL sanitization
    const conditions = ['TRUE']; // Start with TRUE to make AND logic work
    
    if (where.eventType) {
      conditions.push(`event_type = '${where.eventType}'`);
    }
    
    if (where.userId) {
      conditions.push(`user_id = '${where.userId}'`);
    }
    
    if (where.createdAt?.gte) {
      conditions.push(`created_at >= '${where.createdAt.gte.toISOString()}'`);
    }
    
    if (where.createdAt?.lte) {
      conditions.push(`created_at <= '${where.createdAt.lte.toISOString()}'`);
    }
    
    return conditions.join(' AND ');
  }
}
