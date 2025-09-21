import { 
  IsArray, 
  IsString, 
  IsOptional, 
  ValidateNested, 
  IsNotEmpty, 
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  IsDecimal
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Diet {
  NONE = 'none',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  KETO = 'keto',
  PALEO = 'paleo',
  PESCETARIAN = 'pescetarian',
  HALAL = 'halal'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export enum Currency {
  VND = 'VND',
  USD = 'USD'
}

export class InputIngredientDto {
  @ApiProperty({ example: 'cà chua', description: 'Ingredient name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '200', description: 'Quantity as string' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({ example: 'g', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class RecipePreferencesDto {
  @ApiPropertyOptional({ 
    enum: Diet, 
    example: Diet.VEGETARIAN, 
    description: 'Dietary preference' 
  })
  @IsOptional()
  @IsEnum(Diet)
  diet?: Diet;

  @ApiPropertyOptional({ 
    enum: Difficulty, 
    example: Difficulty.EASY, 
    description: 'Recipe difficulty level' 
  })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ 
    example: 30, 
    description: 'Time limit in minutes',
    minimum: 5,
    maximum: 300
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(300)
  timeLimit?: number;

  @ApiPropertyOptional({ 
    example: 2, 
    description: 'Number of servings',
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  servings?: number;

  @ApiPropertyOptional({ 
    example: ['nhanh', 'đơn giản'], 
    description: 'Additional preferences or tags'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class GenerateRecipeDto {
  @ApiProperty({ 
    type: [InputIngredientDto],
    description: 'List of ingredients to use in recipe generation',
    example: [
      { name: 'cà chua', quantity: '200', unit: 'g' },
      { name: 'trứng gà', quantity: '2', unit: 'pcs' }
    ]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ingredient is required' })
  @ValidateNested({ each: true })
  @Type(() => InputIngredientDto)
  ingredients: InputIngredientDto[];

  @ApiPropertyOptional({ 
    type: RecipePreferencesDto,
    description: 'Recipe generation preferences' 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipePreferencesDto)
  preferences?: RecipePreferencesDto;

  @ApiPropertyOptional({ 
    enum: Currency, 
    example: Currency.VND, 
    description: 'Currency for cost calculation' 
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.VND;
}

export class GeneratedIngredientDto {
  @ApiProperty({ example: 'Cà chua', description: 'Ingredient name' })
  ingredientName: string;

  @ApiProperty({ example: '200', description: 'Required quantity' })
  quantity: string;

  @ApiProperty({ example: 'g', description: 'Unit of measurement' })
  unit: string;

  @ApiPropertyOptional({ example: '25.50', description: 'Price per unit (if available)' })
  pricePerUnit?: string;

  @ApiPropertyOptional({ example: '12750.00', description: 'Total cost for this ingredient' })
  totalCost?: string;

  @ApiProperty({ example: 'VND', description: 'Currency' })
  currency: string;

  @ApiProperty({ example: false, description: 'Whether pricing info is missing' })
  missingPrice: boolean;
}

export class GeneratedNutritionDto {
  @ApiPropertyOptional({ example: 320, description: 'Total calories' })
  calories?: number;

  @ApiPropertyOptional({ example: 18, description: 'Protein in grams' })
  protein?: number;

  @ApiPropertyOptional({ example: 22, description: 'Fat in grams' })
  fat?: number;

  @ApiPropertyOptional({ example: 15, description: 'Carbohydrates in grams' })
  carbs?: number;

  @ApiPropertyOptional({ example: 4, description: 'Fiber in grams' })
  fiber?: number;
}

export class GeneratedRecipeResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'Generated recipe ID' })
  recipeId: string;

  @ApiProperty({ example: 'Trứng chiên cà chua', description: 'Recipe title' })
  title: string;

  @ApiProperty({ 
    example: ['Rửa sạch cà chua, thái nhỏ', 'Đánh trứng', 'Xào cà chua', 'Đổ trứng vào chiên'],
    description: 'Cooking steps'
  })
  steps: string[];

  @ApiProperty({ 
    type: [GeneratedIngredientDto],
    description: 'Recipe ingredients with pricing' 
  })
  ingredients: GeneratedIngredientDto[];

  @ApiProperty({ example: '35000.00', description: 'Total recipe cost' })
  totalCost: string;

  @ApiProperty({ example: 'VND', description: 'Currency' })
  currency: string;

  @ApiPropertyOptional({ 
    type: GeneratedNutritionDto,
    description: 'Nutrition information' 
  })
  nutrition?: GeneratedNutritionDto;

  @ApiProperty({ example: 2, description: 'Number of servings' })
  servings: number;

  @ApiProperty({ example: 15, description: 'Estimated cooking time in minutes' })
  estimatedTime: number;

  @ApiProperty({ example: 'easy', description: 'Difficulty level' })
  difficulty: string;

  @ApiProperty({ example: false, description: 'Whether any ingredients have missing pricing' })
  hasMissingPrices: boolean;

  @ApiProperty({ 
    example: [], 
    description: 'Ingredient names with missing pricing'
  })
  missingPriceIngredients: string[];

  @ApiProperty({ example: '2024-09-19T16:55:00Z', description: 'Generation timestamp' })
  generatedAt: string;

  @ApiProperty({ example: 1250, description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

export class GenerateRecipeJobStatusDto {
  @ApiProperty({ example: 'uuid-456', description: 'Job ID' })
  jobId: string;

  @ApiProperty({ example: 'processing', description: 'Job status' })
  status: string;

  @ApiPropertyOptional({ 
    type: GeneratedRecipeResponseDto,
    description: 'Recipe result (when completed)' 
  })
  result?: GeneratedRecipeResponseDto;

  @ApiPropertyOptional({ example: 'Error message if failed', description: 'Error message' })
  errorMessage?: string;

  @ApiProperty({ example: '2024-09-19T16:55:00Z', description: 'Job creation time' })
  createdAt: string;

  @ApiPropertyOptional({ example: '2024-09-19T16:55:10Z', description: 'Job completion time' })
  completedAt?: string;
}

export class SuggestionHistoryDto {
  @ApiProperty({ example: 'uuid-789', description: 'Suggestion log ID' })
  id: string;

  @ApiProperty({ 
    example: [{ name: 'cà chua', quantity: '200', unit: 'g' }],
    description: 'Input ingredients used'
  })
  inputIngredients: InputIngredientDto[];

  @ApiPropertyOptional({ 
    type: RecipePreferencesDto,
    description: 'Preferences used' 
  })
  preferences?: RecipePreferencesDto;

  @ApiProperty({ example: 'done', description: 'Generation status' })
  status: string;

  @ApiPropertyOptional({ example: 'Trứng chiên cà chua', description: 'Generated recipe title' })
  recipeTitle?: string;

  @ApiProperty({ example: '35000.00', description: 'Total cost' })
  totalCost?: string;

  @ApiProperty({ example: '2024-09-19T16:55:00Z', description: 'Creation time' })
  createdAt: string;

  @ApiPropertyOptional({ example: '2024-09-19T16:55:10Z', description: 'Completion time' })
  completedAt?: string;
}
