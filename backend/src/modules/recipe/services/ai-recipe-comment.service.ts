import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  CreateAiRecipeCommentDto, 
  UpdateAiRecipeCommentDto,
  AiRecipeCommentResponseDto, 
  AiRecipeCommentQueryDto 
} from '../dto/ai-recipe-comment.dto';

@Injectable()
export class AiRecipeCommentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new comment on an AI recipe
   */
  async createComment(userId: string, dto: CreateAiRecipeCommentDto): Promise<AiRecipeCommentResponseDto> {
    // Verify recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // If replying to a comment, verify parent comment exists
    if (dto.parentCommentId) {
      const parentComment = await this.prisma.aiRecipeComment.findFirst({
        where: {
          id: dto.parentCommentId,
          recipeId: dto.recipeId, // ensure parent comment is on the same recipe
          isDeleted: false,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.aiRecipeComment.create({
      data: {
        userId,
        recipeId: dto.recipeId,
        content: dto.content,
        parentCommentId: dto.parentCommentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: comment.id,
      userId: comment.userId,
      recipeId: comment.recipeId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? {
        id: comment.user.id,
        name: comment.user.name || '',
        email: comment.user.email,
      } : undefined,
    };
  }

  /**
   * Get comments for a recipe with pagination and optional nesting
   */
  async getComments(query: AiRecipeCommentQueryDto): Promise<{
    data: AiRecipeCommentResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      recipeId?: string;
      userId?: string;
    };
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(query.recipeId && { recipeId: query.recipeId }),
      ...(query.userId && { userId: query.userId }),
      ...(query.parentCommentId !== undefined && { parentCommentId: query.parentCommentId }),
      ...(!query.includeDeleted && { isDeleted: false }),
    };

    // For top-level comments (no parent), we paginate
    // For replies, we get all replies without pagination
    const isPaginationQuery = query.parentCommentId === undefined;

    const [comments, total] = await Promise.all([
      this.prisma.aiRecipeComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ...(query.includeReplies && {
            replies: {
              where: {
                isDeleted: query.includeDeleted ? undefined : false,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          }),
          _count: query.includeReplies ? true : undefined,
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(isPaginationQuery && {
          skip,
          take: limit,
        }),
      }),
      this.prisma.aiRecipeComment.count({ where }),
    ]);

    const mappedComments = comments.map((comment: any) => ({
      id: comment.id,
      userId: comment.userId,
      recipeId: comment.recipeId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? {
        id: comment.user.id,
        name: comment.user.name || '',
        email: comment.user.email,
      } : undefined,
      ...(query.includeReplies && comment.replies && {
        replies: comment.replies.map((reply: any) => ({
          id: reply.id,
          userId: reply.userId,
          recipeId: reply.recipeId,
          content: reply.content,
          parentCommentId: reply.parentCommentId,
          isDeleted: reply.isDeleted,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          user: reply.user ? {
            id: reply.user.id,
            name: reply.user.name || '',
            email: reply.user.email,
          } : undefined,
        })),
      }),
      ...(comment._count && {
        replyCount: comment._count.replies,
      }),
    }));

    return {
      data: mappedComments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...(query.recipeId && { recipeId: query.recipeId }),
        ...(query.userId && { userId: query.userId }),
      },
    };
  }

  /**
   * Update a comment
   */
  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateAiRecipeCommentDto,
    isAdmin: boolean = false
  ): Promise<AiRecipeCommentResponseDto> {
    const comment = await this.prisma.aiRecipeComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }

    // Only allow user to edit their own comment or admin to edit any
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.prisma.aiRecipeComment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: updatedComment.id,
      userId: updatedComment.userId,
      recipeId: updatedComment.recipeId,
      content: updatedComment.content,
      parentCommentId: updatedComment.parentCommentId,
      isDeleted: updatedComment.isDeleted,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      user: updatedComment.user ? {
        id: updatedComment.user.id,
        name: updatedComment.user.name || '',
        email: updatedComment.user.email,
      } : undefined,
    };
  }

  /**
   * Soft delete a comment
   */
  async deleteComment(
    userId: string,
    commentId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const comment = await this.prisma.aiRecipeComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow user to delete their own comment or admin to delete any
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.aiRecipeComment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        content: '[Deleted]', // Optional: replace content with placeholder
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get comment count for a recipe
   */
  async getCommentCount(recipeId: string): Promise<{ 
    count: number;
    topLevelCount: number; 
    replyCount: number;
  }> {
    const [total, topLevel, replies] = await Promise.all([
      this.prisma.aiRecipeComment.count({
        where: {
          recipeId,
          isDeleted: false,
        },
      }),
      this.prisma.aiRecipeComment.count({
        where: {
          recipeId,
          parentCommentId: null,
          isDeleted: false,
        },
      }),
      this.prisma.aiRecipeComment.count({
        where: {
          recipeId,
          parentCommentId: { not: null },
          isDeleted: false,
        },
      }),
    ]);

    return {
      count: total,
      topLevelCount: topLevel,
      replyCount: replies,
    };
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string): Promise<AiRecipeCommentResponseDto> {
    const comment: any = await this.prisma.aiRecipeComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          where: {
            isDeleted: false,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return {
      id: comment.id,
      userId: comment.userId,
      recipeId: comment.recipeId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      isDeleted: comment.isDeleted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? {
        id: comment.user.id,
        name: comment.user.name || '',
        email: comment.user.email,
      } : undefined,
      replies: comment.replies.map((reply: any) => ({
        id: reply.id,
        userId: reply.userId,
        recipeId: reply.recipeId,
        content: reply.content,
        parentCommentId: reply.parentCommentId,
        isDeleted: reply.isDeleted,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        user: reply.user ? {
          id: reply.user.id,
          name: reply.user.name || '',
          email: reply.user.email,
        } : undefined,
      })),
      replyCount: comment._count.replies,
    };
  }
}
