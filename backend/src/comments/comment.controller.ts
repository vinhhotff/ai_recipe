import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('comments')
@Controller('recipes/:recipeId/comments')
@UsePipes(new ValidationPipe({ transform: true }))
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all comments for a recipe',
    description: 'Get all comments for a specific recipe including threaded replies'
  })
  @ApiParam({ name: 'recipeId', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Comments retrieved successfully',
        data: [
          {
            id: 'comment-uuid',
            content: 'Great recipe!',
            user: { id: 'user-uuid', name: 'John Doe' },
            createdAt: '2024-01-01T00:00:00Z',
            replies: [
              {
                id: 'reply-uuid',
                content: 'I agree!',
                user: { id: 'user-uuid-2', name: 'Jane Smith' },
                createdAt: '2024-01-01T01:00:00Z'
              }
            ]
          }
        ]
      }
    }
  })
  async findAllForRecipe(@Param('recipeId') recipeId: string) {
    return this.commentService.findAllForRecipe(recipeId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a comment on a recipe',
    description: 'Add a new comment or reply to an existing comment. Available to MEMBER and ADMIN users.'
  })
  @ApiParam({ name: 'recipeId', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment created successfully',
    schema: {
      example: {
        success: true,
        message: 'Comment created successfully',
        data: {
          id: 'comment-uuid',
          content: 'This recipe looks amazing!',
          user: { id: 'user-uuid', name: 'John Doe' },
          createdAt: '2024-01-01T00:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied for guest users' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  async create(
    @Param('recipeId') recipeId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any
  ) {
    // Only MEMBER and ADMIN can comment
    if (req.user.role === 'GUEST') {
      throw new ForbiddenException('Guest users cannot comment on recipes. Please register to become a member.');
    }
    return this.commentService.create(recipeId, createCommentDto, req.user);
  }

  @Patch(':commentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.MEMBER, Role.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update a comment',
    description: 'Update comment content. Users can only update their own comments, admins can update any comment.'
  })
  @ApiParam({ name: 'recipeId', type: String, description: 'Recipe UUID' })
  @ApiParam({ name: 'commentId', type: String, description: 'Comment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Comment updated successfully',
        data: {
          id: 'comment-uuid',
          content: 'Updated comment content',
          updatedAt: '2024-01-01T02:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied - not comment owner or admin' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Comment not found' })
  async update(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any
  ) {
    return this.commentService.update(commentId, updateCommentDto, req.user);
  }

  @Delete(':commentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.MEMBER, Role.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a comment',
    description: 'Soft delete a comment and all its replies. Users can only delete their own comments, admins can delete any comment.'
  })
  @ApiParam({ name: 'recipeId', type: String, description: 'Recipe UUID' })
  @ApiParam({ name: 'commentId', type: String, description: 'Comment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Comment deleted successfully'
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied - not comment owner or admin' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Comment not found' })
  async remove(
    @Param('recipeId') recipeId: string,
    @Param('commentId') commentId: string,
    @Request() req: any
  ) {
    return this.commentService.remove(commentId, req.user);
  }
}

// Separate controller for user-specific comment operations
@ApiTags('user-comments')
@Controller('user/comments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
export class UserCommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get user comments',
    description: 'Get all comments made by the authenticated user'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User comments retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'User comments retrieved successfully',
        data: [
          {
            id: 'comment-uuid',
            content: 'My comment on a recipe',
            recipe: { id: 'recipe-uuid', title: 'Recipe Title', slug: 'recipe-slug' },
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        meta: { total: 25, page: 1, limit: 10, totalPages: 3 }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async getUserComments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req: any
  ) {
    return this.commentService.getCommentsByUser(req.user.id, page, limit);
  }
}
