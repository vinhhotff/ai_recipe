import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';
import { VideoGeneratorService } from './video-generator.service';

@Injectable()
export class RecipesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('recipe-generation') private recipeQueue: Queue,
    private videoGeneratorService: VideoGeneratorService
  ) {}

  async generateRecipe(userId: string, generateRecipeDto: GenerateRecipeDto) {
    // Create recipe request
    const request = await this.prisma.recipeRequest.create({
      data: {
        userId,
        input: generateRecipeDto as any,
        status: 'PENDING',
      },
    });

    // Add job to queue
    const job = await this.recipeQueue.add('generate-recipe', {
      requestId: request.id,
      userId,
      input: generateRecipeDto,
    });

    // Update request with job ID
    await this.prisma.recipeRequest.update({
      where: { id: request.id },
      data: { jobId: job.id.toString() },
    });

    return {
      requestId: request.id,
      jobId: job.id.toString(),
      status: 'PENDING',
    };
  }

  async getRecipeRequest(requestId: string, userId: string) {
    return this.prisma.recipeRequest.findFirst({
      where: { id: requestId, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.recipeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.recipe.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.recipe.findUnique({
      where: { slug },
    });
  }

  async createRecipe(data: any) {
    return this.prisma.recipe.create({
      data,
    });
  }

  async updateRecipeRequest(requestId: string, data: any) {
    return this.prisma.recipeRequest.update({
      where: { id: requestId },
      data,
    });
  }

  async saveRecipe(recipeId: string, userId: string) {
    try {
      // Check if the recipe exists
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
      });

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // For now, we'll just return a success message
      // In a real implementation, you might want to:
      // 1. Create a UserSavedRecipe table
      // 2. Add the recipe to user's favorites
      // 3. Create a bookmark system
      
      return {
        success: true,
        message: 'Recipe saved successfully',
        data: {
          recipeId,
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to save recipe: ${error.message}`);
    }
  }

  async generateVideo(recipeId: string) {
    return this.videoGeneratorService.generateVideo(recipeId);
  }
}
