import { 
  IsOptional, 
  IsString, 
  IsInt, 
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  Max
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CommunityRecipeStatus, RecipeDifficulty } from './community.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum RecipeSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  LIKES_COUNT = 'likesCount',
  COMMENTS_COUNT = 'commentsCount',
  PREP_TIME = 'prepTime',
  COOK_TIME = 'cookTime'
}

export enum CommentSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt'
}

export class CommunityRecipeQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number (starts from 1)',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    example: 12, 
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @ApiPropertyOptional({ 
    example: 'chicken salad',
    description: 'Search term for recipe title or description'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    enum: CommunityRecipeStatus,
    example: CommunityRecipeStatus.PUBLISHED,
    description: 'Filter by recipe status'
  })
  @IsOptional()
  @IsEnum(CommunityRecipeStatus)
  status?: CommunityRecipeStatus;

  @ApiPropertyOptional({ 
    enum: RecipeDifficulty,
    example: RecipeDifficulty.EASY,
    description: 'Filter by difficulty level'
  })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ 
    example: 'Vietnamese',
    description: 'Filter by cuisine type'
  })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ 
    example: 'healthy,quick',
    description: 'Filter by tags (comma-separated)'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.split(',').map((tag: string) => tag.trim()) : [])
  tags?: string[];

  @ApiPropertyOptional({ 
    example: 'uuid-user-123',
    description: 'Filter by author user ID'
  })
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiPropertyOptional({ 
    example: 30,
    description: 'Maximum preparation time in minutes'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrepTime?: number;

  @ApiPropertyOptional({ 
    example: 60,
    description: 'Maximum cooking time in minutes'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCookTime?: number;

  @ApiPropertyOptional({ 
    example: 4,
    description: 'Maximum number of servings'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxServings?: number;

  @ApiPropertyOptional({ 
    example: 2,
    description: 'Minimum number of servings'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minServings?: number;

  @ApiPropertyOptional({ 
    enum: RecipeSortBy,
    example: RecipeSortBy.CREATED_AT,
    description: 'Sort by field'
  })
  @IsOptional()
  @IsEnum(RecipeSortBy)
  sortBy?: RecipeSortBy = RecipeSortBy.CREATED_AT;

  @ApiPropertyOptional({ 
    enum: SortOrder,
    example: SortOrder.DESC,
    description: 'Sort order'
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ 
    example: 'true',
    description: 'Show only recipes liked by current user'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  likedByMe?: boolean;

  @ApiPropertyOptional({ 
    example: 'true',
    description: 'Show only recipes created by current user'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  myRecipes?: boolean;
}

export class CommentQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number (starts from 1)',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    enum: CommentSortBy,
    example: CommentSortBy.CREATED_AT,
    description: 'Sort by field'
  })
  @IsOptional()
  @IsEnum(CommentSortBy)
  sortBy?: CommentSortBy = CommentSortBy.CREATED_AT;

  @ApiPropertyOptional({ 
    enum: SortOrder,
    example: SortOrder.ASC,
    description: 'Sort order'
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @ApiPropertyOptional({ 
    example: 'true',
    description: 'Include nested replies'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  includeReplies?: boolean = true;
}

export class UserRecipeStatsDto {
  @ApiPropertyOptional({ 
    example: 'uuid-user-123',
    description: 'User ID to get stats for (if not provided, uses current user)'
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CommunityStatsResponseDto {
  @ApiPropertyOptional({ example: 25, description: 'Total recipes created by user' })
  totalRecipes: number;

  @ApiPropertyOptional({ example: 12, description: 'Published recipes count' })
  publishedRecipes: number;

  @ApiPropertyOptional({ example: 3, description: 'Draft recipes count' })
  draftRecipes: number;

  @ApiPropertyOptional({ example: 145, description: 'Total likes received' })
  totalLikesReceived: number;

  @ApiPropertyOptional({ example: 67, description: 'Total comments received' })
  totalCommentsReceived: number;

  @ApiPropertyOptional({ example: 89, description: 'Total recipes liked by user' })
  totalLikesGiven: number;

  @ApiPropertyOptional({ example: 34, description: 'Total comments made by user' })
  totalCommentsMade: number;

  @ApiPropertyOptional({ example: 'Vietnamese', description: 'Most used cuisine type' })
  mostUsedCuisine?: string;

  @ApiPropertyOptional({ example: 'easy', description: 'Most used difficulty level' })
  mostUsedDifficulty?: string;

  @ApiPropertyOptional({ example: 18.5, description: 'Average preparation time' })
  avgPrepTime?: number;

  @ApiPropertyOptional({ example: 25.3, description: 'Average cooking time' })
  avgCookTime?: number;
}

export class TrendingRecipesQueryDto {
  @ApiPropertyOptional({ 
    example: 7, 
    description: 'Number of days to look back for trending',
    minimum: 1,
    maximum: 30
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number = 7;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of trending recipes to return',
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    enum: RecipeDifficulty,
    description: 'Filter trending by difficulty'
  })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ 
    example: 'Vietnamese',
    description: 'Filter trending by cuisine'
  })
  @IsOptional()
  @IsString()
  cuisine?: string;
}

export class RecipeRecommendationQueryDto {
  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of recommendations to return',
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    example: 'uuid-recipe-123',
    description: 'Base recipe ID for similarity recommendations'
  })
  @IsOptional()
  @IsUUID()
  similarTo?: string;

  @ApiPropertyOptional({ 
    example: 'true',
    description: 'Include recipes from users I follow'
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  fromFollowing?: boolean;
}
