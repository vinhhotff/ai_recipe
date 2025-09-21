import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAiRecipeLikeDto, AiRecipeLikeResponseDto, AiRecipeLikeQueryDto } from '../dto/ai-recipe-like.dto';

@Injectable()
export class AiRecipeLikeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Toggle like on an AI recipe (like if not liked, unlike if already liked)
   */
  async toggleLike(userId: string, dto: CreateAiRecipeLikeDto): Promise<{ liked: boolean; like?: AiRecipeLikeResponseDto }> {
    // Verify recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if user already liked this recipe
    const existingLike = await this.prisma.aiRecipeLike.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId: dto.recipeId,
        },
      },
    });

    if (existingLike) {
      // Unlike: remove existing like
      await this.prisma.aiRecipeLike.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      // Like: create new like
      const newLike = await this.prisma.aiRecipeLike.create({
        data: {
          userId,
          recipeId: dto.recipeId,
        },
      });
      
      return {
        liked: true,
        like: {
          id: newLike.id,
          userId: newLike.userId,
          recipeId: newLike.recipeId,
          createdAt: newLike.createdAt,
        },
      };
    }
  }

  /**
   * Get all likes for a recipe or by a user
   */
  async getLikes(query: AiRecipeLikeQueryDto): Promise<{
    data: AiRecipeLikeResponseDto[];
    meta: {
      total: number;
      recipeId?: string;
      userId?: string;
    };
  }> {
    const where: any = {};
    
    if (query.recipeId) {
      where.recipeId = query.recipeId;
    }
    
    if (query.userId) {
      where.userId = query.userId;
    }

    const [likes, total] = await Promise.all([
      this.prisma.aiRecipeLike.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.aiRecipeLike.count({ where }),
    ]);

    return {
      data: likes.map(like => ({
        id: like.id,
        userId: like.userId,
        recipeId: like.recipeId,
        createdAt: like.createdAt,
      })),
      meta: {
        total,
        ...(query.recipeId && { recipeId: query.recipeId }),
        ...(query.userId && { userId: query.userId }),
      },
    };
  }

  /**
   * Get like status for a specific user and recipe
   */
  async getLikeStatus(userId: string, recipeId: string): Promise<{ liked: boolean; likeId?: string }> {
    const like = await this.prisma.aiRecipeLike.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    return {
      liked: !!like,
      ...(like && { likeId: like.id }),
    };
  }

  /**
   * Get like count for a recipe
   */
  async getLikeCount(recipeId: string): Promise<{ count: number }> {
    const count = await this.prisma.aiRecipeLike.count({
      where: { recipeId },
    });

    return { count };
  }

  /**
   * Remove like (admin only or owner)
   */
  async removeLike(userId: string, likeId: string, isAdmin: boolean = false): Promise<void> {
    const like = await this.prisma.aiRecipeLike.findUnique({
      where: { id: likeId },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    // Only allow user to delete their own like or admin to delete any
    if (like.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own likes');
    }

    await this.prisma.aiRecipeLike.delete({
      where: { id: likeId },
    });
  }
}
