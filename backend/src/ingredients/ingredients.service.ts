import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  CreateIngredientDto, 
  UpdateIngredientDto, 
  ComputeRecipeCostDto,
  RecipeCostResponse,
  IngredientCostBreakdown,
  Currency,
  Unit
} from './dto/ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  // Unit conversion factors to grams/ml (base units)
  private readonly unitConversions: Record<string, { factor: number; type: 'weight' | 'volume' | 'count' }> = {
    // Weight units
    'g': { factor: 1, type: 'weight' },
    'kg': { factor: 1000, type: 'weight' },
    // Volume units  
    'ml': { factor: 1, type: 'volume' },
    'l': { factor: 1000, type: 'volume' },
    // Count units
    'pcs': { factor: 1, type: 'count' },
    // Traditional units (approximate conversions)
    'tsp': { factor: 5, type: 'volume' }, // 1 tsp = 5ml
    'tbsp': { factor: 15, type: 'volume' }, // 1 tbsp = 15ml
    'cup': { factor: 240, type: 'volume' }, // 1 cup = 240ml
  };

  async create(createIngredientDto: CreateIngredientDto) {
    try {
      const ingredient = await this.prisma.ingredient.create({
        data: {
          name: createIngredientDto.name,
          description: createIngredientDto.description,
          canonicalUnit: createIngredientDto.canonicalUnit,
          basePrice: createIngredientDto.basePrice ? new Decimal(createIngredientDto.basePrice) : null,
          currency: createIngredientDto.currency || Currency.VND,
          available: createIngredientDto.available ?? true,
          metadata: createIngredientDto.metadata,
        },
      });
      
      // Invalidate cache after creating new ingredient
      await this.cacheService.del(CacheService.KEYS.INGREDIENTS);
      
      return {
        success: true,
        message: 'Ingredient created successfully',
        data: ingredient,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ingredient with this name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    const ingredients = await this.cacheService.getOrSet(
      CacheService.KEYS.INGREDIENTS,
      async () => {
        return await this.prisma.ingredient.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        });
      },
      CacheService.TTL.LONG // 15 minutes
    );

    return {
      success: true,
      message: 'Ingredients fetched successfully',
      data: ingredients,
    };
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, isDeleted: false },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return {
      success: true,
      message: 'Ingredient fetched successfully',
      data: ingredient,
    };
  }

  async update(id: string, updateIngredientDto: UpdateIngredientDto) {
    const existingIngredient = await this.prisma.ingredient.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingIngredient) {
      throw new NotFoundException('Ingredient not found');
    }

    try {
      const ingredient = await this.prisma.ingredient.update({
        where: { id },
        data: {
          ...(updateIngredientDto.name && { name: updateIngredientDto.name }),
          ...(updateIngredientDto.description !== undefined && { description: updateIngredientDto.description }),
          ...(updateIngredientDto.canonicalUnit && { canonicalUnit: updateIngredientDto.canonicalUnit }),
          ...(updateIngredientDto.basePrice !== undefined && { 
            basePrice: updateIngredientDto.basePrice ? new Decimal(updateIngredientDto.basePrice) : null 
          }),
          ...(updateIngredientDto.currency && { currency: updateIngredientDto.currency }),
          ...(updateIngredientDto.available !== undefined && { available: updateIngredientDto.available }),
          ...(updateIngredientDto.metadata !== undefined && { metadata: updateIngredientDto.metadata }),
        },
      });

      // Invalidate cache after updating ingredient
      await this.cacheService.del(CacheService.KEYS.INGREDIENTS);

      return {
        success: true,
        message: 'Ingredient updated successfully',
        data: ingredient,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Ingredient with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const existingIngredient = await this.prisma.ingredient.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingIngredient) {
      throw new NotFoundException('Ingredient not found');
    }

    await this.prisma.ingredient.update({
      where: { id },
      data: { 
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Invalidate cache after deleting ingredient
    await this.cacheService.del(CacheService.KEYS.INGREDIENTS);

    return {
      success: true,
      message: 'Ingredient deleted successfully',
    };
  }

  /**
   * Get price per unit for an ingredient in a specific currency
   */
  async getPricePerUnit(ingredientId: string, targetUnit: string, currency: Currency = Currency.VND): Promise<Decimal | null> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, isDeleted: false, available: true },
    });

    if (!ingredient || !ingredient.basePrice) {
      return null;
    }

    // Convert price from canonical unit to target unit
    const pricePerCanonicalUnit = new Decimal(ingredient.basePrice);
    const canonicalConversion = this.unitConversions[ingredient.canonicalUnit];
    const targetConversion = this.unitConversions[targetUnit];

    if (!canonicalConversion || !targetConversion) {
      throw new BadRequestException(`Invalid unit: ${targetUnit} or ${ingredient.canonicalUnit}`);
    }

    // Ensure unit types are compatible (weight vs volume vs count)
    if (canonicalConversion.type !== targetConversion.type) {
      throw new BadRequestException(
        `Cannot convert between ${ingredient.canonicalUnit} (${canonicalConversion.type}) and ${targetUnit} (${targetConversion.type})`
      );
    }

    // Calculate price per target unit
    const canonicalToBase = canonicalConversion.factor;
    const targetToBase = targetConversion.factor;
    
    // Price per base unit = basePrice / canonicalToBase
    // Price per target unit = pricePerBase * targetToBase
    const pricePerTargetUnit = pricePerCanonicalUnit
      .dividedBy(canonicalToBase)
      .mul(targetToBase);

    // Handle currency conversion (for now, just return as is)
    // In future, could add currency conversion rates
    return pricePerTargetUnit;
  }

  /**
   * Compute total cost for a recipe
   */
  async computeRecipeCost(computeRecipeCostDto: ComputeRecipeCostDto): Promise<RecipeCostResponse> {
    const { ingredients, currency = Currency.VND } = computeRecipeCostDto;
    
    const ingredientBreakdowns: IngredientCostBreakdown[] = [];
    const missingPriceIngredients: string[] = [];
    let totalCost = new Decimal(0);

    for (const ingredientData of ingredients) {
      const ingredient = await this.prisma.ingredient.findFirst({
        where: { id: ingredientData.ingredientId, isDeleted: false },
      });

      if (!ingredient) {
        throw new NotFoundException(`Ingredient with ID ${ingredientData.ingredientId} not found`);
      }

      const quantity = new Decimal(ingredientData.quantity);
      let pricePerUnit: Decimal | null = null;
      let ingredientTotalCost = new Decimal(0);
      let missingPrice = false;

      try {
        pricePerUnit = await this.getPricePerUnit(
          ingredientData.ingredientId, 
          ingredientData.unit, 
          currency
        );

        if (pricePerUnit) {
          ingredientTotalCost = pricePerUnit.mul(quantity);
          totalCost = totalCost.plus(ingredientTotalCost);
        } else {
          missingPrice = true;
          missingPriceIngredients.push(ingredientData.ingredientId);
        }
      } catch (error) {
        missingPrice = true;
        missingPriceIngredients.push(ingredientData.ingredientId);
      }

      ingredientBreakdowns.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: quantity.toFixed(),
        unit: ingredientData.unit,
        pricePerUnit: pricePerUnit ? pricePerUnit.toFixed(2) : '0',
        totalCost: ingredientTotalCost.toFixed(2),
        currency,
        missingPrice,
      });
    }

    return {
      ingredients: ingredientBreakdowns,
      totalCost: totalCost.toFixed(2),
      currency,
      hasMissingPrices: missingPriceIngredients.length > 0,
      missingPriceIngredients,
    };
  }

  /**
   * Normalize unit names (helper method)
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    const unitMap: Record<string, string> = {
      'grams': 'g',
      'gram': 'g',
      'kilograms': 'kg',
      'kilogram': 'kg',
      'milliliters': 'ml',
      'milliliter': 'ml',
      'liters': 'l',
      'liter': 'l',
      'pieces': 'pcs',
      'piece': 'pcs',
      'teaspoon': 'tsp',
      'teaspoons': 'tsp',
      'tablespoon': 'tbsp',
      'tablespoons': 'tbsp',
      'cups': 'cup',
    };
    
    return unitMap[normalized] || normalized;
  }

  /**
   * Validate unit compatibility
   */
  private validateUnitCompatibility(unit1: string, unit2: string): boolean {
    const conversion1 = this.unitConversions[unit1];
    const conversion2 = this.unitConversions[unit2];
    
    if (!conversion1 || !conversion2) {
      return false;
    }
    
    return conversion1.type === conversion2.type;
  }

  /**
   * Get available units by type
   */
  getAvailableUnits(): Record<string, string[]> {
    const unitsByType: Record<string, string[]> = {
      weight: [],
      volume: [],
      count: [],
    };

    Object.entries(this.unitConversions).forEach(([unit, info]) => {
      unitsByType[info.type].push(unit);
    });

    return unitsByType;
  }
}
