import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache.service';
import { AnalyticsService } from './analytics.service';
import { 
  DashboardOverviewResponseDto,
  TopUsersResponseDto,
  ExportRequestDto,
  MetricType,
  AnalyticsEventType
} from '../dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private analyticsService: AnalyticsService
  ) {}

  async getDashboardOverview(): Promise<DashboardOverviewResponseDto> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get user metrics
    const [
      totalUsers,
      activeUsers,
      newUsersToday
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          analyticsEvents: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          }
        }
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay
          }
        }
      })
    ]);

    // Calculate user growth rate
    const lastMonthUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          lt: startOfMonth,
          gte: new Date(today.getFullYear(), today.getMonth() - 1, 1)
        }
      }
    });
    const userGrowthRate = lastMonthUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;

    // Get revenue metrics
    const [
      totalRevenue,
      monthlyRevenue,
      dailyRevenue
    ] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startOfDay }
        },
        _sum: { amount: true }
      })
    ]);

    // Calculate revenue growth rate
    const lastMonthRevenue = await this.prisma.paymentTransaction.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: {
          lt: startOfMonth,
          gte: new Date(today.getFullYear(), today.getMonth() - 1, 1)
        }
      },
      _sum: { amount: true }
    });
    
    const currentMonthRevenue = Number(monthlyRevenue._sum.amount || 0);
    const previousMonthRevenue = Number(lastMonthRevenue._sum.amount || 0);
    const revenueGrowthRate = previousMonthRevenue > 0 ? 
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

    // Get usage metrics
    const [
      recipeGenerations,
      videoGenerations,
      communityPosts,
      totalEvents
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { eventType: AnalyticsEventType.RECIPE_GENERATION }
      }),
      this.prisma.analyticsEvent.count({
        where: { eventType: AnalyticsEventType.VIDEO_GENERATION }
      }),
      this.prisma.analyticsEvent.count({
        where: { eventType: AnalyticsEventType.COMMUNITY_POST }
      }),
      this.prisma.analyticsEvent.count()
    ]);

    // Get cost metrics
    const [
      totalCost,
      todayCost,
      userCount
    ] = await Promise.all([
      this.prisma.modelUsageLog.aggregate({
        _sum: { estimatedCost: true }
      }),
      this.prisma.modelUsageLog.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { estimatedCost: true }
      }),
      this.prisma.user.count()
    ]);

    return {
      users: {
        totalUsers,
        activeUsers,
        newUsersToday,
        userGrowthRate
      },
      revenue: {
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
        dailyRevenue: Number(dailyRevenue._sum.amount || 0),
        revenueGrowthRate
      },
      usage: {
        recipeGenerations,
        videoGenerations,
        communityPosts,
        totalEvents
      },
      costs: {
        totalCost: Number(totalCost._sum.estimatedCost || 0),
        todayCost: Number(todayCost._sum.estimatedCost || 0),
        averageCostPerUser: userCount > 0 ? Number(totalCost._sum.estimatedCost || 0) / userCount : 0
      }
    };
  }

  async getTopUsers(page: number = 1, limit: number = 20): Promise<TopUsersResponseDto> {
    const skip = (page - 1) * limit;

    // Get users with their activity counts
    const users = await this.prisma.user.findMany({
      skip,
      take: limit,
      include: {
        subscription: {
          include: { plan: true }
        },
        transactions: {
          where: { status: 'SUCCESS' },
          select: { amount: true }
        },
        analyticsEvents: {
          select: { eventType: true }
        }
      },
      orderBy: {
        analyticsEvents: {
          _count: 'desc'
        }
      }
    });

    const totalUsers = await this.prisma.user.count();
    const totalPages = Math.ceil(totalUsers / limit);

    const usersData = users.map(user => {
      const events = user.analyticsEvents;
      const totalRevenue = user.transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        userId: user.id,
        userName: user.email,
        planName: user.subscription?.plan?.name || 'Free',
        totalEvents: events.length,
        recipeGenerations: events.filter(e => e.eventType === AnalyticsEventType.RECIPE_GENERATION).length,
        videoGenerations: events.filter(e => e.eventType === AnalyticsEventType.VIDEO_GENERATION).length,
        communityPosts: events.filter(e => e.eventType === AnalyticsEventType.COMMUNITY_POST).length,
        totalRevenue
      };
    });

    return {
      users: usersData,
      page,
      totalPages
    };
  }

  async getTrendingRecipes(limit: number = 10) {
    // Get recipes with most likes and comments in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const trendingRecipes = await this.prisma.recipe.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        isDeleted: false,
        isPublic: true
      },
      include: {
        createdBy: {
          select: { email: true, name: true }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        }
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { comments: { _count: 'desc' } }
      ],
      take: limit
    });

    return trendingRecipes.map(recipe => ({
      recipeId: recipe.id,
      title: recipe.title,
      authorName: recipe.createdBy?.name || recipe.createdBy?.email || 'AI Generated',
      likesCount: recipe._count.likes,
      commentsCount: recipe._count.comments,
      createdAt: recipe.createdAt,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty
    }));
  }

  async exportData(exportRequest: ExportRequestDto): Promise<any> {
    const { metricType, format, from, to, filters } = exportRequest;

    let data: any[] = [];

    switch (metricType) {
      case MetricType.USAGE:
        const usageData = await this.analyticsService.getUsageAnalytics({
          from,
          to,
          eventType: filters?.eventType,
          interval: filters?.interval || 'daily',
          limit: 10000
        });
        data = usageData.data;
        break;

      case MetricType.REVENUE:
        const revenueData = await this.analyticsService.getRevenueAnalytics({
          from,
          to,
          interval: filters?.interval || 'daily'
        });
        data = revenueData.data;
        break;

      case MetricType.SUBSCRIPTIONS:
        const subscriptionData = await this.analyticsService.getSubscriptionAnalytics({
          from,
          to,
          interval: filters?.interval || 'daily'
        });
        data = subscriptionData.data;
        break;

      case MetricType.MODEL_COST:
        const costData = await this.analyticsService.getModelCostAnalytics({
          from,
          to,
          interval: filters?.interval || 'daily'
        });
        data = costData.data;
        break;

      case MetricType.USER_ENGAGEMENT:
        // Get detailed user engagement data
        data = await this.getDetailedUserEngagement(from, to);
        break;

      default:
        throw new Error(`Unsupported metric type: ${metricType}`);
    }

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private async getDetailedUserEngagement(from?: string, to?: string) {
    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from);
      if (to) dateFilter.createdAt.lte = new Date(to);
    }

    const engagementData = await this.prisma.analyticsEvent.groupBy({
      by: ['userId', 'eventType'],
      where: dateFilter,
      _count: true
    });

    const userEngagement: Record<string, Record<string, number>> = {};
    
    for (const item of engagementData) {
      if (!item.userId) continue;
      
      if (!userEngagement[item.userId]) {
        userEngagement[item.userId] = {};
      }
      
      userEngagement[item.userId][item.eventType] = item._count;
    }

    return Object.entries(userEngagement).map(([userId, events]) => ({
      userId,
      ...events,
      totalEvents: Object.values(events).reduce((sum, count) => sum + count, 0)
    }));
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if necessary
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  async getCacheStats() {
    const stats = await this.cacheService.getStats();
    return {
      success: true,
      message: 'Cache statistics fetched successfully',
      data: stats,
    };
  }

  async clearCache() {
    await this.cacheService.flush();
    return {
      success: true,
      message: 'Cache cleared successfully',
    };
  }

  // Generate and cache reports
  async generateReport(type: 'DAILY' | 'WEEKLY' | 'MONTHLY', adminUserId?: string) {
    const now = new Date();
    let title: string;
    let dateRange: { from: Date; to: Date };

    switch (type) {
      case 'DAILY':
        title = `Daily Report - ${now.toISOString().split('T')[0]}`;
        dateRange = {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          to: now
        };
        break;
      case 'WEEKLY':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        title = `Weekly Report - ${weekStart.toISOString().split('T')[0]}`;
        dateRange = {
          from: weekStart,
          to: now
        };
        break;
      case 'MONTHLY':
        title = `Monthly Report - ${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        dateRange = {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: now
        };
        break;
    }

    const [overview, usageData, revenueData, subscriptionData] = await Promise.all([
      this.getDashboardOverview(),
      this.analyticsService.getUsageAnalytics({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        interval: type === 'DAILY' ? 'hourly' : 'daily',
        limit: 1000
      }),
      this.analyticsService.getRevenueAnalytics({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        interval: type === 'DAILY' ? 'hourly' : 'daily'
      }),
      this.analyticsService.getSubscriptionAnalytics({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        interval: type === 'DAILY' ? 'hourly' : 'daily'
      })
    ]);

    const metrics = {
      overview,
      usage: usageData,
      revenue: revenueData,
      subscriptions: subscriptionData,
      generatedAt: now.toISOString()
    };

    // Save report to database
    const report = await this.prisma.adminReport.create({
      data: {
        type,
        title,
        metrics: metrics as any,
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        generatedBy: adminUserId
      }
    });

    return report;
  }

  async getReports(type?: 'DAILY' | 'WEEKLY' | 'MONTHLY', page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = type ? { type } : {};

    const [reports, total] = await Promise.all([
      this.prisma.adminReport.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.adminReport.count({ where })
    ]);

    return {
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
