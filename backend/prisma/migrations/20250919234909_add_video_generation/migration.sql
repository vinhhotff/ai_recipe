-- CreateEnum
CREATE TYPE "public"."SuggestionStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."VideoGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "public"."ingredients" ALTER COLUMN "canonicalUnit" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."recipe_suggestion_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputIngredients" JSONB NOT NULL,
    "preferences" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "generatedRecipeId" TEXT,
    "status" "public"."SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "processingTimeMs" INTEGER,
    "totalCost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_suggestion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_job_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'QUEUED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recipe_videos" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "status" "public"."VideoGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "videoUrl" TEXT,
    "duration" INTEGER,
    "resolution" TEXT,
    "style" TEXT,
    "narration" BOOLEAN NOT NULL DEFAULT false,
    "voice" TEXT,
    "thumbnailUrl" TEXT,
    "fileSize" INTEGER,
    "errorMessage" TEXT,
    "jobId" TEXT,
    "metadata" JSONB,
    "generatedBy" TEXT,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_suggestion_logs_userId_createdAt_idx" ON "public"."recipe_suggestion_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "recipe_suggestion_logs_status_idx" ON "public"."recipe_suggestion_logs"("status");

-- CreateIndex
CREATE INDEX "ai_job_queue_status_scheduledAt_idx" ON "public"."ai_job_queue"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ai_job_queue_type_status_idx" ON "public"."ai_job_queue"("type", "status");

-- CreateIndex
CREATE INDEX "recipe_videos_recipeId_idx" ON "public"."recipe_videos"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_videos_status_idx" ON "public"."recipe_videos"("status");

-- CreateIndex
CREATE INDEX "recipe_videos_generatedBy_idx" ON "public"."recipe_videos"("generatedBy");

-- AddForeignKey
ALTER TABLE "public"."recipe_suggestion_logs" ADD CONSTRAINT "recipe_suggestion_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_suggestion_logs" ADD CONSTRAINT "recipe_suggestion_logs_generatedRecipeId_fkey" FOREIGN KEY ("generatedRecipeId") REFERENCES "public"."recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_videos" ADD CONSTRAINT "recipe_videos_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
