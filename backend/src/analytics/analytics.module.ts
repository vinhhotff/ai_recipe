import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AdminDashboardService } from './services/admin-dashboard.service';

@Module({
  imports: [
    CommonModule, // For PrismaService
    AuthModule    // For JWT guards
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AdminDashboardService
  ],
  exports: [
    AnalyticsService,
    AdminDashboardService
  ]
})
export class AnalyticsModule {}
