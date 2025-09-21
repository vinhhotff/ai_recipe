import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateCoreRecipeDto, 
  UpdateCoreRecipeDto, 
  QueryCoreRecipeDto 
} from './dto/core-recipe.dto';

@Injectable()
export class CoreRecipesService {
  constructor(private prisma: PrismaService) {}

  async create(createCoreRecipeDto: CreateCoreRecipeDto) {
    // Validate that all ingredients exist
    await this.validateIngredients(createCoreRecipeDto.ingredients);

    // Use transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Create the recipe
      const recipe = await prisma.coreRecipe.create({
        data: {
          title: createCoreRecipeDto.title,
          description: createCoreRecipeDto.description,
          steps: createCoreRecipeDto.steps,
          nutrition: createCoreRecipeDto.nutrition,
        },
      });

      // Create recipe ingredients
      const recipeIngredients = await Promise.all(
        createCoreRecipeDto.ingredients.map((ingredient) =>
          prisma.coreRecipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ingredient.ingredientId,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            },
          })
        )
      );

      return {
        ...recipe,
        ingredients: recipeIngredients,
      };
    });
  }

  async findAll(query: QueryCoreRecipeDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(search && {
        title: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),
    };

    const [recipes, total] = await Promise.all([
      this.prisma.coreRecipe.findMany({
        where,
        skip,
        take: limit,
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.coreRecipe.count({ where }),
    ]);

    return {
      success: true,
      message: 'Recipes fetched successfully',
      data: recipes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return {
      success: true,
      message: 'Recipe fetched successfully',
      data: recipe,
    };
  }

  async update(id: string, updateCoreRecipeDto: UpdateCoreRecipeDto) {
    // Check if recipe exists
    const existingRecipe = await this.prisma.coreRecipe.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRecipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Validate ingredients if provided
    if (updateCoreRecipeDto.ingredients) {
      await this.validateIngredients(updateCoreRecipeDto.ingredients);
    }

    // Use transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Update recipe basic info
      const recipe = await prisma.coreRecipe.update({
        where: { id },
        data: {
          ...(updateCoreRecipeDto.title && { title: updateCoreRecipeDto.title }),
          ...(updateCoreRecipeDto.description !== undefined && { description: updateCoreRecipeDto.description }),
          ...(updateCoreRecipeDto.steps && { steps: updateCoreRecipeDto.steps }),
          ...(updateCoreRecipeDto.nutrition !== undefined && { nutrition: updateCoreRecipeDto.nutrition }),
        },
      });

      // Update ingredients if provided
      if (updateCoreRecipeDto.ingredients) {
        // Delete existing ingredients
        await prisma.coreRecipeIngredient.deleteMany({
          where: { recipeId: id },
        });

        // Create new ingredients
        await Promise.all(
          updateCoreRecipeDto.ingredients.map((ingredient) =>
            prisma.coreRecipeIngredient.create({
              data: {
                recipeId: id,
                ingredientId: ingredient.ingredientId,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
              },
            })
          )
        );
      }

      // Return updated recipe with ingredients
      const updatedRecipe = await prisma.coreRecipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Recipe updated successfully',
        data: updatedRecipe,
      };
    });
  }

  async remove(id: string) {
    // Check if recipe exists
    const existingRecipe = await this.prisma.coreRecipe.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingRecipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Soft delete
    await this.prisma.coreRecipe.update({
      where: { id },
      data: { isDeleted: true },
    });

    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
  }

  // Get all ingredients for dropdown/selection
  async getIngredients() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      message: 'Ingredients fetched successfully',
      data: ingredients,
    };
  }

  // Helper method to validate ingredients exist
  private async validateIngredients(ingredients: { ingredientId: string }[]) {
    const ingredientIds = ingredients.map((ing) => ing.ingredientId);
    const existingIngredients = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        isDeleted: false,
      },
    });

    if (existingIngredients.length !== ingredientIds.length) {
      const existingIds = existingIngredients.map((ing) => ing.id);
      const missingIds = ingredientIds.filter((id) => !existingIds.includes(id));
      throw new BadRequestException(
        `The following ingredient IDs do not exist: ${missingIds.join(', ')}`
      );
    }
  }
}
