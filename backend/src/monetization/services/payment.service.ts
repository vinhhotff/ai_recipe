import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreatePaymentDto, 
  PaymentResponseDto, 
  PaymentWebhookDto,
  RefundPaymentDto,
  PaymentStatsResponseDto,
  PaymentStatus,
  PaymentMethod 
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  // Create payment transaction
  async createPayment(userId: string, createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    // Validate subscription exists
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: createDto.subscriptionId },
      include: { plan: true }
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('Cannot create payment for another user\'s subscription');
    }

    // Create payment transaction
    const payment = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        subscriptionId: createDto.subscriptionId,
        amount: new Decimal(createDto.amount),
        currency: createDto.currency || 'VND',
        paymentMethod: createDto.paymentMethod,
        status: 'PENDING',
        metadata: createDto.metadata || {}
      }
    });

    // Initialize payment with provider
    let providerResponse: any = {};
    
    try {
      switch (createDto.paymentMethod) {
        case PaymentMethod.STRIPE:
          providerResponse = await this.initializeStripePayment(payment, createDto);
          break;
        case PaymentMethod.MOMO:
          providerResponse = await this.initializeMoMoPayment(payment, createDto);
          break;
        case PaymentMethod.ZALOPAY:
          providerResponse = await this.initializeZaloPayPayment(payment, createDto);
          break;
        default:
          throw new BadRequestException(`Unsupported payment method: ${createDto.paymentMethod}`);
      }

      // Update payment with provider response
      const updatedPayment = await this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          externalId: providerResponse.externalId,
          metadata: {
            ...createDto.metadata,
            ...providerResponse.metadata
          }
        }
      });

      return this.mapPaymentToResponse(updatedPayment);
    } catch (error) {
      // Update payment status to failed
      await this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: error.message
        }
      });

      throw error;
    }
  }

  // Get payment by ID
  async getPaymentById(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return this.mapPaymentToResponse(payment);
  }

  // Get user payments
  async getUserPayments(userId: string, page: number = 1, limit: number = 10): Promise<{
    payments: PaymentResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.paymentTransaction.count({
        where: { userId }
      })
    ]);

    return {
      payments: payments.map(p => this.mapPaymentToResponse(p)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Handle payment webhook
  async handleWebhook(webhookDto: PaymentWebhookDto): Promise<void> {
    // Verify webhook signature (implementation depends on provider)
    const isValid = await this.verifyWebhookSignature(webhookDto);
    
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Find payment by external ID
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { externalId: webhookDto.externalId },
      include: { subscription: true }
    });

    if (!payment) {
      console.warn(`Payment not found for external ID: ${webhookDto.externalId}`);
      return;
    }

    // Update payment status based on webhook event
    const newStatus = this.mapWebhookEventToStatus(webhookDto.eventType, webhookDto.provider);
    
    if (newStatus && newStatus !== payment.status) {
      await this.updatePaymentStatus(
        payment.id, 
        newStatus, 
        webhookDto.eventType === 'payment_failed' ? 'Payment failed at provider' : undefined
      );

      // If payment succeeded, activate subscription
      if (newStatus === 'SUCCESS') {
        await this.activateSubscriptionAfterPayment(payment.subscriptionId);
      }
    }
  }

  // Refund payment
  async refundPayment(refundDto: RefundPaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id: refundDto.paymentId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException('Can only refund successful payments');
    }

    // Process refund with payment provider
    let refundSuccess = false;
    try {
      switch (payment.paymentMethod) {
        case 'STRIPE':
          refundSuccess = await this.processStripeRefund(payment, refundDto);
          break;
        case 'MOMO':
          refundSuccess = await this.processMoMoRefund(payment, refundDto);
          break;
        case 'ZALOPAY':
          refundSuccess = await this.processZaloPayRefund(payment, refundDto);
          break;
      }
    } catch (error) {
      console.error('Refund processing failed:', error);
      refundSuccess = false;
    }

    if (refundSuccess) {
      const updatedPayment = await this.prisma.paymentTransaction.update({
        where: { id: refundDto.paymentId },
        data: {
          status: 'REFUNDED',
          metadata: {
            ...(payment.metadata as object || {}),
            refundReason: refundDto.reason,
            refundAmount: refundDto.amount || payment.amount.toNumber(),
            refundedAt: new Date().toISOString()
          }
        }
      });

      return this.mapPaymentToResponse(updatedPayment);
    } else {
      throw new BadRequestException('Refund processing failed');
    }
  }

  // Get payment statistics
  async getPaymentStats(startDate?: Date, endDate?: Date): Promise<PaymentStatsResponseDto> {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalStats,
      successfulTransactions,
      failedTransactions,
      transactionsByMethod,
      dailyRevenue
    ] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true }
      }),
      this.prisma.paymentTransaction.count({
        where: { ...whereClause, status: 'SUCCESS' }
      }),
      this.prisma.paymentTransaction.count({
        where: { ...whereClause, status: 'FAILED' }
      }),
      this.prisma.paymentTransaction.groupBy({
        where: whereClause,
        by: ['paymentMethod'],
        _count: { paymentMethod: true }
      }),
      this.getDailyRevenueData(startDate, endDate)
    ]);

    const transactionsByMethodMap: Record<string, number> = {};
    transactionsByMethod.forEach(group => {
      transactionsByMethodMap[group.paymentMethod] = group._count.paymentMethod;
    });

    const totalTransactions = totalStats._count.id;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    return {
      totalRevenue: Number(totalStats._sum.amount || 0),
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      averageTransactionAmount: totalTransactions > 0 ? Number(totalStats._sum.amount || 0) / totalTransactions : 0,
      transactionsByMethod: transactionsByMethodMap,
      successRate,
      dailyRevenue
    };
  }

  // Private helper methods
  private async updatePaymentStatus(paymentId: string, status: PaymentStatus, failureReason?: string): Promise<void> {
    await this.prisma.paymentTransaction.update({
      where: { id: paymentId },
      data: {
        status,
        failureReason,
        processedAt: new Date()
      }
    });
  }

  private async activateSubscriptionAfterPayment(subscriptionId: string): Promise<void> {
    await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE' }
    });
  }

  private mapPaymentToResponse(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      subscriptionId: payment.subscriptionId,
      amount: payment.amount.toString(),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      externalId: payment.externalId,
      metadata: payment.metadata,
      failureReason: payment.failureReason,
      processedAt: payment.processedAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString()
    };
  }

  private mapWebhookEventToStatus(eventType: string, provider: string): PaymentStatus | null {
    const eventMappings: Record<string, Record<string, PaymentStatus>> = {
      stripe: {
        'payment_intent.succeeded': PaymentStatus.SUCCESS,
        'payment_intent.payment_failed': PaymentStatus.FAILED
      },
      momo: {
        'payment.success': PaymentStatus.SUCCESS,
        'payment.failed': PaymentStatus.FAILED
      },
      zalopay: {
        'payment.success': PaymentStatus.SUCCESS,
        'payment.failed': PaymentStatus.FAILED
      }
    };

    return eventMappings[provider]?.[eventType] || null;
  }

  private async getDailyRevenueData(startDate?: Date, endDate?: Date): Promise<Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>> {
    // Implementation for daily revenue aggregation
    // This would typically involve raw SQL or complex Prisma aggregation
    return []; // Placeholder
  }

  // Payment provider integration methods (mock implementations)
  private async initializeStripePayment(payment: any, createDto: CreatePaymentDto): Promise<any> {
    // Mock Stripe integration
    return {
      externalId: `pi_mock_${payment.id}`,
      metadata: {
        checkoutUrl: `https://checkout.stripe.com/pay/cs_test_${payment.id}`,
        sessionId: `cs_test_${payment.id}`
      }
    };
  }

  private async initializeMoMoPayment(payment: any, createDto: CreatePaymentDto): Promise<any> {
    // Mock MoMo integration
    return {
      externalId: `momo_${payment.id}`,
      metadata: {
        payUrl: `https://test-payment.momo.vn/pay/${payment.id}`,
        qrCode: `https://test-payment.momo.vn/qr/${payment.id}`
      }
    };
  }

  private async initializeZaloPayPayment(payment: any, createDto: CreatePaymentDto): Promise<any> {
    // Mock ZaloPay integration
    return {
      externalId: `zp_${payment.id}`,
      metadata: {
        orderUrl: `https://sandbox.zalopay.com.vn/pay/${payment.id}`,
        appTransId: `zp_${Date.now()}_${payment.id}`
      }
    };
  }

  private async verifyWebhookSignature(webhookDto: PaymentWebhookDto): Promise<boolean> {
    // Mock signature verification
    return true;
  }

  private async processStripeRefund(payment: any, refundDto: RefundPaymentDto): Promise<boolean> {
    // Mock Stripe refund
    return true;
  }

  private async processMoMoRefund(payment: any, refundDto: RefundPaymentDto): Promise<boolean> {
    // Mock MoMo refund
    return true;
  }

  private async processZaloPayRefund(payment: any, refundDto: RefundPaymentDto): Promise<boolean> {
    // Mock ZaloPay refund
    return true;
  }
}
