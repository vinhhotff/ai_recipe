import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  RecipeHistoryItem, 
  PaginatedRecipeHistory, 
  RecipeFilters, 
  RecipeStats 
} from '../interfaces/recipe-history.interfaces';

@Injectable()
export class RecipeHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's recipe history with pagination, filtering, and interaction stats
   */
  async getUserRecipeHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: RecipeFilters = {}
  ): Promise<PaginatedRecipeHistory> {
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      createdById: userId,
    };

    if (filters.search) {
      where.title = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.minCalories !== undefined || filters.maxCalories !== undefined) {
      where.totalCalories = {};
      if (filters.minCalories !== undefined) {
        where.totalCalories.gte = filters.minCalories;
      }
      if (filters.maxCalories !== undefined) {
        where.totalCalories.lte = filters.maxCalories;
      }
    }

    if (filters.createdAfter) {
      where.createdAt = { ...where.createdAt, gte: filters.createdAfter };
    }

    if (filters.createdBefore) {
      where.createdAt = { ...where.createdAt, lte: filters.createdBefore };
    }

    // If tags filter is provided, use JSON contains
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        path: '$',
        array_contains: filters.tags,
      };
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: {
          _count: {
            select: {
              likes: true,
              comments: {
                where: { isDeleted: false },
              },
            },
          },
          likes: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    const recipeHistory: RecipeHistoryItem[] = recipes.map((recipe: any) => ({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings: recipe.servings,
      totalCalories: recipe.totalCalories,
      caloriesPer: recipe.caloriesPer,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      nutrition: recipe.nutrition,
      imageUrl: recipe.imageUrl,
      estimatedCost: recipe.estimatedCost,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      videoUrl: recipe.videoUrl,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      likeCount: recipe._count.likes,
      commentCount: recipe._count.comments,
      isLikedByUser: recipe.likes.length > 0,
    }));

    return {
      data: recipeHistory,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific recipe by ID with full details and interaction stats
   */
  async getRecipeById(recipeId: string, userId?: string): Promise<RecipeHistoryItem> {
    const recipe: any = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: {
              where: { isDeleted: false },
            },
          },
        },
        likes: userId ? {
          where: { userId },
          select: { id: true },
          take: 1,
        } : false,
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings: recipe.servings,
      totalCalories: recipe.totalCalories,
      caloriesPer: recipe.caloriesPer,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      nutrition: recipe.nutrition,
      imageUrl: recipe.imageUrl,
      estimatedCost: recipe.estimatedCost,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      videoUrl: recipe.videoUrl,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      likeCount: recipe._count.likes,
      commentCount: recipe._count.comments,
      isLikedByUser: recipe.likes ? recipe.likes.length > 0 : false,
    };
  }

  /**
   * Update recipe details (only by owner or admin)
   */
  async updateRecipe(
    recipeId: string,
    userId: string,
    updateData: Partial<{
      title: string;
      servings: number;
      ingredients: any;
      steps: any;
      nutrition: any;
      difficulty: string;
      tags: any;
      isPublic: boolean;
    }>,
    isAdmin: boolean = false
  ): Promise<RecipeHistoryItem> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check ownership
    if (recipe.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own recipes');
    }

    // Update the recipe
    const updatedRecipe = await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // Return updated recipe with stats
    return this.getRecipeById(recipeId, userId);
  }

  /**
   * Delete recipe (only by owner or admin)
   */
  async deleteRecipe(
    recipeId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check ownership
    if (recipe.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    // Delete the recipe (this will cascade to likes and comments)
    await this.prisma.recipe.delete({
      where: { id: recipeId },
    });
  }

  /**
   * Toggle recipe visibility (public/private)
   */
  async toggleRecipeVisibility(
    recipeId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<RecipeHistoryItem> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check ownership
    if (recipe.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('You can only modify your own recipes');
    }

    // Toggle visibility
    const updatedRecipe = await this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        isPublic: !recipe.isPublic,
        updatedAt: new Date(),
      },
    });

    return this.getRecipeById(recipeId, userId);
  }

  /**
   * Get user's recipe statistics
   */
  async getUserRecipeStats(userId: string): Promise<RecipeStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalStats,
      publicCount,
      privateCount,
      recentWeek,
      recentMonth,
      averageCalories,
      mostPopular,
    ] = await Promise.all([
      this.prisma.recipe.findMany({
        where: { createdById: userId },
        include: {
          _count: {
            select: {
              likes: true,
              comments: { where: { isDeleted: false } },
            },
          },
        },
      }),
      this.prisma.recipe.count({
        where: { createdById: userId, isPublic: true },
      }),
      this.prisma.recipe.count({
        where: { createdById: userId, isPublic: false },
      }),
      this.prisma.recipe.count({
        where: {
          createdById: userId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      this.prisma.recipe.count({
        where: {
          createdById: userId,
          createdAt: { gte: oneMonthAgo },
        },
      }),
      this.prisma.recipe.aggregate({
        where: { createdById: userId },
        _avg: { totalCalories: true },
      }),
      this.prisma.recipe.findFirst({
        where: { createdById: userId },
        include: {
          _count: { select: { likes: true } },
        },
        orderBy: {
          likes: { _count: 'desc' },
        },
      }),
    ]);

    const totalLikes = totalStats.reduce((sum, recipe: any) => sum + recipe._count.likes, 0);
    const totalComments = totalStats.reduce((sum, recipe: any) => sum + recipe._count.comments, 0);

    return {
      totalRecipes: totalStats.length,
      publicRecipes: publicCount,
      privateRecipes: privateCount,
      totalLikes,
      totalComments,
      averageCaloriesPerRecipe: Math.round(averageCalories._avg.totalCalories || 0),
      mostPopularRecipe: mostPopular ? {
        id: mostPopular.id,
        title: mostPopular.title,
        likeCount: (mostPopular as any)._count.likes,
      } : undefined,
      recentActivity: {
        recipesThisWeek: recentWeek,
        recipesThisMonth: recentMonth,
      },
    };
  }

  /**
   * Search public recipes with interaction stats
   */
  async searchPublicRecipes(
    searchQuery: string,
    userId?: string,
    page: number = 1,
    limit: number = 20,
    filters: RecipeFilters = {}
  ): Promise<PaginatedRecipeHistory> {
    const skip = (page - 1) * limit;

    const where: any = {
      isPublic: true,
      title: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    };

    // Apply filters similar to getUserRecipeHistory
    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.minCalories !== undefined || filters.maxCalories !== undefined) {
      where.totalCalories = {};
      if (filters.minCalories !== undefined) {
        where.totalCalories.gte = filters.minCalories;
      }
      if (filters.maxCalories !== undefined) {
        where.totalCalories.lte = filters.maxCalories;
      }
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: {
          _count: {
            select: {
              likes: true,
              comments: { where: { isDeleted: false } },
            },
          },
          likes: userId ? {
            where: { userId },
            select: { id: true },
            take: 1,
          } : false,
        },
        orderBy: [
          { likes: { _count: 'desc' } }, // Sort by popularity first
          { createdAt: 'desc' }, // Then by recency
        ],
        skip,
        take: limit,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    const searchResults: RecipeHistoryItem[] = recipes.map((recipe: any) => ({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      servings: recipe.servings,
      totalCalories: recipe.totalCalories,
      caloriesPer: recipe.caloriesPer,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      nutrition: recipe.nutrition,
      imageUrl: recipe.imageUrl,
      estimatedCost: recipe.estimatedCost,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      videoUrl: recipe.videoUrl,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      likeCount: recipe._count.likes,
      commentCount: recipe._count.comments,
      isLikedByUser: recipe.likes ? recipe.likes.length > 0 : false,
    }));

    return {
      data: searchResults,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
