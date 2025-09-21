import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { AIService, AIRecipeResult } from './services/ai.service';
import { 
  GenerateRecipeDto,
  GeneratedRecipeResponseDto,
  GeneratedIngredientDto,
  InputIngredientDto,
  Currency,
  SuggestionHistoryDto,
  GenerateRecipeJobStatusDto
} from './dto/recipe-generator.dto';
import { 
  JobStatus, 
  SuggestionStatus, 
  User, 
  Recipe, 
  RecipeSuggestionLog 
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RecipeGeneratorService {
  constructor(
    private prisma: PrismaService,
    private ingredientService: IngredientsService,
    private aiService: AIService,
  ) {}

  /**
   * Main method to generate recipe using AI
   */
  async generateRecipe(
    userId: string, 
    generateDto: GenerateRecipeDto
  ): Promise<GeneratedRecipeResponseDto> {
    const startTime = Date.now();

    try {
      // 1. Validate and normalize ingredients
      const normalizedIngredients = await this.validateAndNormalizeIngredients(
        generateDto.ingredients
      );

      // 2. Create suggestion log entry
      const suggestionLog = await this.createSuggestionLog(
        userId, 
        generateDto, 
        SuggestionStatus.PROCESSING
      );

      // 3. Generate recipe with AI
      const aiResult = await this.aiService.generateRecipe({
        ingredients: normalizedIngredients,
        preferences: generateDto.preferences
      });

      // 4. Calculate pricing for generated recipe
      const pricingResult = await this.calculateRecipePricing(
        aiResult.ingredients,
        generateDto.currency || Currency.VND
      );

      // 5. Store recipe in database
      const savedRecipe = await this.saveGeneratedRecipe(
        userId,
        aiResult,
        pricingResult.totalCost,
        generateDto.currency || Currency.VND
      );

      // 6. Update suggestion log with results
      await this.updateSuggestionLog(
        suggestionLog.id,
        SuggestionStatus.DONE,
        savedRecipe.id,
        pricingResult.totalCost
      );

      const processingTime = Date.now() - startTime;

      // 7. Build response
      const response: GeneratedRecipeResponseDto = {
        recipeId: savedRecipe.id,
        title: aiResult.title,
        steps: aiResult.steps,
        ingredients: pricingResult.ingredients,
        totalCost: pricingResult.totalCost.toString(),
        currency: generateDto.currency || Currency.VND,
        nutrition: aiResult.nutrition,
        servings: aiResult.servings,
        estimatedTime: aiResult.estimatedTime,
        difficulty: aiResult.difficulty,
        hasMissingPrices: pricingResult.hasMissingPrices,
        missingPriceIngredients: pricingResult.missingPriceIngredients,
        generatedAt: new Date().toISOString(),
        processingTimeMs: processingTime
      };

      return response;

    } catch (error) {
      // Handle errors and update log if it exists
      console.error('Recipe generation failed:', error);
      
      throw new BadRequestException(
        `Recipe generation failed: ${error.message}`
      );
    }
  }

  /**
   * Get recipe generation history for a user
   */
  async getSuggestionHistory(userId: string): Promise<SuggestionHistoryDto[]> {
    const logs = await this.prisma.recipeSuggestionLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return logs.map(log => ({
      id: log.id,
      inputIngredients: log.inputIngredients as any as InputIngredientDto[],
      preferences: log.preferences as any,
      status: log.status,
      recipeTitle: undefined, // This field doesn't exist in the schema, could be fetched from relation
      totalCost: log.totalCost?.toString(),
      createdAt: log.createdAt.toISOString(),
      completedAt: log.completedAt?.toISOString()
    }));
  }

  /**
   * Validate and normalize input ingredients
   */
  private async validateAndNormalizeIngredients(
    ingredients: InputIngredientDto[]
  ): Promise<InputIngredientDto[]> {
    const normalized: InputIngredientDto[] = [];

    for (const ingredient of ingredients) {
      // Basic validation
      if (!ingredient.name || !ingredient.quantity || !ingredient.unit) {
        throw new BadRequestException(
          `Invalid ingredient: ${JSON.stringify(ingredient)}`
        );
      }

      // Validate quantity is a valid number
      const quantity = parseFloat(ingredient.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Invalid quantity for ${ingredient.name}: ${ingredient.quantity}`
        );
      }

      // Normalize ingredient name (trim, lowercase for matching)
      const normalizedName = ingredient.name.trim().toLowerCase();
      
      // Check if we can find this ingredient in our database for better matching
      const dbIngredient = await this.findBestIngredientMatch(normalizedName);
      
      normalized.push({
        name: dbIngredient?.name || ingredient.name.trim(),
        quantity: quantity.toString(),
        unit: ingredient.unit.trim().toLowerCase()
      });
    }

    return normalized;
  }

  /**
   * Find best matching ingredient in database
   */
  private async findBestIngredientMatch(inputName: string) {
    // Try exact match first
    let ingredient = await this.prisma.ingredient.findFirst({
      where: { 
        name: { equals: inputName, mode: 'insensitive' },
        deletedAt: null
      }
    });

    if (ingredient) return ingredient;

    // Try partial match
    ingredient = await this.prisma.ingredient.findFirst({
      where: { 
        name: { contains: inputName, mode: 'insensitive' },
        deletedAt: null
      }
    });

    return ingredient;
  }

  /**
   * Calculate pricing for recipe ingredients
   */
  private async calculateRecipePricing(
    recipeIngredients: AIRecipeResult['ingredients'],
    currency: Currency
  ) {
    const ingredientsWithPricing: GeneratedIngredientDto[] = [];
    let totalCost = new Decimal(0);
    const missingPriceIngredients: string[] = [];

    for (const ingredient of recipeIngredients) {
      try {
        // Find ingredient by name first
        const dbIngredient = await this.findBestIngredientMatch(ingredient.name.toLowerCase());
        
        const quantity = new Decimal(ingredient.quantity);
        let ingredientCost = new Decimal(0);
        let pricePerUnit: string | undefined;
        let missingPrice = true;

        if (dbIngredient) {
          // Get pricing for this ingredient
          const priceResult = await this.ingredientService.getPricePerUnit(
            dbIngredient.id,
            ingredient.unit,
            currency === 'USD' ? 'USD' as any : 'VND' as any
          );

          if (priceResult) {
            pricePerUnit = priceResult.toString();
            ingredientCost = priceResult.mul(quantity);
            totalCost = totalCost.add(ingredientCost);
            missingPrice = false;
          }
        }

        if (missingPrice) {
          missingPriceIngredients.push(ingredient.name);
        }

        ingredientsWithPricing.push({
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          pricePerUnit,
          totalCost: ingredientCost.gt(0) ? ingredientCost.toString() : undefined,
          currency,
          missingPrice
        });

      } catch (error) {
        console.error(`Failed to get pricing for ${ingredient.name}:`, error);
        
        ingredientsWithPricing.push({
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          currency,
          missingPrice: true
        });
        
        missingPriceIngredients.push(ingredient.name);
      }
    }

    return {
      ingredients: ingredientsWithPricing,
      totalCost,
      hasMissingPrices: missingPriceIngredients.length > 0,
      missingPriceIngredients
    };
  }

  /**
   * Save generated recipe to database
   */
  private async saveGeneratedRecipe(
    userId: string,
    aiResult: AIRecipeResult,
    totalCost: Decimal,
    currency: Currency
  ): Promise<Recipe> {
    // Generate a slug from the title
    const slug = aiResult.title.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .substring(0, 50) // Limit length
      + '-' + Date.now(); // Add timestamp for uniqueness

    // Calculate estimated calories (rough estimate)
    const estimatedCalories = aiResult.nutrition?.calories || 300;
    const caloriesPerServing = Math.floor(estimatedCalories / aiResult.servings);

    // Save recipe using the original Recipe model
    const recipe = await this.prisma.recipe.create({
      data: {
        title: aiResult.title,
        slug,
        servings: aiResult.servings,
        totalCalories: estimatedCalories,
        caloriesPer: caloriesPerServing,
        // Store ingredients as JSON array
        ingredients: aiResult.ingredients.map(ing => ({
          name: ing.name,
          qty: ing.quantity,
          unit: ing.unit
        })),
        // Store steps as JSON array
        steps: aiResult.steps.map((step, index) => ({
          step: index + 1,
          instruction: step
        })),
        // Store nutrition info
        nutrition: aiResult.nutrition as any || {},
        estimatedCost: parseFloat(totalCost.toString()),
        difficulty: aiResult.difficulty,
        tags: ['ai-generated'],
        isPublic: false, // AI generated recipes are private by default
        createdById: userId,
        createdAt: new Date()
      }
    });

    return recipe;
  }

  /**
   * Create suggestion log entry
   */
  private async createSuggestionLog(
    userId: string,
    generateDto: GenerateRecipeDto,
    status: SuggestionStatus
  ): Promise<RecipeSuggestionLog> {
    return await this.prisma.recipeSuggestionLog.create({
      data: {
        userId,
        inputIngredients: generateDto.ingredients as any,
        preferences: generateDto.preferences as any,
        status,
        createdAt: new Date()
      }
    });
  }

  /**
   * Update suggestion log with results
   */
  private async updateSuggestionLog(
    logId: string,
    status: SuggestionStatus,
    recipeId?: string,
    totalCost?: Decimal
  ): Promise<void> {
    const updateData: any = {
      status,
      completedAt: new Date()
    };

    if (recipeId) {
      updateData.generatedRecipeId = recipeId;
      
      // Get recipe title for the log
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { title: true }
      });
      
      // Note: recipeTitle field doesn't exist in schema, we store title in the recipe relation
    }

    if (totalCost) {
      updateData.totalCost = totalCost;
    }

    await this.prisma.recipeSuggestionLog.update({
      where: { id: logId },
      data: updateData
    });
  }

  /**
   * Get recipe generation job status (for future async processing)
   */
  async getJobStatus(jobId: string): Promise<GenerateRecipeJobStatusDto> {
    const job = await this.prisma.aIJobQueue.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      jobId: job.id,
      status: job.status,
      result: (job as any).result || null,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString()
    };
  }
}
