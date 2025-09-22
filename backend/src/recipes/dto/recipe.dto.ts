import { IsString, IsInt, IsOptional, IsArray, IsBoolean, IsObject, Min, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateRecipeDto {
  @ApiProperty({ example: 'Spaghetti Carbonara' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'A classic Italian pasta dish with eggs and cheese' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  servings: number;

  @ApiPropertyOptional({ example: 450 })
  @IsInt()
  @IsOptional()
  @Min(0)
  totalCalories?: number;

  @ApiPropertyOptional({ example: 112 })
  @IsInt()
  @IsOptional()
  @Min(0)
  caloriesPer?: number;

  @ApiProperty({ 
    example: [
      { name: 'Spaghetti', quantity: '400g', unit: 'g' },
      { name: 'Eggs', quantity: '4', unit: 'pcs' }
    ],
    description: 'Array of ingredients with name, quantity, and unit'
  })
  @IsArray()
  @IsObject({ each: true })
  ingredients: Array<{ name: string; quantity: string; unit: string }>;

  @ApiProperty({ 
    example: [
      'Boil water in a large pot',
      'Cook spaghetti according to package instructions',
      'Mix eggs and cheese in a bowl',
      'Combine hot pasta with egg mixture'
    ],
    description: 'Array of cooking steps'
  })
  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @ApiPropertyOptional({ 
    example: { calories: 450, protein: 20, fat: 15, carbs: 60, fiber: 3 },
    description: 'Nutrition information'
  })
  @IsObject()
  @IsOptional()
  nutrition?: object;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/video.mp4' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 15.50 })
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 'medium', enum: ['easy', 'medium', 'hard'] })
  @IsString()
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional({ 
    example: ['Italian', 'Pasta', 'Comfort Food'],
    description: 'Array of tags for categorization'
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Italian' })
  @IsString()
  @IsOptional()
  cuisine?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsInt()
  @IsOptional()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  @Min(0)
  cookTime?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  createdByAI?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateRecipeDto {
  @ApiPropertyOptional({ example: 'Updated Spaghetti Carbonara' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'An updated classic Italian pasta dish' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsInt()
  @IsOptional()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsInt()
  @IsOptional()
  @Min(0)
  totalCalories?: number;

  @ApiPropertyOptional({ example: 125 })
  @IsInt()
  @IsOptional()
  @Min(0)
  caloriesPer?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  steps?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  nutrition?: object;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-video.mp4' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 18.00 })
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 'hard' })
  @IsString()
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Mediterranean' })
  @IsString()
  @IsOptional()
  cuisine?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsInt()
  @IsOptional()
  @Min(0)
  cookTime?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class QueryRecipesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'pasta' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Italian' })
  @IsString()
  @IsOptional()
  cuisine?: string;

  @ApiPropertyOptional({ example: 'easy' })
  @IsString()
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional({ example: 'Healthy,Vegetarian' })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiPropertyOptional({ example: 'createdAt', enum: ['createdAt', 'title', 'totalCalories', 'difficulty'] })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  createdByAI?: boolean;
}

export class GenerateRecipeDto {
  @ApiProperty({ 
    example: ['chicken breast', 'broccoli', 'rice'],
    description: 'List of available ingredients'
  })
  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @ApiPropertyOptional({ example: 'Italian' })
  @IsString()
  @IsOptional()
  cuisine?: string;

  @ApiPropertyOptional({ example: 'easy' })
  @IsString()
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsInt()
  @IsOptional()
  @Min(1)
  servings?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @IsOptional()
  @Min(5)
  maxTime?: number;

  @ApiPropertyOptional({ example: 'vegetarian' })
  @IsString()
  @IsOptional()
  dietaryRestrictions?: string;

  @ApiPropertyOptional({ example: ['Healthy', 'Quick'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredTags?: string[];
}
