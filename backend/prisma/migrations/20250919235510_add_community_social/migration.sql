-- CreateEnum
CREATE TYPE "public"."CommunityRecipeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."community_recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "steps" TEXT[],
    "ingredients" JSONB NOT NULL,
    "status" "public"."CommunityRecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "servings" INTEGER,
    "prepTime" INTEGER,
    "cookTime" INTEGER,
    "difficulty" TEXT,
    "cuisine" TEXT,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "nutritionInfo" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recipe_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityRecipeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recipe_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "communityRecipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_meal_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "members" TEXT[],
    "recipes" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_MealPlanRecipes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MealPlanRecipes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_MealPlanMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MealPlanMember_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "community_recipes_userId_idx" ON "public"."community_recipes"("userId");

-- CreateIndex
CREATE INDEX "community_recipes_status_idx" ON "public"."community_recipes"("status");

-- CreateIndex
CREATE INDEX "community_recipes_createdAt_idx" ON "public"."community_recipes"("createdAt");

-- CreateIndex
CREATE INDEX "community_recipes_cuisine_idx" ON "public"."community_recipes"("cuisine");

-- CreateIndex
CREATE INDEX "recipe_comments_communityRecipeId_idx" ON "public"."recipe_comments"("communityRecipeId");

-- CreateIndex
CREATE INDEX "recipe_comments_userId_idx" ON "public"."recipe_comments"("userId");

-- CreateIndex
CREATE INDEX "recipe_comments_parentCommentId_idx" ON "public"."recipe_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "recipe_comments_createdAt_idx" ON "public"."recipe_comments"("createdAt");

-- CreateIndex
CREATE INDEX "recipe_likes_communityRecipeId_idx" ON "public"."recipe_likes"("communityRecipeId");

-- CreateIndex
CREATE INDEX "recipe_likes_userId_idx" ON "public"."recipe_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_likes_userId_communityRecipeId_key" ON "public"."recipe_likes"("userId", "communityRecipeId");

-- CreateIndex
CREATE INDEX "group_meal_plans_ownerId_idx" ON "public"."group_meal_plans"("ownerId");

-- CreateIndex
CREATE INDEX "group_meal_plans_isActive_idx" ON "public"."group_meal_plans"("isActive");

-- CreateIndex
CREATE INDEX "group_meal_plans_startDate_idx" ON "public"."group_meal_plans"("startDate");

-- CreateIndex
CREATE INDEX "_MealPlanRecipes_B_index" ON "public"."_MealPlanRecipes"("B");

-- CreateIndex
CREATE INDEX "_MealPlanMember_B_index" ON "public"."_MealPlanMember"("B");

-- AddForeignKey
ALTER TABLE "public"."community_recipes" ADD CONSTRAINT "community_recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_comments" ADD CONSTRAINT "recipe_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_comments" ADD CONSTRAINT "recipe_comments_communityRecipeId_fkey" FOREIGN KEY ("communityRecipeId") REFERENCES "public"."community_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_comments" ADD CONSTRAINT "recipe_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."recipe_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_likes" ADD CONSTRAINT "recipe_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recipe_likes" ADD CONSTRAINT "recipe_likes_communityRecipeId_fkey" FOREIGN KEY ("communityRecipeId") REFERENCES "public"."community_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_meal_plans" ADD CONSTRAINT "group_meal_plans_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MealPlanRecipes" ADD CONSTRAINT "_MealPlanRecipes_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."community_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MealPlanRecipes" ADD CONSTRAINT "_MealPlanRecipes_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."group_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MealPlanMember" ADD CONSTRAINT "_MealPlanMember_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."group_meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MealPlanMember" ADD CONSTRAINT "_MealPlanMember_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
