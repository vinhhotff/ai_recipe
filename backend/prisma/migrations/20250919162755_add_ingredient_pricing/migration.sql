-- Step 1: Add new columns to ingredients table with default values first
ALTER TABLE "public"."ingredients" 
ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "basePrice" DECIMAL(10,2),
ADD COLUMN "canonicalUnit" TEXT NOT NULL DEFAULT 'kg',
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

-- Step 2: Update existing ingredients with proper canonical units
UPDATE "public"."ingredients" SET "canonicalUnit" = 'kg' WHERE "canonicalUnit" = 'kg';

-- Step 3: Update core_recipe_ingredients table
-- First add new columns
ALTER TABLE "public"."core_recipe_ingredients" 
ADD COLUMN "cachedPricePerUnit" DECIMAL(10,2),
ADD COLUMN "cachedTotalPrice" DECIMAL(10,2),
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert existing quantity from string to decimal where possible
-- Add new quantity column as decimal
ALTER TABLE "public"."core_recipe_ingredients" 
ADD COLUMN "quantity_new" DECIMAL(10,3);

-- Update quantity_new with converted values (handle string to decimal conversion)
UPDATE "public"."core_recipe_ingredients" 
SET "quantity_new" = CAST("quantity" AS DECIMAL(10,3))
WHERE "quantity" ~ '^[0-9]+(\.[0-9]+)?$';

-- Set default value for any non-numeric quantities
UPDATE "public"."core_recipe_ingredients" 
SET "quantity_new" = 1.0 
WHERE "quantity_new" IS NULL;

-- Drop old quantity column and rename new one
ALTER TABLE "public"."core_recipe_ingredients" 
DROP COLUMN "quantity";

ALTER TABLE "public"."core_recipe_ingredients" 
RENAME COLUMN "quantity_new" TO "quantity";

-- Make quantity NOT NULL
ALTER TABLE "public"."core_recipe_ingredients" 
ALTER COLUMN "quantity" SET NOT NULL;

-- CreateIndex
CREATE INDEX "core_recipe_ingredients_recipeId_idx" ON "public"."core_recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "public"."ingredients"("name");
