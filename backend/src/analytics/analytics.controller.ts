import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  Delete
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './services/analytics.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import {
  RecordEventDto,
  AnalyticsQueryDto,
  UsageAnalyticsResponseDto,
  RevenueAnalyticsResponseDto,
  SubscriptionAnalyticsResponseDto,
  ModelCostAnalyticsResponseDto,
  DashboardOverviewResponseDto,
  TopUsersResponseDto,
  ExportRequestDto,
  AnalyticsEventType
} from './dto';

@ApiTags('Analytics & Admin Dashboard')
@Controller('api/admin/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private adminDashboardService: AdminDashboardService
  ) {}

  // Event Recording (for internal use)
  @Post('events')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Record analytics event' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordEvent(
    @Request() req,
    @Body() eventData: RecordEventDto
  ): Promise<void> {
    await this.analyticsService.recordEvent(req.user.id, eventData);
  }

  // Dashboard Overview
  @Get('overview')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get dashboard overview metrics (Admin only)' })
  @ApiResponse({ type: DashboardOverviewResponseDto })
  async getDashboardOverview(@Request() req): Promise<DashboardOverviewResponseDto> {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.getDashboardOverview();
  }

  // Usage Analytics
  @Get('usage')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get usage analytics (Admin only)' })
  @ApiResponse({ type: UsageAnalyticsResponseDto })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'eventType', required: false, enum: AnalyticsEventType })
  @ApiQuery({ name: 'interval', required: false, enum: ['hourly', 'daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsageAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ): Promise<UsageAnalyticsResponseDto> {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getUsageAnalytics(query);
  }

  // Revenue Analytics
  @Get('revenue')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get revenue analytics (Admin only)' })
  @ApiResponse({ type: RevenueAnalyticsResponseDto })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['daily', 'weekly', 'monthly'] })
  async getRevenueAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ): Promise<RevenueAnalyticsResponseDto> {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getRevenueAnalytics(query);
  }

  // Subscription Analytics
  @Get('subscriptions')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get subscription analytics (Admin only)' })
  @ApiResponse({ type: SubscriptionAnalyticsResponseDto })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['daily', 'weekly', 'monthly'] })
  async getSubscriptionAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ): Promise<SubscriptionAnalyticsResponseDto> {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getSubscriptionAnalytics(query);
  }

  // Model Cost Analytics
  @Get('model-cost')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get AI model cost analytics (Admin only)' })
  @ApiResponse({ type: ModelCostAnalyticsResponseDto })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['daily', 'weekly', 'monthly'] })
  async getModelCostAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ): Promise<ModelCostAnalyticsResponseDto> {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getModelCostAnalytics(query);
  }

  // Top Users
  @Get('users/top')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get top users by activity (Admin only)' })
  @ApiResponse({ type: TopUsersResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopUsers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<TopUsersResponseDto> {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.getTopUsers(page, limit);
  }

  // Trending Recipes
  @Get('recipes/trending')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get trending recipes (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrendingRecipes(
    @Request() req,
    @Query('limit') limit?: number
  ) {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.getTrendingRecipes(limit);
  }

  // Cache Management
  @Get('cache-stats')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get cache statistics (Admin only)' })
  async getCacheStats(@Request() req) {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.getCacheStats();
  }

  @Delete('cache')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Clear all cache (Admin only)' })
  @HttpCode(HttpStatus.OK)
  async clearCache(@Request() req) {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.clearCache();
  }

  // Data Export
  @Post('export')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Export analytics data (Admin only)' })
  async exportData(
    @Request() req,
    @Body() exportRequest: ExportRequestDto,
    @Res() res: Response
  ) {
    this.validateAdminAccess(req.user);

    try {
      const data = await this.adminDashboardService.exportData(exportRequest);
      
      if (exportRequest.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exportRequest.metricType}-export.csv"`);
        res.send(data);
      } else {
        res.json({
          success: true,
          data,
          exportedAt: new Date().toISOString(),
          count: Array.isArray(data) ? data.length : 1
        });
      }
    } catch (error) {
      throw new BadRequestException(`Export failed: ${error.message}`);
    }
  }

  // Reports Management
  @Post('reports/:type')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Generate analytics report (Admin only)' })
  @ApiQuery({ name: 'type', enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  async generateReport(
    @Request() req,
    @Param('type') type: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ) {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.generateReport(type, req.user.id);
  }

  @Get('reports')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get analytics reports (Admin only)' })
  @ApiQuery({ name: 'type', required: false, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getReports(
    @Request() req,
    @Query('type') type?: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    this.validateAdminAccess(req.user);
    return this.adminDashboardService.getReports(type, page, limit);
  }

  // Feature-specific endpoints
  @Get('usage/recipes')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get recipe generation analytics (Admin only)' })
  async getRecipeAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getUsageAnalytics({
      ...query,
      eventType: AnalyticsEventType.RECIPE_GENERATION
    });
  }

  @Get('usage/videos')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get video generation analytics (Admin only)' })
  async getVideoAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateAdminAccess(req.user);
    return this.analyticsService.getUsageAnalytics({
      ...query,
      eventType: AnalyticsEventType.VIDEO_GENERATION
    });
  }

  @Get('usage/community')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get community activity analytics (Admin only)' })
  async getCommunityAnalytics(
    @Request() req,
    @Query() query: AnalyticsQueryDto
  ) {
    this.validateAdminAccess(req.user);
    
    // Get all community-related events
    const [posts, comments, likes] = await Promise.all([
      this.analyticsService.getUsageAnalytics({
        ...query,
        eventType: AnalyticsEventType.COMMUNITY_POST
      }),
      this.analyticsService.getUsageAnalytics({
        ...query,
        eventType: AnalyticsEventType.COMMUNITY_COMMENT
      }),
      this.analyticsService.getUsageAnalytics({
        ...query,
        eventType: AnalyticsEventType.COMMUNITY_LIKE
      })
    ]);

    return {
      posts,
      comments,
      likes,
      summary: {
        totalCommunityActivity: posts.summary.totalEvents + comments.summary.totalEvents + likes.summary.totalEvents,
        uniqueUsers: Math.max(posts.summary.uniqueUsers, comments.summary.uniqueUsers, likes.summary.uniqueUsers)
      }
    };
  }

  // Real-time metrics (simplified)
  @Get('realtime')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Get real-time metrics (Admin only)' })
  async getRealtimeMetrics(@Request() req) {
    this.validateAdminAccess(req.user);
    
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      eventsLast24h,
      eventsLastHour,
      activeUsers,
      revenueToday
    ] = await Promise.all([
      this.analyticsService.getUsageAnalytics({
        from: last24Hours.toISOString(),
        to: now.toISOString(),
        interval: 'hourly',
        limit: 24
      }),
      this.analyticsService.getUsageAnalytics({
        from: lastHour.toISOString(),
        to: now.toISOString(),
        interval: 'hourly',
        limit: 1
      }),
      // Active users in the last hour
      this.analyticsService.getUsageAnalytics({
        from: lastHour.toISOString(),
        to: now.toISOString(),
        limit: 1
      }),
      this.analyticsService.getRevenueAnalytics({
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        to: now.toISOString()
      })
    ]);

    return {
      eventsLast24Hours: eventsLast24h.summary.totalEvents,
      eventsLastHour: eventsLastHour.summary.totalEvents,
      activeUsersLastHour: activeUsers.summary.uniqueUsers,
      revenueToday: revenueToday.summary.totalRevenue,
      timestamp: now.toISOString()
    };
  }

  // Health check for analytics system
  @Get('health')
  @ApiSecurity('bearer')
  @ApiOperation({ summary: 'Analytics system health check (Admin only)' })
  async getHealthCheck(@Request() req) {
    this.validateAdminAccess(req.user);
    
    try {
      // Basic connectivity tests
      const [eventCount, userCount, revenueSum] = await Promise.all([
        this.analyticsService.recordEvent(null, {
          eventType: AnalyticsEventType.USER_LOGIN,
          metadata: { healthCheck: true }
        }).then(() => 'ok').catch(e => e.message),
        
        // Test database connectivity
        this.adminDashboardService.getDashboardOverview()
          .then(() => 'ok').catch(e => e.message),
        
        // Test complex query
        this.analyticsService.getRevenueAnalytics({
          limit: 1
        }).then(() => 'ok').catch(e => e.message)
      ]);

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          eventRecording: eventCount,
          dashboardQueries: userCount,
          complexAggregations: revenueSum
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Private helper method
  private validateAdminAccess(user: any): void {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required for analytics endpoints');
    }
  }
}
