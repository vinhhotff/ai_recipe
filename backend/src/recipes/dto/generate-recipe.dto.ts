import { 
  IsArray, 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEnum, 
  IsBoolean,
  IsIn 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Diet } from '@prisma/client';

// Enum for difficulty levels to match frontend
enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export class GenerateRecipeDto {
  @ApiProperty({ 
    example: ['chicken', 'rice', 'tomato'], 
    description: 'Array of ingredient names or IDs' 
  })
  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @ApiProperty({ 
    example: 'NONE', 
    enum: Diet, 
    description: 'Dietary restriction preference',
    required: false 
  })
  @IsOptional()
  @IsEnum(Diet)
  diet?: Diet;

  @ApiProperty({ 
    example: 'en', 
    description: 'Locale for recipe language (e.g., en, vi-VN)',
    required: false 
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether to generate recipe image',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  imageGeneration?: boolean;

  // New fields to match frontend
  @ApiProperty({ 
    example: 30, 
    description: 'Maximum cooking time in minutes',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  maxCookingTime?: number;

  @ApiProperty({ 
    example: 'Asian', 
    description: 'Cuisine type (e.g., Asian, Italian, Vietnamese)',
    required: false 
  })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiProperty({ 
    example: 'easy', 
    enum: DifficultyLevel,
    description: 'Recipe difficulty level',
    required: false 
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ 
    example: 4, 
    description: 'Number of servings',
    required: false,
    default: 2 
  })
  @IsOptional()
  @IsNumber()
  servings?: number;

  @ApiProperty({ 
    example: ['vegetarian', 'gluten-free'], 
    description: 'Array of dietary restrictions',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  // Keep existing optional fields for backward compatibility
  @ApiProperty({ example: 600, required: false })
  @IsOptional()
  @IsNumber()
  calories?: number;

  @ApiProperty({ 
    example: 30, 
    required: false,
    description: 'Deprecated: use maxCookingTime instead' 
  })
  @IsOptional()
  @IsNumber()
  maxTimeMinutes?: number;

  @ApiProperty({ example: ['peanut'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];

  @ApiProperty({ example: 100000, required: false })
  @IsOptional()
  @IsNumber()
  budgetVND?: number;
}

// Export the enum for use in other files
export { DifficultyLevel };
