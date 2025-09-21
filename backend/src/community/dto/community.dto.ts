import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsInt,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
  ArrayMinSize,
  MaxLength,
  MinLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CommunityRecipeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum RecipeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export class RecipeIngredientDto {
  @ApiProperty({ example: 'cà chua', description: 'Ingredient name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '200', description: 'Quantity' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({ example: 'g', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateCommunityRecipeDto {
  @ApiProperty({ 
    example: 'Salad Trộn Đơn Giản',
    description: 'Recipe title' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ 
    example: 'Món ăn healthy, nhanh chóng',
    description: 'Recipe description' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ 
    type: [String],
    example: ['Rửa rau', 'Cắt rau', 'Trộn rau với sốt'],
    description: 'Cooking steps' 
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  steps: string[];

  @ApiProperty({ 
    type: [RecipeIngredientDto],
    example: [{ name: 'rau xà lách', quantity: '100', unit: 'g' }],
    description: 'Recipe ingredients' 
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  @ApiPropertyOptional({ 
    example: 2,
    description: 'Number of servings',
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  servings?: number;

  @ApiPropertyOptional({ 
    example: 15,
    description: 'Preparation time in minutes',
    minimum: 0,
    maximum: 300
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  prepTime?: number;

  @ApiPropertyOptional({ 
    example: 10,
    description: 'Cooking time in minutes',
    minimum: 0,
    maximum: 480
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  cookTime?: number;

  @ApiPropertyOptional({ 
    enum: RecipeDifficulty,
    example: RecipeDifficulty.EASY,
    description: 'Recipe difficulty level' 
  })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ 
    example: 'Vietnamese',
    description: 'Cuisine type' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cuisine?: string;

  @ApiPropertyOptional({ 
    type: [String],
    example: ['healthy', 'quick', 'vegetarian'],
    description: 'Recipe tags' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    example: 'https://example.com/image.jpg',
    description: 'Recipe image URL' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

export class UpdateCommunityRecipeDto {
  @ApiPropertyOptional({ 
    example: 'Updated Recipe Title',
    description: 'Recipe title' 
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ 
    example: 'Updated description',
    description: 'Recipe description' 
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ 
    type: [String],
    example: ['Updated step 1', 'Updated step 2'],
    description: 'Cooking steps' 
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  steps?: string[];

  @ApiPropertyOptional({ 
    type: [RecipeIngredientDto],
    description: 'Recipe ingredients' 
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];

  @ApiPropertyOptional({ 
    enum: CommunityRecipeStatus,
    example: CommunityRecipeStatus.PUBLISHED,
    description: 'Recipe status' 
  })
  @IsOptional()
  @IsEnum(CommunityRecipeStatus)
  status?: CommunityRecipeStatus;

  @ApiPropertyOptional({ example: 4, description: 'Number of servings' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  servings?: number;

  @ApiPropertyOptional({ example: 20, description: 'Preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  prepTime?: number;

  @ApiPropertyOptional({ example: 15, description: 'Cooking time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  cookTime?: number;

  @ApiPropertyOptional({ enum: RecipeDifficulty, description: 'Recipe difficulty' })
  @IsOptional()
  @IsEnum(RecipeDifficulty)
  difficulty?: RecipeDifficulty;

  @ApiPropertyOptional({ example: 'Italian', description: 'Cuisine type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cuisine?: string;

  @ApiPropertyOptional({ type: [String], description: 'Recipe tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Recipe image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

export class CreateCommentDto {
  @ApiProperty({ 
    example: 'uuid-recipe-123',
    description: 'Community recipe ID' 
  })
  @IsUUID()
  @IsNotEmpty()
  communityRecipeId: string;

  @ApiProperty({ 
    example: 'Great recipe! Thanks for sharing.',
    description: 'Comment content' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ 
    example: 'uuid-comment-456',
    description: 'Parent comment ID for replies' 
  })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}

export class CommunityRecipeResponseDto {
  @ApiProperty({ example: 'uuid-recipe-123', description: 'Recipe ID' })
  id: string;

  @ApiProperty({ example: 'uuid-user-456', description: 'Author user ID' })
  userId: string;

  @ApiProperty({ example: 'John Doe', description: 'Author name' })
  authorName: string;

  @ApiProperty({ example: 'Salad Trộn Đơn Giản', description: 'Recipe title' })
  title: string;

  @ApiProperty({ example: 'Món ăn healthy, nhanh chóng', description: 'Recipe description' })
  description: string;

  @ApiProperty({ type: [String], description: 'Cooking steps' })
  steps: string[];

  @ApiProperty({ type: [RecipeIngredientDto], description: 'Recipe ingredients' })
  ingredients: RecipeIngredientDto[];

  @ApiProperty({ example: 'PUBLISHED', description: 'Recipe status' })
  status: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of servings' })
  servings?: number;

  @ApiPropertyOptional({ example: 15, description: 'Prep time in minutes' })
  prepTime?: number;

  @ApiPropertyOptional({ example: 10, description: 'Cook time in minutes' })
  cookTime?: number;

  @ApiPropertyOptional({ example: 'easy', description: 'Difficulty level' })
  difficulty?: string;

  @ApiPropertyOptional({ example: 'Vietnamese', description: 'Cuisine type' })
  cuisine?: string;

  @ApiProperty({ type: [String], description: 'Recipe tags' })
  tags: string[];

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'Image URL' })
  imageUrl?: string;

  @ApiProperty({ example: 15, description: 'Number of likes' })
  likesCount: number;

  @ApiProperty({ example: 8, description: 'Number of comments' })
  commentsCount: number;

  @ApiProperty({ example: false, description: 'Whether current user liked this recipe' })
  isLikedByUser: boolean;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-20T10:35:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class CommentResponseDto {
  @ApiProperty({ example: 'uuid-comment-123', description: 'Comment ID' })
  id: string;

  @ApiProperty({ example: 'uuid-user-456', description: 'Author user ID' })
  userId: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Author name' })
  authorName: string;

  @ApiProperty({ example: 'uuid-recipe-789', description: 'Recipe ID' })
  communityRecipeId: string;

  @ApiProperty({ example: 'Great recipe!', description: 'Comment content' })
  content: string;

  @ApiPropertyOptional({ example: 'uuid-comment-456', description: 'Parent comment ID' })
  parentCommentId?: string;

  @ApiProperty({ type: [CommentResponseDto], description: 'Reply comments' })
  replies: CommentResponseDto[];

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Last update timestamp' })
  updatedAt: string;
}

export class LikeResponseDto {
  @ApiProperty({ example: true, description: 'Whether the recipe is now liked' })
  isLiked: boolean;

  @ApiProperty({ example: 16, description: 'Total likes count after toggle' })
  likesCount: number;
}

export class CreateMealPlanDto {
  @ApiProperty({ 
    example: 'Weekly Meal Plan',
    description: 'Meal plan title' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ 
    example: 'Healthy meals for this week',
    description: 'Meal plan description' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ 
    type: [String],
    example: ['user-id-1', 'user-id-2'],
    description: 'Member user IDs' 
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  members?: string[];

  @ApiPropertyOptional({ 
    type: [String],
    example: ['recipe-id-1', 'recipe-id-2'],
    description: 'Recipe IDs to include in meal plan' 
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  recipes?: string[];

  @ApiPropertyOptional({ 
    example: '2024-01-22T00:00:00Z',
    description: 'Meal plan start date' 
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-28T23:59:59Z',
    description: 'Meal plan end date' 
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
