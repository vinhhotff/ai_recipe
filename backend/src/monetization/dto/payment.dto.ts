import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsUUID,
  IsNumber,
  IsDecimal,
  IsObject,
  Min,
  Max
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from './subscription.dto';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export class CreatePaymentDto {
  @ApiProperty({ 
    example: 'uuid-subscription-123',
    description: 'Subscription ID for this payment' 
  })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ 
    example: 99000,
    description: 'Payment amount in VND'
  })
  @IsNumber()
  @Min(1000) // minimum 1,000 VND
  @Max(50000000) // maximum 50M VND
  amount: number;

  @ApiProperty({ 
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method to use' 
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ 
    example: 'VND',
    description: 'Currency code' 
  })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiPropertyOptional({ 
    example: { 
      returnUrl: 'https://app.example.com/subscription/success',
      cancelUrl: 'https://app.example.com/subscription/cancel'
    },
    description: 'Payment method specific metadata' 
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
  @ApiProperty({ example: 'uuid-payment-123', description: 'Payment transaction ID' })
  id: string;

  @ApiProperty({ example: 'uuid-user-456', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'uuid-subscription-789', description: 'Subscription ID' })
  subscriptionId: string;

  @ApiProperty({ example: '99000.00', description: 'Payment amount' })
  amount: string;

  @ApiProperty({ example: 'VND', description: 'Currency code' })
  currency: string;

  @ApiProperty({ 
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method used' 
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({ 
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    description: 'Current payment status' 
  })
  status: PaymentStatus;

  @ApiPropertyOptional({ 
    example: 'pi_1ABC123stripe456',
    description: 'External payment provider ID' 
  })
  externalId?: string;

  @ApiPropertyOptional({ 
    example: {
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      sessionId: 'cs_test_123456789'
    },
    description: 'Payment method specific data' 
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ 
    example: 'Card was declined',
    description: 'Failure reason if payment failed' 
  })
  failureReason?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-20T10:35:00Z',
    description: 'Processing completion timestamp' 
  })
  processedAt?: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class PaymentWebhookDto {
  @ApiProperty({ 
    example: 'stripe',
    description: 'Payment provider name' 
  })
  @IsString()
  provider: string;

  @ApiProperty({ 
    example: 'payment_intent.succeeded',
    description: 'Webhook event type' 
  })
  @IsString()
  eventType: string;

  @ApiProperty({ 
    example: 'pi_1ABC123stripe456',
    description: 'External payment ID' 
  })
  @IsString()
  externalId: string;

  @ApiProperty({ 
    example: { /* webhook payload */ },
    description: 'Full webhook payload from provider' 
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ 
    example: 'whsec_1ABC123signature456',
    description: 'Webhook signature for verification' 
  })
  @IsOptional()
  @IsString()
  signature?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ 
    example: 'uuid-payment-123',
    description: 'Payment transaction ID to refund' 
  })
  @IsUUID()
  paymentId: string;

  @ApiPropertyOptional({ 
    example: 50000,
    description: 'Partial refund amount (full refund if not specified)'
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  amount?: number;

  @ApiPropertyOptional({ 
    example: 'Customer requested cancellation',
    description: 'Reason for refund' 
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentStatsResponseDto {
  @ApiProperty({ example: 15250000, description: 'Total revenue in VND' })
  totalRevenue: number;

  @ApiProperty({ example: 1230, description: 'Total number of transactions' })
  totalTransactions: number;

  @ApiProperty({ example: 1180, description: 'Successful transactions' })
  successfulTransactions: number;

  @ApiProperty({ example: 50, description: 'Failed transactions' })
  failedTransactions: number;

  @ApiProperty({ example: 12500, description: 'Average transaction amount' })
  averageTransactionAmount: number;

  @ApiProperty({ 
    example: {
      STRIPE: 800,
      MOMO: 300,
      ZALOPAY: 130
    },
    description: 'Transactions by payment method' 
  })
  transactionsByMethod: Record<string, number>;

  @ApiProperty({ example: 95.9, description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ 
    example: [
      { date: '2024-01-01', revenue: 1500000, transactions: 45 },
      { date: '2024-01-02', revenue: 2200000, transactions: 67 }
    ],
    description: 'Daily revenue data for charts' 
  })
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export class PaymentMethodConfigDto {
  @ApiProperty({ 
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method type' 
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ 
    example: true,
    description: 'Whether this payment method is enabled' 
  })
  enabled: boolean;

  @ApiProperty({ 
    example: {
      publicKey: 'pk_test_123',
      webhookSecret: 'whsec_456'
    },
    description: 'Payment method configuration' 
  })
  config: Record<string, any>;

  @ApiPropertyOptional({ 
    example: ['VND', 'USD'],
    description: 'Supported currencies' 
  })
  supportedCurrencies?: string[];

  @ApiPropertyOptional({ 
    example: { min: 1000, max: 50000000 },
    description: 'Amount limits' 
  })
  limits?: {
    min: number;
    max: number;
  };
}
