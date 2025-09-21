import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';

import { RecipeGeneratorService } from '../../recipe-generator/recipe-generator.service';
import { RecipesService } from '../../recipes/recipes.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('recipe-generation')
@Injectable()
export class RecipeProcessor {
  private readonly logger = new Logger(RecipeProcessor.name);

  constructor(
    private recipeGeneratorService: RecipeGeneratorService,
    private recipesService: RecipesService,
    private prisma: PrismaService,
  ) {}

  @Process('generate-recipe')
  async handleRecipeGeneration(job: Job) {
    const { requestId, userId, input } = job.data;
    
    this.logger.log(`Processing recipe generation for request ${requestId}`);

    try {
      // Update status to RUNNING
      await this.recipesService.updateRecipeRequest(requestId, {
        status: 'RUNNING',
      });

      // Update progress
      await job.progress(10);

      // Generate recipe using AI  
      const recipe = await this.recipeGeneratorService.generateRecipe(userId, {
        ingredients: input.ingredients || [],
        preferences: {
          diet: input.diet,
          difficulty: input.difficulty,
          servings: input.servings,
          timeLimit: input.timeLimit
        }
      });
      
      await job.progress(60);

      // Generate image if requested (commented out for now)
      // if (input.imageGeneration && recipe.imagePrompt) {
      //   try {
      //     const imageUrl = await this.recipeGeneratorService.generateImage(recipe.imagePrompt);
      //     recipe.imageUrl = imageUrl;
      //   } catch (error) {
      //     this.logger.warn(`Image generation failed: ${error.message}`);
      //     // Continue without image
      //   }
      // }

      await job.progress(90);

      // Recipe is already saved by the service, just get the saved recipe ID
      const savedRecipe = await this.prisma.recipe.findUnique({
        where: { id: recipe.recipeId }
      });

      // Update request with result
      await this.recipesService.updateRecipeRequest(requestId, {
        status: 'DONE',
        result: recipe,
      });

      await job.progress(100);
      
      this.logger.log(`Recipe generation completed for request ${requestId}`);
      
      return { success: true, recipeId: savedRecipe?.id || recipe.recipeId };
    } catch (error) {
      this.logger.error(`Recipe generation failed for request ${requestId}:`, error);
      
      await this.recipesService.updateRecipeRequest(requestId, {
        status: 'FAILED',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}