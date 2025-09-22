-- CreateTable
CREATE TABLE "public"."core_recipe_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_recipe_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."core_recipe_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_recipe_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "core_recipe_comments_recipeId_idx" ON "public"."core_recipe_comments"("recipeId");

-- CreateIndex
CREATE INDEX "core_recipe_comments_userId_idx" ON "public"."core_recipe_comments"("userId");

-- CreateIndex
CREATE INDEX "core_recipe_comments_parentCommentId_idx" ON "public"."core_recipe_comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "core_recipe_comments_createdAt_idx" ON "public"."core_recipe_comments"("createdAt");

-- CreateIndex
CREATE INDEX "core_recipe_likes_recipeId_idx" ON "public"."core_recipe_likes"("recipeId");

-- CreateIndex
CREATE INDEX "core_recipe_likes_userId_idx" ON "public"."core_recipe_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "core_recipe_likes_userId_recipeId_key" ON "public"."core_recipe_likes"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "public"."core_recipe_comments" ADD CONSTRAINT "core_recipe_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_recipe_comments" ADD CONSTRAINT "core_recipe_comments_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."core_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_recipe_comments" ADD CONSTRAINT "core_recipe_comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."core_recipe_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_recipe_likes" ADD CONSTRAINT "core_recipe_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."core_recipe_likes" ADD CONSTRAINT "core_recipe_likes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."core_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
