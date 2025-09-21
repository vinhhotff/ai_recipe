import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';

import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';

@ApiTags('Recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate a new recipe',
    description: `Generate a personalized recipe based on available ingredients and preferences.
    
Example request body:
    {
      "ingredients": ["chicken", "rice", "tomato"],
      "diet": "NONE",
      "locale": "en",
      "imageGeneration": true,
      "maxCookingTime": 30,
      "cuisine": "Asian",
      "difficulty": "easy",
      "servings": 4,
      "dietaryRestrictions": ["gluten-free", "low-sodium"]
    }`
  })
  async generateRecipe(@Request() req, @Body() generateRecipeDto: GenerateRecipeDto) {
    return this.recipesService.generateRecipe(req.user.id, generateRecipeDto);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all recipe requests' })
  findAllRequests(@Request() req) {
    return this.recipesService.findAll(req.user.id);
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recipe request by ID' })
  findRequest(@Param('id') id: string, @Request() req) {
    return this.recipesService.getRecipeRequest(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipe by ID' })
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get recipe by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.recipesService.findBySlug(slug);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a recipe to user collection' })
  async saveRecipe(@Param('id') recipeId: string, @Request() req) {
    return this.recipesService.saveRecipe(recipeId, req.user.id);
  }

  @Post(':id/video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate cooking tutorial video for a recipe',
    description: `Generate a cooking tutorial video for the specified recipe. The video will include:
    - Step-by-step visual guide
    - AI-generated images for each cooking step
    - Optional narration (TTS)
    - Final video uploaded to Supabase Storage
    
    Response format:
    {
      "success": true,
      "videoUrl": "https://supabase.../recipe-videos/abc123.mp4"
    }`
  })
  async generateVideo(@Param('id') recipeId: string, @Request() req) {
    return this.recipesService.generateVideo(recipeId);
  }

  @Sse('stream/:jobId')
  @ApiOperation({ summary: 'Stream recipe generation progress' })
  async streamProgress(@Param('jobId') jobId: string): Promise<Observable<MessageEvent>> {
    // In a real implementation, you would connect to your queue system
    // and stream actual job progress. For now, we'll simulate progress.
    
    return new Observable((observer) => {
      let progress = 0;
      const interval = setInterval(async () => {
        progress += 10;
        
        const status = progress >= 100 ? 'DONE' : 'RUNNING';
        const message = this.getProgressMessage(Math.floor(progress / 10) - 1);
        
        observer.next({
          data: JSON.stringify({
            jobId,
            progress: Math.min(progress, 100),
            status,
            message,
          }),
        } as MessageEvent);
        
        if (progress >= 100) {
          clearInterval(interval);
          observer.complete();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    });
  }

  private getProgressMessage(index: number): string {
    const messages = [
      'Đang khởi tạo...',
      'Đang phân tích nguyên liệu...',
      'Đang tính toán dinh dưỡng...',
      'Đang tạo công thức nấu ăn...',
      'Đang tối ưu hóa công thức...',
      'Đang tạo hình ảnh minh họa...',
      'Đang hoàn thiện...',
      'Gần hoàn thành...',
      'Đang kiểm tra chất lượng...',
      'Hoàn thành!',
    ];
    return messages[index] || 'Đang xử lý...';
  }
}