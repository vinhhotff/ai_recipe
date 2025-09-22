import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardOverview() {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const [
        totalUsers,
        totalRecipes,
        totalComments,
        totalLikes,
        newUsersToday,
        newRecipesToday,
        topRecipes,
      ] = await Promise.all([
        // Total counts
        this.prisma.user.count(),
        this.prisma.recipe.count({ where: { isDeleted: false } }),
        this.prisma.recipeComment.count({ where: { isDeleted: false } }),
        this.prisma.recipeLike.count(),

        // Today's new records
        this.prisma.user.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        this.prisma.recipe.count({
          where: {
            createdAt: { gte: startOfToday },
            isDeleted: false,
          },
        }),

        // Top recipes by engagement
        this.prisma.recipe.findMany({
          where: { isDeleted: false, isPublic: true },
          include: {
            createdBy: { select: { name: true, email: true } },
            _count: {
              select: { likes: true, comments: true, savedBy: true },
            },
          },
          orderBy: [
            { likes: { _count: 'desc' } },
            { comments: { _count: 'desc' } },
          ],
          take: 5,
        }),
      ]);

      // Calculate growth rates (simplified)
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [usersLastWeek, recipesLastWeek] = await Promise.all([
        this.prisma.user.count({ where: { createdAt: { gte: lastWeek } } }),
        this.prisma.recipe.count({
          where: { createdAt: { gte: lastWeek }, isDeleted: false },
        }),
      ]);

      return {
        success: true,
        message: 'Dashboard overview retrieved successfully',
        data: {
          metrics: {
            totalUsers,
            totalRecipes,
            totalComments,
            totalLikes,
            newUsersToday,
            newRecipesToday,
            userGrowthWeekly: usersLastWeek,
            recipeGrowthWeekly: recipesLastWeek,
          },
          topRecipes: topRecipes.map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            author: recipe.createdBy?.name || recipe.createdBy?.email || 'AI Generated',
            likes: recipe._count.likes,
            comments: recipe._count.comments,
            saves: recipe._count.savedBy,
            createdAt: recipe.createdAt,
          })),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard overview:', error);
      throw error;
    }
  }

  async getUserAnalytics(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);

    try {
      const [
        userRegistrations,
        usersByRole,
        activeUsers,
      ] = await Promise.all([
        // User registrations over time
        this.prisma.user.groupBy({
          by: ['createdAt'],
          where: dateFilter,
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),

        // Users by role
        this.prisma.user.groupBy({
          by: ['role'],
          _count: true,
        }),

        // Active users (users who created content or interacted)
        this.prisma.user.count({
          where: {
            OR: [
              { createdRecipes: { some: { createdAt: dateFilter.createdAt } } },
              { recipeComments: { some: { createdAt: dateFilter.createdAt } } },
              { recipeLikes: { some: { createdAt: dateFilter.createdAt } } },
            ],
          },
        }),
      ]);

      return {
        success: true,
        message: 'User analytics retrieved successfully',
        data: {
          registrations: this.formatTimeSeriesData(userRegistrations),
          roleDistribution: usersByRole.map(item => ({
            role: item.role,
            count: item._count,
          })),
          activeUsers,
          timeRange,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching user analytics:', error);
      throw error;
    }
  }

  async getRecipeAnalytics(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);

    try {
      const [
        recipeCreations,
        recipesByType,
        recipesByCuisine,
        recipesByDifficulty,
      ] = await Promise.all([
        // Recipe creations over time
        this.prisma.recipe.groupBy({
          by: ['createdAt'],
          where: { isDeleted: false, ...dateFilter },
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),

        // AI vs Manual recipes
        this.prisma.recipe.groupBy({
          by: ['createdByAI'],
          where: { isDeleted: false, ...dateFilter },
          _count: true,
        }),

        // Recipes by cuisine
        this.prisma.recipe.groupBy({
          by: ['cuisine'],
          where: { isDeleted: false, cuisine: { not: null }, ...dateFilter },
          _count: true,
          orderBy: { _count: { cuisine: 'desc' } },
          take: 10,
        }),

        // Recipes by difficulty
        this.prisma.recipe.groupBy({
          by: ['difficulty'],
          where: { isDeleted: false, difficulty: { not: null }, ...dateFilter },
          _count: true,
        }),
      ]);

      return {
        success: true,
        message: 'Recipe analytics retrieved successfully',
        data: {
          creations: this.formatTimeSeriesData(recipeCreations),
          typeDistribution: recipesByType.map(item => ({
            type: item.createdByAI ? 'AI Generated' : 'Manual',
            count: item._count,
          })),
          cuisineDistribution: recipesByCuisine.map(item => ({
            cuisine: item.cuisine,
            count: item._count,
          })),
          difficultyDistribution: recipesByDifficulty.map(item => ({
            difficulty: item.difficulty,
            count: item._count,
          })),
          timeRange,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching recipe analytics:', error);
      throw error;
    }
  }

  async getEngagementAnalytics(timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);

    try {
      const [
        likes,
        comments,
        saves,
        topEngagingRecipes,
      ] = await Promise.all([
        // Likes over time
        this.prisma.recipeLike.groupBy({
          by: ['createdAt'],
          where: dateFilter,
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),

        // Comments over time
        this.prisma.recipeComment.groupBy({
          by: ['createdAt'],
          where: { isDeleted: false, ...dateFilter },
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),

        // Saves over time
        this.prisma.savedRecipe.groupBy({
          by: ['createdAt'],
          where: dateFilter,
          _count: true,
          orderBy: { createdAt: 'asc' },
        }),

        // Most engaging recipes
        this.prisma.recipe.findMany({
          where: { isDeleted: false, isPublic: true },
          include: {
            createdBy: { select: { name: true } },
            _count: {
              select: { likes: true, comments: true, savedBy: true },
            },
          },
          orderBy: [
            { likes: { _count: 'desc' } },
            { comments: { _count: 'desc' } },
            { savedBy: { _count: 'desc' } },
          ],
          take: 10,
        }),
      ]);

      return {
        success: true,
        message: 'Engagement analytics retrieved successfully',
        data: {
          likes: this.formatTimeSeriesData(likes),
          comments: this.formatTimeSeriesData(comments),
          saves: this.formatTimeSeriesData(saves),
          topEngagingRecipes: topEngagingRecipes.map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            author: recipe.createdBy?.name || 'AI Generated',
            totalEngagement: recipe._count.likes + recipe._count.comments + recipe._count.savedBy,
            likes: recipe._count.likes,
            comments: recipe._count.comments,
            saves: recipe._count.savedBy,
          })),
          timeRange,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching engagement analytics:', error);
      throw error;
    }
  }

  async getTrendingRecipes(limit: number, timeRange: string) {
    const dateFilter = this.getDateFilter(timeRange);

    try {
      const recipes = await this.prisma.recipe.findMany({
        where: {
          isDeleted: false,
          isPublic: true,
          createdAt: dateFilter.createdAt,
        },
        include: {
          createdBy: { select: { name: true, email: true } },
          _count: {
            select: { likes: true, comments: true, savedBy: true },
          },
        },
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
          { savedBy: { _count: 'desc' } },
        ],
        take: limit,
      });

      return {
        success: true,
        message: 'Trending recipes retrieved successfully',
        data: recipes.map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          author: recipe.createdBy?.name || recipe.createdBy?.email || 'AI Generated',
          likes: recipe._count.likes,
          comments: recipe._count.comments,
          saves: recipe._count.savedBy,
          totalEngagement: recipe._count.likes + recipe._count.comments + recipe._count.savedBy,
          createdAt: recipe.createdAt,
          createdByAI: recipe.createdByAI,
        })),
      };
    } catch (error) {
      this.logger.error('Error fetching trending recipes:', error);
      throw error;
    }
  }

  async getUsers({ page, limit, search, role }: {
    page: number;
    limit: number;
    search?: string;
    role?: Role;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    try {
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                createdRecipes: true,
                recipeComments: true,
                recipeLikes: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      throw error;
    }
  }

  async updateUserRole(userId: string, newRole: Role) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        message: `User role updated to ${newRole}`,
        data: updatedUser,
      };
    } catch (error) {
      this.logger.error('Error updating user role:', error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Soft delete by updating role to a special deleted state or implement soft delete field
      // For now, we'll actually delete but in production you might want soft delete
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getFlaggedRecipes({ page, limit }: { page: number; limit: number }) {
    // In a real implementation, you'd have a flagging system
    // For now, we'll return recipes that might need review (e.g., very recent AI recipes)
    const skip = (page - 1) * limit;

    try {
      const [recipes, total] = await Promise.all([
        this.prisma.recipe.findMany({
          where: {
            isDeleted: false,
            createdByAI: true,
            // Add more flagging criteria here
          },
          skip,
          take: limit,
          include: {
            createdBy: { select: { name: true, email: true } },
            _count: {
              select: { likes: true, comments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.recipe.count({
          where: {
            isDeleted: false,
            createdByAI: true,
          },
        }),
      ]);

      return {
        success: true,
        message: 'Flagged recipes retrieved successfully',
        data: recipes,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching flagged recipes:', error);
      throw error;
    }
  }

  async approveRecipe(recipeId: string) {
    try {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        throw new NotFoundException('Recipe not found');
      }

      // In a real implementation, you'd update a approval status field
      // For now, we'll just return success
      return {
        success: true,
        message: 'Recipe approved successfully',
        data: { recipeId },
      };
    } catch (error) {
      this.logger.error('Error approving recipe:', error);
      throw error;
    }
  }

  async deleteRecipe(recipeId: string) {
    try {
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        throw new NotFoundException('Recipe not found');
      }

      await this.prisma.recipe.update({
        where: { id: recipeId },
        data: { isDeleted: true },
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

  async getFlaggedComments({ page, limit }: { page: number; limit: number }) {
    // In a real implementation, you'd have a flagging system
    const skip = (page - 1) * limit;

    try {
      const [comments, total] = await Promise.all([
        this.prisma.recipeComment.findMany({
          where: { isDeleted: false },
          skip,
          take: limit,
          include: {
            user: { select: { name: true, email: true } },
            recipe: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.recipeComment.count({ where: { isDeleted: false } }),
      ]);

      return {
        success: true,
        message: 'Comments retrieved successfully',
        data: comments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching comments:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string) {
    try {
      const comment = await this.prisma.recipeComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      await this.prisma.recipeComment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });

      return {
        success: true,
        message: 'Comment deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      const [
        databaseHealth,
        totalRecords,
      ] = await Promise.all([
        // Simple database health check
        this.prisma.$queryRaw`SELECT 1`,
        
        // Count total records for performance indication
        Promise.all([
          this.prisma.user.count(),
          this.prisma.recipe.count(),
          this.prisma.recipeComment.count(),
          this.prisma.recipeLike.count(),
        ]),
      ]);

      const [userCount, recipeCount, commentCount, likeCount] = totalRecords;

      return {
        success: true,
        message: 'System health retrieved successfully',
        data: {
          database: {
            status: 'healthy',
            connection: 'active',
          },
          records: {
            users: userCount,
            recipes: recipeCount,
            comments: commentCount,
            likes: likeCount,
          },
          performance: {
            status: 'normal',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching system health:', error);
      return {
        success: false,
        message: 'System health check failed',
        data: {
          database: { status: 'error' },
          error: error.message,
        },
      };
    }
  }

  private getDateFilter(timeRange: string) {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      createdAt: { gte: startDate },
    };
  }

  private formatTimeSeriesData(data: any[]) {
    // Group by date and sum counts
    const grouped = data.reduce((acc, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (item._count || 1);
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  }
}
