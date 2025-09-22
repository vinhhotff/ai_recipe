import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIRecipeService } from './ai-recipe.service';
import { CreateRecipeDto, UpdateRecipeDto, QueryRecipesDto, GenerateRecipeDto } from '../dto/recipe.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class RecipeService {
  private readonly logger = new Logger(RecipeService.name);

  constructor(
    private prisma: PrismaService,
    private aiRecipeService: AIRecipeService,
  ) {}

  async findAll(query: QueryRecipesDto, user?: User) {
    const { page, limit, search, cuisine, difficulty, tags, sortBy, sortOrder, createdByAI } = query;
    const skip = (page - 1) * limit;

    // Build where conditions
    const where: any = {
      isDeleted: false,
      isPublic: true, // Only show public recipes by default
    };

    // Admin can see all recipes, Member can see their own private recipes too
    if (user?.role === 'ADMIN') {
      delete where.isPublic; // Admin sees all recipes
    } else if (user?.role === 'MEMBER') {
      where.OR = [
        { isPublic: true },
        { createdById: user.id } // Member sees their own recipes too
      ];
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cuisine) {
      where.cuisine = { contains: cuisine, mode: 'insensitive' };
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      where.tags = {
        path: '$',
        array_contains: tagArray
      };
    }

    if (createdByAI !== undefined) {
      where.createdByAI = createdByAI;
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'title' || sortBy === 'totalCalories' || sortBy === 'difficulty') {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    try {
      const [recipes, total] = await Promise.all([
        this.prisma.recipe.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                savedBy: true,
              },
            },
          },
        }),
        this.prisma.recipe.count({ where }),
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
    } catch (error) {
      this.logger.error('Error fetching recipes:', error);
      throw error;
    }
  }

  async findOne(id: string, user?: User) {
    const recipe = await this.prisma.recipe.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          where: { isDeleted: false },
          include: {
            user: {
              select: { id: true, name: true },
            },
            replies: {
              where: { isDeleted: false },
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        likes: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            savedBy: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if user can access this recipe
    if (!recipe.isPublic) {
      if (!user) {
        throw new ForbiddenException('This recipe is private');
      }
      
      if (user.role !== 'ADMIN' && recipe.createdById !== user.id) {
        throw new ForbiddenException('You do not have access to this recipe');
      }
    }

    // Add user-specific data if authenticated
    let userInteractions = null;
    if (user) {
      const [isLiked, isSaved] = await Promise.all([
        this.prisma.recipeLike.findFirst({
          where: { userId: user.id, recipeId: id },
        }),
        this.prisma.savedRecipe.findFirst({
          where: { userId: user.id, recipeId: id },
        }),
      ]);

      userInteractions = {
        isLiked: !!isLiked,
        isSaved: !!isSaved,
      };
    }

    return {
      success: true,
      message: 'Recipe fetched successfully',
      data: {
        ...recipe,
        userInteractions,
      },
    };
  }

  async create(dto: CreateRecipeDto, user: User) {
    // Generate slug from title
    const slug = this.generateSlug(dto.title);

    // Check if slug already exists
    const existingSlug = await this.prisma.recipe.findFirst({
      where: { slug, isDeleted: false },
    });

    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    try {
      const recipe = await this.prisma.recipe.create({
        data: {
          ...dto,
          slug: finalSlug,
          createdById: user.id,
          caloriesPer: dto.totalCalories && dto.servings ? Math.round(dto.totalCalories / dto.servings) : dto.caloriesPer,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return {
        success: true,
        message: 'Recipe created successfully',
        data: recipe,
      };
    } catch (error) {
      this.logger.error('Error creating recipe:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateRecipeDto, user: User) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check permissions
    if (user.role !== 'ADMIN' && recipe.createdById !== user.id) {
      throw new ForbiddenException('You can only edit your own recipes');
    }

    // Generate new slug if title is being updated
    let updateData: any = { ...dto };
    if (dto.title && dto.title !== recipe.title) {
      updateData.slug = this.generateSlug(dto.title);
      
      // Check for slug conflicts
      const existingSlug = await this.prisma.recipe.findFirst({
        where: { slug: updateData.slug, id: { not: id }, isDeleted: false },
      });
      
      if (existingSlug) {
        updateData.slug = `${updateData.slug}-${Date.now()}`;
      }
    }

    // Recalculate calories per serving if needed
    if ((dto.totalCalories || dto.servings) && (dto.totalCalories || recipe.totalCalories) && (dto.servings || recipe.servings)) {
      const totalCal = dto.totalCalories || recipe.totalCalories;
      const servings = dto.servings || recipe.servings;
      updateData.caloriesPer = Math.round(totalCal / servings);
    }

    try {
      const updatedRecipe = await this.prisma.recipe.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return {
        success: true,
        message: 'Recipe updated successfully',
        data: updatedRecipe,
      };
    } catch (error) {
      this.logger.error('Error updating recipe:', error);
      throw error;
    }
  }

  async remove(id: string, user: User) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check permissions
    if (user.role !== 'ADMIN' && recipe.createdById !== user.id) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    try {
      await this.prisma.recipe.update({
        where: { id },
        data: { 
          isDeleted: true,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Recipe deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting recipe:', error);
      throw error;
    }
  }

  async generateWithAI(dto: GenerateRecipeDto, user: User) {
    try {
      this.logger.log(`Generating AI recipe for user ${user.id} with ingredients: ${dto.ingredients.join(', ')}`);
      
      const generatedRecipe = await this.aiRecipeService.generateRecipe(dto);
      
      // Create the recipe in the database
      const slug = this.generateSlug(generatedRecipe.title);
      const existingSlug = await this.prisma.recipe.findFirst({
        where: { slug, isDeleted: false },
      });
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

      const recipe = await this.prisma.recipe.create({
        data: {
          title: generatedRecipe.title,
          description: generatedRecipe.description,
          slug: finalSlug,
          servings: generatedRecipe.servings,
          totalCalories: generatedRecipe.totalCalories,
          caloriesPer: generatedRecipe.caloriesPer,
          ingredients: generatedRecipe.ingredients,
          steps: generatedRecipe.steps,
          nutrition: generatedRecipe.nutrition,
          estimatedCost: generatedRecipe.estimatedCost,
          difficulty: generatedRecipe.difficulty,
          tags: generatedRecipe.tags,
          cuisine: generatedRecipe.cuisine,
          prepTime: generatedRecipe.prepTime,
          cookTime: generatedRecipe.cookTime,
          createdById: user.id,
          createdByAI: true,
          isPublic: true,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      this.logger.log(`✅ AI recipe created successfully: ${recipe.id}`);

      return {
        success: true,
        message: 'AI recipe generated successfully',
        data: recipe,
      };
    } catch (error) {
      this.logger.error('Error generating AI recipe:', error);
      throw error;
    }
  }

  async getIngredientSuggestions(ingredients: string[]) {
    try {
      const suggestions = await this.aiRecipeService.generateIngredientSuggestions(ingredients);
      
      return {
        success: true,
        message: 'Ingredient suggestions fetched successfully',
        data: suggestions,
      };
    } catch (error) {
      this.logger.error('Error getting ingredient suggestions:', error);
      throw error;
    }
  }

  async toggleLike(recipeId: string, user: User) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const existingLike = await this.prisma.recipeLike.findFirst({
      where: { userId: user.id, recipeId },
    });

    try {
      if (existingLike) {
        // Unlike
        await this.prisma.recipeLike.delete({
          where: { id: existingLike.id },
        });

        return {
          success: true,
          message: 'Recipe unliked successfully',
          data: { isLiked: false },
        };
      } else {
        // Like
        await this.prisma.recipeLike.create({
          data: { userId: user.id, recipeId },
        });

        return {
          success: true,
          message: 'Recipe liked successfully',
          data: { isLiked: true },
        };
      }
    } catch (error) {
      this.logger.error('Error toggling like:', error);
      throw error;
    }
  }

  async toggleSave(recipeId: string, user: User) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const existingSave = await this.prisma.savedRecipe.findFirst({
      where: { userId: user.id, recipeId },
    });

    try {
      if (existingSave) {
        // Unsave
        await this.prisma.savedRecipe.delete({
          where: { id: existingSave.id },
        });

        return {
          success: true,
          message: 'Recipe removed from saved recipes',
          data: { isSaved: false },
        };
      } else {
        // Save
        await this.prisma.savedRecipe.create({
          data: { userId: user.id, recipeId },
        });

        return {
          success: true,
          message: 'Recipe saved successfully',
          data: { isSaved: true },
        };
      }
    } catch (error) {
      this.logger.error('Error toggling save:', error);
      throw error;
    }
  }

  async getUserSavedRecipes(userId: string, query: QueryRecipesDto) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      savedBy: {
        some: { userId },
      },
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [recipes, total] = await Promise.all([
        this.prisma.recipe.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy === 'createdAt' ? { createdAt: sortOrder } : { title: sortOrder },
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
            _count: {
              select: { likes: true, comments: true },
            },
          },
        }),
        this.prisma.recipe.count({ where }),
      ]);

      return {
        success: true,
        message: 'Saved recipes fetched successfully',
        data: recipes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching saved recipes:', error);
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
