import { 
  IsArray, 
  IsString, 
  IsOptional, 
  IsUUID, 
  ValidateNested, 
  IsNotEmpty, 
  ArrayMinSize,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecipeIngredientDto {
  @ApiProperty({ example: 'uuid-123', description: 'Ingredient ID from ingredients table' })
  @IsUUID()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: '200', description: 'Quantity as string (e.g., "200", "1.5")' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({ example: 'g', description: 'Unit of measurement (g, pcs, ml, etc.)' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateCoreRecipeDto {
  @ApiProperty({ example: 'Trứng chiên cà chua', description: 'Recipe title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Món ăn nhanh, đơn giản.', description: 'Recipe description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: [
      'Rửa sạch cà chua, thái nhỏ.',
      'Đập trứng ra bát, đánh đều.',
      'Phi hành, xào cà chua.',
      'Đổ trứng vào, chiên vàng hai mặt.'
    ],
    description: 'Array of cooking steps'
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Steps array must not be empty' })
  @IsString({ each: true })
  steps: string[];

  @ApiProperty({ 
    type: [RecipeIngredientDto],
    example: [
      { ingredientId: 'uuid-1', quantity: '200', unit: 'g' },
      { ingredientId: 'uuid-2', quantity: '2', unit: 'pcs' }
    ],
    description: 'Array of recipe ingredients'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  @ApiPropertyOptional({ 
    example: { calories: 350, protein: 25, fat: 20, carbs: 15 },
    description: 'Nutrition information (optional)'
  })
  @IsOptional()
  @IsObject()
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
}

export class UpdateCoreRecipeDto {
  @ApiPropertyOptional({ example: 'Trứng chiên cà chua (cải tiến)', description: 'Recipe title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Món ăn nhanh, đơn giản, bổ dưỡng.', description: 'Recipe description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    example: [
      'Rửa sạch cà chua, thái nhỏ.',
      'Đập trứng ra bát, đánh đều.',
      'Phi hành, xào cà chua.',
      'Đổ trứng vào, chiên vàng hai mặt.',
      'Nêm nếm gia vị vừa ăn.'
    ],
    description: 'Array of cooking steps'
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Steps array must not be empty' })
  @IsString({ each: true })
  @IsOptional()
  steps?: string[];

  @ApiPropertyOptional({ 
    type: [RecipeIngredientDto],
    example: [
      { ingredientId: 'uuid-1', quantity: '250', unit: 'g' },
      { ingredientId: 'uuid-2', quantity: '3', unit: 'pcs' }
    ],
    description: 'Array of recipe ingredients'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  @IsOptional()
  ingredients?: RecipeIngredientDto[];

  @ApiPropertyOptional({ 
    example: { calories: 400, protein: 30, fat: 22, carbs: 18 },
    description: 'Nutrition information (optional)'
  })
  @IsOptional()
  @IsObject()
  nutrition?: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  };
}

export class QueryCoreRecipeDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'trứng', description: 'Search by recipe title' })
  @IsOptional()
  @IsString()
  search?: string;
}
