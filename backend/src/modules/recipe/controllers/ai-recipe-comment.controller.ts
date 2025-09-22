import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AiRecipeCommentService } from '../services/ai-recipe-comment.service';
import { 
  CreateAiRecipeCommentDto, 
  UpdateAiRecipeCommentDto,
  AiRecipeCommentResponseDto, 
  AiRecipeCommentQueryDto 
} from '../dto/ai-recipe-comment.dto';

@ApiTags('AI Recipe Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai-recipe-comments')
export class AiRecipeCommentController {
  constructor(private readonly aiRecipeCommentService: AiRecipeCommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment on an AI recipe' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment created successfully' },
        data: { $ref: '#/components/schemas/AiRecipeCommentResponseDto' },
      },
    },
  })
  async createComment(@Request() req: any, @Body() dto: CreateAiRecipeCommentDto) {
    const comment = await this.aiRecipeCommentService.createComment(req.user.id, dto);
    
    return {
      success: true,
      message: 'Comment created successfully',
      data: comment,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get AI recipe comments with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comments retrieved successfully' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AiRecipeCommentResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
            recipeId: { type: 'string', nullable: true },
            userId: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async getComments(@Query() query: AiRecipeCommentQueryDto) {
    const result = await this.aiRecipeCommentService.getComments(query);
    
    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':commentId')
  @ApiOperation({ summary: 'Get a specific comment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment retrieved successfully' },
        data: { $ref: '#/components/schemas/AiRecipeCommentResponseDto' },
      },
    },
  })
  async getCommentById(@Param('commentId') commentId: string) {
    const comment = await this.aiRecipeCommentService.getCommentById(commentId);
    
    return {
      success: true,
      message: 'Comment retrieved successfully',
      data: comment,
    };
  }

  @Put(':commentId')
  @ApiOperation({ summary: 'Update a comment (owner or admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment updated successfully' },
        data: { $ref: '#/components/schemas/AiRecipeCommentResponseDto' },
      },
    },
  })
  async updateComment(
    @Request() req: any, 
    @Param('commentId') commentId: string, 
    @Body() dto: UpdateAiRecipeCommentDto
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    const comment = await this.aiRecipeCommentService.updateComment(req.user.id, commentId, dto, isAdmin);
    
    return {
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    };
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a comment (owner or admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment deleted successfully' },
      },
    },
  })
  async deleteComment(@Request() req: any, @Param('commentId') commentId: string) {
    const isAdmin = req.user.role === 'ADMIN';
    await this.aiRecipeCommentService.deleteComment(req.user.id, commentId, isAdmin);
    
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }

  @Get('count/:recipeId')
  @ApiOperation({ summary: 'Get comment count for a specific recipe' })
  @ApiResponse({
    status: 200,
    description: 'Comment count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment count retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 15 },
            topLevelCount: { type: 'number', example: 8 },
            replyCount: { type: 'number', example: 7 },
          },
        },
      },
    },
  })
  async getCommentCount(@Param('recipeId') recipeId: string) {
    const result = await this.aiRecipeCommentService.getCommentCount(recipeId);
    
    return {
      success: true,
      message: 'Comment count retrieved successfully',
      data: result,
    };
  }
}
