import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { User } from '@prisma/client';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private prisma: PrismaService) {}

  async create(recipeId: string, dto: CreateCommentDto, user: User) {
    // Verify recipe exists
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, isDeleted: false },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // If replying to a comment, verify parent exists
    if (dto.parentCommentId) {
      const parentComment = await this.prisma.recipeComment.findFirst({
        where: { 
          id: dto.parentCommentId, 
          recipeId,
          isDeleted: false
        },
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found');
      }
    }

    try {
      const comment = await this.prisma.recipeComment.create({
        data: {
          content: dto.content,
          parentCommentId: dto.parentCommentId,
          userId: user.id,
          recipeId,
        },
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
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return {
        success: true,
        message: 'Comment created successfully',
        data: comment,
      };
    } catch (error) {
      this.logger.error('Error creating comment:', error);
      throw error;
    }
  }

  async findAllForRecipe(recipeId: string) {
    try {
      const comments = await this.prisma.recipeComment.findMany({
        where: { 
          recipeId,
          isDeleted: false,
          parentCommentId: null, // Only get top-level comments
        },
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
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        message: 'Comments retrieved successfully',
        data: comments,
      };
    } catch (error) {
      this.logger.error('Error fetching comments:', error);
      throw error;
    }
  }

  async update(commentId: string, dto: UpdateCommentDto, user: User) {
    const comment = await this.prisma.recipeComment.findFirst({
      where: { id: commentId, isDeleted: false },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check permissions - users can only edit their own comments, admins can edit any
    if (user.role !== 'ADMIN' && comment.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    try {
      const updatedComment = await this.prisma.recipeComment.update({
        where: { id: commentId },
        data: {
          content: dto.content,
          updatedAt: new Date(),
        },
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
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return {
        success: true,
        message: 'Comment updated successfully',
        data: updatedComment,
      };
    } catch (error) {
      this.logger.error('Error updating comment:', error);
      throw error;
    }
  }

  async remove(commentId: string, user: User) {
    const comment = await this.prisma.recipeComment.findFirst({
      where: { id: commentId, isDeleted: false },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check permissions - users can only delete their own comments, admins can delete any
    if (user.role !== 'ADMIN' && comment.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    try {
      // Soft delete the comment and all its replies
      await this.prisma.recipeComment.updateMany({
        where: {
          OR: [
            { id: commentId },
            { parentCommentId: commentId }
          ]
        },
        data: { 
          isDeleted: true,
          updatedAt: new Date(),
        },
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

  async getCommentsByUser(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    try {
      const [comments, total] = await Promise.all([
        this.prisma.recipeComment.findMany({
          where: { 
            userId,
            isDeleted: false 
          },
          skip,
          take: limit,
          include: {
            recipe: {
              select: { 
                id: true, 
                title: true, 
                slug: true,
                isDeleted: true 
              },
            },
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.recipeComment.count({
          where: { 
            userId,
            isDeleted: false 
          },
        }),
      ]);

      // Filter out comments on deleted recipes
      const activeComments = comments.filter(comment => !comment.recipe.isDeleted);

      return {
        success: true,
        message: 'User comments retrieved successfully',
        data: activeComments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching user comments:', error);
      throw error;
    }
  }
}
