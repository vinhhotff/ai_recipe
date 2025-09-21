import { 
  IsArray, 
  IsString, 
  IsOptional, 
  IsUUID, 
  ValidateNested, 
  IsNotEmpty, 
  IsNumber,
  IsDecimal,
  IsBoolean,
  IsEnum,
  IsObject,
  Min
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

enum Currency {
  VND = 'VND',
  USD = 'USD'
}

enum Unit {
  // Weight
  G = 'g',
  KG = 'kg',
  // Volume
  ML = 'ml',
  L = 'l',
  // Count
  PCS = 'pcs',
  // Traditional
  TSP = 'tsp',
  TBSP = 'tbsp',
  CUP = 'cup'
}

export class CreateIngredientDto {
  @ApiProperty({ example: 'Cà chua', description: 'Ingredient name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Fresh red tomatoes', description: 'Ingredient description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'kg', enum: Unit, description: 'Canonical unit for pricing' })
  @IsEnum(Unit)
  canonicalUnit: Unit;

  @ApiPropertyOptional({ 
    example: '25000', 
    description: 'Base price per canonical unit (as decimal string)',
    type: 'string'
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Transform(({ value }) => value ? new Decimal(value).toString() : undefined)
  basePrice?: string;

  @ApiPropertyOptional({ example: 'VND', enum: Currency, description: 'Price currency' })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.VND;

  @ApiPropertyOptional({ example: true, description: 'Whether ingredient is available' })
  @IsOptional()
  @IsBoolean()
  available?: boolean = true;

  @ApiPropertyOptional({ 
    example: { supplier: 'Local market', notes: 'Seasonal price varies' },
    description: 'Additional metadata'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional({ example: 'Cà chua cherry', description: 'Ingredient name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Sweet cherry tomatoes', description: 'Ingredient description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'kg', enum: Unit, description: 'Canonical unit for pricing' })
  @IsOptional()
  @IsEnum(Unit)
  canonicalUnit?: Unit;

  @ApiPropertyOptional({ 
    example: '30000', 
    description: 'Base price per canonical unit (as decimal string)',
    type: 'string'
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Transform(({ value }) => value ? new Decimal(value).toString() : undefined)
  basePrice?: string;

  @ApiPropertyOptional({ example: 'VND', enum: Currency, description: 'Price currency' })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ example: false, description: 'Whether ingredient is available' })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ 
    example: { supplier: 'Premium store', notes: 'Organic certified' },
    description: 'Additional metadata'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddRecipeIngredientDto {
  @ApiProperty({ example: 'uuid-123', description: 'Ingredient ID' })
  @IsUUID()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ 
    example: '500', 
    description: 'Quantity as decimal string',
    type: 'string'
  })
  @IsDecimal({ decimal_digits: '0,3' })
  @Transform(({ value }) => new Decimal(value).toString())
  quantity: string;

  @ApiProperty({ example: 'g', enum: Unit, description: 'Unit of measurement' })
  @IsEnum(Unit)
  unit: Unit;
}

export class ComputeRecipeCostDto {
  @ApiProperty({ 
    type: [AddRecipeIngredientDto],
    description: 'List of ingredients with quantities'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddRecipeIngredientDto)
  ingredients: AddRecipeIngredientDto[];

  @ApiPropertyOptional({ 
    example: 'VND', 
    enum: Currency, 
    description: 'Currency to calculate cost in'
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency = Currency.VND;
}

export class IngredientCostBreakdown {
  @ApiProperty({ example: 'uuid-123', description: 'Ingredient ID' })
  ingredientId: string;

  @ApiProperty({ example: 'Cà chua', description: 'Ingredient name' })
  ingredientName: string;

  @ApiProperty({ example: '500', description: 'Quantity used' })
  quantity: string;

  @ApiProperty({ example: 'g', description: 'Unit used' })
  unit: string;

  @ApiProperty({ example: '25', description: 'Price per unit' })
  pricePerUnit: string;

  @ApiProperty({ example: '12500', description: 'Total cost for this ingredient' })
  totalCost: string;

  @ApiProperty({ example: 'VND', description: 'Currency' })
  currency: string;

  @ApiProperty({ example: false, description: 'Whether pricing info is missing' })
  missingPrice: boolean;
}

export class RecipeCostResponse {
  @ApiProperty({ 
    type: [IngredientCostBreakdown],
    description: 'Cost breakdown per ingredient'
  })
  ingredients: IngredientCostBreakdown[];

  @ApiProperty({ example: '50000', description: 'Total recipe cost' })
  totalCost: string;

  @ApiProperty({ example: 'VND', description: 'Currency' })
  currency: string;

  @ApiProperty({ example: false, description: 'Whether any ingredients have missing pricing' })
  hasMissingPrices: boolean;

  @ApiProperty({ 
    example: ['uuid-456'], 
    description: 'IDs of ingredients with missing prices'
  })
  missingPriceIngredients: string[];
}

export { Currency, Unit };
