import { 
  Controller, 
  Post, 
  Get, 
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
import { AiRecipeLikeService } from '../services/ai-recipe-like.service';
import { 
  CreateAiRecipeLikeDto, 
  AiRecipeLikeResponseDto, 
  AiRecipeLikeQueryDto 
} from '../dto/ai-recipe-like.dto';

@ApiTags('AI Recipe Likes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai-recipe-likes')
export class AiRecipeLikeController {
  constructor(private readonly aiRecipeLikeService: AiRecipeLikeService) {}

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on an AI recipe (like/unlike)' })
  @ApiResponse({
    status: 200,
    description: 'Like toggled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Recipe liked successfully' },
        data: {
          type: 'object',
          properties: {
            liked: { type: 'boolean', example: true },
            like: { 
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                recipeId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  })
  async toggleLike(@Request() req: any, @Body() dto: CreateAiRecipeLikeDto) {
    const result = await this.aiRecipeLikeService.toggleLike(req.user.sub, dto);
    
    return {
      success: true,
      message: result.liked ? 'Recipe liked successfully' : 'Recipe unliked successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get AI recipe likes with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'Likes retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Likes retrieved successfully' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AiRecipeLikeResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            recipeId: { type: 'string', nullable: true },
            userId: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async getLikes(@Query() query: AiRecipeLikeQueryDto) {
    const result = await this.aiRecipeLikeService.getLikes(query);
    
    return {
      success: true,
      message: 'Likes retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('status/:recipeId')
  @ApiOperation({ summary: 'Get like status for current user and specific recipe' })
  @ApiResponse({
    status: 200,
    description: 'Like status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Like status retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            liked: { type: 'boolean', example: true },
            likeId: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async getLikeStatus(@Request() req: any, @Param('recipeId') recipeId: string) {
    const result = await this.aiRecipeLikeService.getLikeStatus(req.user.sub, recipeId);
    
    return {
      success: true,
      message: 'Like status retrieved successfully',
      data: result,
    };
  }

  @Get('count/:recipeId')
  @ApiOperation({ summary: 'Get like count for a specific recipe' })
  @ApiResponse({
    status: 200,
    description: 'Like count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Like count retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', example: 42 },
          },
        },
      },
    },
  })
  async getLikeCount(@Param('recipeId') recipeId: string) {
    const result = await this.aiRecipeLikeService.getLikeCount(recipeId);
    
    return {
      success: true,
      message: 'Like count retrieved successfully',
      data: result,
    };
  }

  @Delete(':likeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a specific like (owner or admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Like removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Like removed successfully' },
      },
    },
  })
  async removeLike(@Request() req: any, @Param('likeId') likeId: string) {
    const isAdmin = req.user.role === 'ADMIN';
    await this.aiRecipeLikeService.removeLike(req.user.sub, likeId, isAdmin);
    
    return {
      success: true,
      message: 'Like removed successfully',
    };
  }
}
