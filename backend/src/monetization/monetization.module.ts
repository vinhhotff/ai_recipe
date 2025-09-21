import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { MonetizationController } from './monetization.controller';
import { SubscriptionService } from './services/subscription.service';
import { PaymentService } from './services/payment.service';
import { UsageService } from './services/usage.service';

@Module({
  imports: [
    ConfigModule,
    CommonModule, // For PrismaService
    AuthModule    // For JWT guards
  ],
  controllers: [MonetizationController],
  providers: [
    SubscriptionService,
    PaymentService,
    UsageService
  ],
  exports: [
    SubscriptionService,
    PaymentService,
    UsageService
  ]
})
export class MonetizationModule {}
