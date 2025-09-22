import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateRecipeDto } from '../dto/recipe.dto';

interface GeneratedRecipe {
  title: string;
  description: string;
  servings: number;
  totalCalories?: number;
  caloriesPer?: number;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  steps: string[];
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber?: number;
  };
  estimatedCost?: number;
  difficulty: string;
  tags: string[];
  cuisine?: string;
  prepTime?: number;
  cookTime?: number;
}

@Injectable()
export class AIRecipeService {
  private readonly logger = new Logger(AIRecipeService.name);
  private openai: OpenAI | null = null;
  private useMock: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.useMock = this.configService.get<string>('USE_MOCK_RECIPE') === 'true';
    
    if (apiKey && !this.useMock) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('🤖 OpenAI client initialized');
    } else {
      this.logger.warn('⚠️ OpenAI API key not found or mock mode enabled, using fallback recipes');
    }
  }

  async generateRecipe(dto: GenerateRecipeDto): Promise<GeneratedRecipe> {
    if (this.useMock || !this.openai) {
      return this.generateMockRecipe(dto);
    }

    try {
      const prompt = this.buildPrompt(dto);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert chef and nutritionist. Generate detailed recipes with accurate nutritional information and cooking instructions. Always respond with valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseRecipeResponse(content, dto);
      
    } catch (error) {
      this.logger.error('OpenAI API Error:', error);
      
      // Check for rate limit or quota errors
      if (error.code === 'insufficient_quota' || error.status === 429) {
        this.logger.warn('⚠️ OpenAI quota exceeded, falling back to mock recipe.');
        return this.generateMockRecipe(dto);
      }
      
      throw error;
    }
  }

  async generateIngredientSuggestions(existingIngredients: string[]): Promise<string[]> {
    if (this.useMock || !this.openai) {
      return this.getMockIngredientSuggestions(existingIngredients);
    }

    try {
      const prompt = `Based on these ingredients: ${existingIngredients.join(', ')}, suggest 5 complementary ingredients that would work well together in a recipe. Return only ingredient names, one per line.`;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a culinary expert. Suggest complementary ingredients that work well together.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content || '';
      return content.split('\n').filter(line => line.trim()).slice(0, 5);
      
    } catch (error) {
      this.logger.error('Error generating ingredient suggestions:', error);
      return this.getMockIngredientSuggestions(existingIngredients);
    }
  }

  private buildPrompt(dto: GenerateRecipeDto): string {
    const ingredients = dto.ingredients.join(', ');
    const servings = dto.servings || 4;
    const maxTime = dto.maxTime || 45;
    const difficulty = dto.difficulty || 'medium';
    const cuisine = dto.cuisine ? ` in ${dto.cuisine} style` : '';
    const dietary = dto.dietaryRestrictions ? ` that is ${dto.dietaryRestrictions}` : '';
    const tags = dto.preferredTags?.length ? ` with these characteristics: ${dto.preferredTags.join(', ')}` : '';

    return `Create a ${difficulty} recipe${cuisine}${dietary} using these main ingredients: ${ingredients}. 
    The recipe should serve ${servings} people and take no more than ${maxTime} minutes total${tags}.
    
    Please respond with a JSON object in this exact format:
    {
      "title": "Recipe name",
      "description": "Brief description",
      "servings": ${servings},
      "totalCalories": estimated_total_calories,
      "caloriesPer": calories_per_serving,
      "ingredients": [{"name": "ingredient", "quantity": "amount", "unit": "unit"}],
      "steps": ["step 1", "step 2", "step 3"],
      "nutrition": {"calories": 0, "protein": 0, "fat": 0, "carbs": 0, "fiber": 0},
      "estimatedCost": estimated_cost_usd,
      "difficulty": "${difficulty}",
      "tags": ["tag1", "tag2"],
      "cuisine": "${dto.cuisine || 'International'}",
      "prepTime": prep_minutes,
      "cookTime": cook_minutes
    }`;
  }

  private parseRecipeResponse(content: string, dto: GenerateRecipeDto): GeneratedRecipe {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const parsed = JSON.parse(jsonString);
      
      // Validate and ensure all required fields
      return {
        title: parsed.title || 'Generated Recipe',
        description: parsed.description || 'A delicious AI-generated recipe',
        servings: parsed.servings || dto.servings || 4,
        totalCalories: parsed.totalCalories || undefined,
        caloriesPer: parsed.caloriesPer || undefined,
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        nutrition: parsed.nutrition || undefined,
        estimatedCost: parsed.estimatedCost || undefined,
        difficulty: parsed.difficulty || dto.difficulty || 'medium',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        cuisine: parsed.cuisine || dto.cuisine || 'International',
        prepTime: parsed.prepTime || undefined,
        cookTime: parsed.cookTime || undefined
      };
    } catch (error) {
      this.logger.error('Error parsing OpenAI response:', error);
      return this.generateMockRecipe(dto);
    }
  }

  private generateMockRecipe(dto: GenerateRecipeDto): GeneratedRecipe {
    const mainIngredient = dto.ingredients[0] || 'chicken';
    const cuisine = dto.cuisine || 'International';
    const difficulty = dto.difficulty || 'medium';
    const servings = dto.servings || 4;

    return {
      title: `${cuisine} ${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)} Delight`,
      description: `A delicious ${difficulty} ${cuisine.toLowerCase()} recipe featuring ${mainIngredient} and fresh ingredients.`,
      servings,
      totalCalories: 520,
      caloriesPer: Math.round(520 / servings),
      ingredients: [
        { name: mainIngredient, quantity: '500', unit: 'g' },
        { name: 'olive oil', quantity: '2', unit: 'tbsp' },
        { name: 'garlic', quantity: '3', unit: 'cloves' },
        { name: 'onion', quantity: '1', unit: 'piece' },
        ...dto.ingredients.slice(1, 3).map(ing => ({
          name: ing,
          quantity: '200',
          unit: 'g'
        }))
      ],
      steps: [
        'Prepare all ingredients by washing and chopping as needed',
        `Heat olive oil in a large pan over medium heat`,
        'Add minced garlic and diced onion, sauté until fragrant',
        `Add ${mainIngredient} and cook according to type and size`,
        'Add remaining ingredients and season to taste',
        'Cook until everything is tender and flavors are well combined',
        'Adjust seasoning and serve hot'
      ],
      nutrition: {
        calories: Math.round(520 / servings),
        protein: 25,
        fat: 12,
        carbs: 35,
        fiber: 4
      },
      estimatedCost: 12.50,
      difficulty,
      tags: dto.preferredTags || ['Homemade', 'Fresh', 'Nutritious'],
      cuisine,
      prepTime: 15,
      cookTime: 25
    };
  }

  private getMockIngredientSuggestions(existingIngredients: string[]): string[] {
    const commonSuggestions = [
      'garlic', 'onion', 'olive oil', 'salt', 'pepper', 'herbs',
      'lemon', 'tomato', 'ginger', 'soy sauce', 'butter', 'cheese'
    ];
    
    return commonSuggestions
      .filter(ing => !existingIngredients.some(existing => 
        existing.toLowerCase().includes(ing.toLowerCase())
      ))
      .slice(0, 5);
  }
}
