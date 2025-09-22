import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RecipeHistoryQueryDto {
  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Search by recipe title', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiProperty({ description: 'Minimum calories', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCalories?: number;

  @ApiProperty({ description: 'Maximum calories', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCalories?: number;

  @ApiProperty({ description: 'Filter by tags', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? [value] : value)
  tags?: string[];

  @ApiProperty({ description: 'Created after date', required: false })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiProperty({ description: 'Created before date', required: false })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

export class UpdateRecipeDto {
  @ApiProperty({ description: 'Recipe title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Number of servings', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  servings?: number;

  @ApiProperty({ description: 'Recipe ingredients', required: false })
  @IsOptional()
  ingredients?: any;

  @ApiProperty({ description: 'Cooking steps', required: false })
  @IsOptional()
  steps?: any;

  @ApiProperty({ description: 'Nutrition information', required: false })
  @IsOptional()
  nutrition?: any;

  @ApiProperty({ description: 'Recipe difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiProperty({ description: 'Recipe tags', required: false })
  @IsOptional()
  tags?: any;

  @ApiProperty({ description: 'Whether recipe is public', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class RecipeHistoryItemDto {
  @ApiProperty({ description: 'Recipe ID' })
  id: string;

  @ApiProperty({ description: 'Recipe title' })
  title: string;

  @ApiProperty({ description: 'Recipe slug' })
  slug: string;

  @ApiProperty({ description: 'Number of servings' })
  servings: number;

  @ApiProperty({ description: 'Total calories' })
  totalCalories: number;

  @ApiProperty({ description: 'Calories per serving' })
  caloriesPer: number;

  @ApiProperty({ description: 'Recipe ingredients' })
  ingredients: any;

  @ApiProperty({ description: 'Cooking steps' })
  steps: any;

  @ApiProperty({ description: 'Nutrition information', required: false })
  nutrition?: any;

  @ApiProperty({ description: 'Recipe image URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Estimated cost', required: false })
  estimatedCost?: number;

  @ApiProperty({ description: 'Recipe difficulty', required: false })
  difficulty?: string;

  @ApiProperty({ description: 'Recipe tags', required: false })
  tags?: any;

  @ApiProperty({ description: 'Video URL', required: false })
  videoUrl?: string;

  @ApiProperty({ description: 'Whether recipe is public' })
  isPublic: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Number of likes' })
  likeCount: number;

  @ApiProperty({ description: 'Number of comments' })
  commentCount: number;

  @ApiProperty({ description: 'Whether current user has liked this recipe' })
  isLikedByUser: boolean;
}

export class RecipeHistoryResponseDto {
  @ApiProperty({ description: 'Recipe history items', type: [RecipeHistoryItemDto] })
  data: RecipeHistoryItemDto[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class RecipeStatsDto {
  @ApiProperty({ description: 'Total number of recipes' })
  totalRecipes: number;

  @ApiProperty({ description: 'Number of public recipes' })
  publicRecipes: number;

  @ApiProperty({ description: 'Number of private recipes' })
  privateRecipes: number;

  @ApiProperty({ description: 'Total likes across all recipes' })
  totalLikes: number;

  @ApiProperty({ description: 'Total comments across all recipes' })
  totalComments: number;

  @ApiProperty({ description: 'Average calories per recipe' })
  averageCaloriesPerRecipe: number;

  @ApiProperty({ description: 'Most popular recipe', required: false })
  mostPopularRecipe?: {
    id: string;
    title: string;
    likeCount: number;
  };

  @ApiProperty({ description: 'Recent activity statistics' })
  recentActivity: {
    recipesThisWeek: number;
    recipesThisMonth: number;
  };
}

export class PublicRecipeSearchDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: 'Filter by difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiProperty({ description: 'Minimum calories', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCalories?: number;

  @ApiProperty({ description: 'Maximum calories', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCalories?: number;
}
