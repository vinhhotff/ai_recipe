import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

  // Comment methods
  async addComment(recipeId: string, commentData: { content: string; parentCommentId?: string; userId: string; userName: string }) {
    // Check if recipe exists
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if parent comment exists (if provided)
    if (commentData.parentCommentId) {
      const parentComment = await this.prisma.coreRecipeComment.findFirst({
        where: { 
          id: commentData.parentCommentId, 
          recipeId,
          isDeleted: false 
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.coreRecipeComment.create({
      data: {
        content: commentData.content,
        recipeId,
        userId: commentData.userId,
        parentCommentId: commentData.parentCommentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return {
      success: true,
      message: 'Comment added successfully',
      data: {
        ...comment,
        authorName: comment.user.name || 'Unknown',
        authorId: comment.user.id,
      },
    };
  }

  async getComments(recipeId: string) {
    // Check if recipe exists
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const comments = await this.prisma.coreRecipeComment.findMany({
      where: {
        recipeId,
        isDeleted: false,
        parentCommentId: null, // Only root comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedComments = comments.map(comment => ({
      ...comment,
      authorName: comment.user.name || 'Unknown',
      authorId: comment.user.id,
      replies: comment.replies?.map(reply => ({
        ...reply,
        authorName: reply.user.name || 'Unknown',
        authorId: reply.user.id,
      })) || [],
    }));

    return {
      success: true,
      message: 'Comments fetched successfully',
      data: formattedComments,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.coreRecipeComment.findFirst({
      where: {
        id: commentId,
        isDeleted: false,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the author can delete their comment
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.coreRecipeComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }

  // Like methods
  async toggleLike(recipeId: string, userId: string, userName: string) {
    // Check if recipe exists
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if user already liked this recipe
    const existingLike = await this.prisma.coreRecipeLike.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    let isLiked = false;
    let likeCount = 0;

    if (existingLike) {
      // Unlike - remove the like
      await this.prisma.coreRecipeLike.delete({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
      });
      isLiked = false;
    } else {
      // Like - create new like
      await this.prisma.coreRecipeLike.create({
        data: {
          userId,
          recipeId,
        },
      });
      isLiked = true;
    }

    // Get updated like count
    likeCount = await this.prisma.coreRecipeLike.count({
      where: { recipeId },
    });

    return {
      success: true,
      message: isLiked ? 'Recipe liked successfully' : 'Recipe unliked successfully',
      data: {
        isLiked,
        likeCount,
      },
    };
  }

  async getLikes(recipeId: string) {
    // Check if recipe exists
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const likes = await this.prisma.coreRecipeLike.findMany({
      where: { recipeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedLikes = likes.map(like => ({
      id: like.id,
      userId: like.userId,
      userName: like.user.name || 'Unknown',
      recipeId: like.recipeId,
      createdAt: like.createdAt.toISOString(),
    }));

    return {
      success: true,
      message: 'Likes fetched successfully',
      data: formattedLikes,
    };
  }

  async getInteractions(recipeId: string, currentUserId?: string) {
    // Check if recipe exists
    const recipe = await this.prisma.coreRecipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Get likes and comments in parallel
    const [likes, comments] = await Promise.all([
      this.getLikes(recipeId),
      this.getComments(recipeId),
    ]);

    // Check if current user has liked this recipe
    let isLikedByCurrentUser = false;
    if (currentUserId) {
      const userLike = await this.prisma.coreRecipeLike.findUnique({
        where: {
          userId_recipeId: {
            userId: currentUserId,
            recipeId,
          },
        },
      });
      isLikedByCurrentUser = !!userLike;
    }

    return {
      success: true,
      message: 'Interactions fetched successfully',
      data: {
        likes: likes.data,
        comments: comments.data,
        likeCount: likes.data.length,
        commentCount: comments.data.reduce((total, comment) => {
          return total + 1 + (comment.replies?.length || 0);
        }, 0),
        isLikedByCurrentUser,
      },
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
