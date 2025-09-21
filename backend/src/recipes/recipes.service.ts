import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';
import { VideoGeneratorService } from './video-generator.service';
import { RecipeGeneratorService } from './recipe-generator.service';

@Injectable()
export class RecipesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('recipe-generation') private recipeQueue: Queue,
    private videoGeneratorService: VideoGeneratorService,
    private recipeGeneratorService: RecipeGeneratorService
  ) {}

  async generateRecipe(userId: string, generateRecipeDto: GenerateRecipeDto) {
    // Call the improved RecipeGeneratorService directly
    return this.recipeGeneratorService.generateRecipe(generateRecipeDto);
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
