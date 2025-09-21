/*
  Warnings:

  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('STRIPE', 'MOMO', 'ZALOPAY');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."AnalyticsEventType" AS ENUM ('RECIPE_GENERATION', 'VIDEO_GENERATION', 'COMMUNITY_POST', 'COMMUNITY_COMMENT', 'COMMUNITY_LIKE', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPGRADED', 'SUBSCRIPTION_CANCELED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'USER_REGISTRATION', 'USER_LOGIN', 'INGREDIENT_SCAN', 'RECIPE_VIEW', 'VIDEO_VIEW');

-- CreateEnum
CREATE TYPE "public"."AdminReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "public"."subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropTable
DROP TABLE "public"."subscriptions";

-- CreateTable
CREATE TABLE "public"."subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2),
    "billingCycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "usageQuota" JSONB NOT NULL,
    "billingCycle" "public"."BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "metadata" JSONB,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "public"."AnalyticsEventType" NOT NULL,
    "metadata" JSONB,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_reports" (
    "id" TEXT NOT NULL,
    "type" "public"."AdminReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "dateRange" JSONB NOT NULL,
    "filters" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "admin_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "processingTime" INTEGER,
    "estimatedCost" DECIMAL(10,4),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "public"."subscription_plans"("name");

-- CreateIndex
CREATE INDEX "subscription_plans_isActive_sortOrder_idx" ON "public"."subscription_plans"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_userId_key" ON "public"."user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_idx" ON "public"."user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "user_subscriptions_status_idx" ON "public"."user_subscriptions"("status");

-- CreateIndex
CREATE INDEX "user_subscriptions_nextBillingDate_idx" ON "public"."user_subscriptions"("nextBillingDate");

-- CreateIndex
CREATE INDEX "payment_transactions_userId_idx" ON "public"."payment_transactions"("userId");

-- CreateIndex
CREATE INDEX "payment_transactions_subscriptionId_idx" ON "public"."payment_transactions"("subscriptionId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "public"."payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_externalId_idx" ON "public"."payment_transactions"("externalId");

-- CreateIndex
CREATE INDEX "analytics_events_eventType_idx" ON "public"."analytics_events"("eventType");

-- CreateIndex
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "public"."analytics_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "public"."analytics_events"("createdAt");

-- CreateIndex
CREATE INDEX "admin_reports_type_generatedAt_idx" ON "public"."admin_reports"("type", "generatedAt");

-- CreateIndex
CREATE INDEX "admin_reports_generatedAt_idx" ON "public"."admin_reports"("generatedAt");

-- CreateIndex
CREATE INDEX "model_usage_logs_model_createdAt_idx" ON "public"."model_usage_logs"("model", "createdAt");

-- CreateIndex
CREATE INDEX "model_usage_logs_operation_createdAt_idx" ON "public"."model_usage_logs"("operation", "createdAt");

-- CreateIndex
CREATE INDEX "model_usage_logs_userId_createdAt_idx" ON "public"."model_usage_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."user_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_usage_logs" ADD CONSTRAINT "model_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
