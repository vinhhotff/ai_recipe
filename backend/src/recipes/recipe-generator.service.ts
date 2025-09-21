import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';
import { GenerateRecipeDto } from './dto/generate-recipe.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Diet } from '@prisma/client';

@Injectable()
export class RecipeGeneratorService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateRecipe(input: GenerateRecipeDto): Promise<any> {
    try {
      // Validate input strictly
      const validationResult = await this.validateInput(input);
      if (!validationResult.success) {
        return {
          success: false,
          message: validationResult.message
        };
      }

      // Map ingredient UUIDs to names
      const processedInput = await this.processIngredients(input);

      // If OpenAI is not configured, return mock data
      if (!this.openai) {
        const mockRecipe = this.generateMockRecipe(processedInput);
        return {
          success: true,
          recipeId: mockRecipe.id,
          title: mockRecipe.title,
          steps: mockRecipe.steps,
          loading: false,
          data: mockRecipe
        };
      }

      const systemPrompt = this.buildSystemPrompt(processedInput.locale || 'en');
      const userPrompt = this.buildUserPrompt(processedInput);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(response);
      
      // Add generated ID if not present
      if (!parsedResponse.id) {
        parsedResponse.id = `recipe-${Date.now()}`;
      }
      
      return {
        success: true,
        recipeId: parsedResponse.id,
        title: parsedResponse.title,
        steps: parsedResponse.steps,
        loading: false,
        data: parsedResponse
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      try {
        const processedInput = await this.processIngredients(input);
        const mockRecipe = this.generateMockRecipe(processedInput);
        return {
          success: true,
          recipeId: mockRecipe.id,
          title: mockRecipe.title,
          steps: mockRecipe.steps,
          loading: false,
          data: mockRecipe
        };
      } catch (processingError) {
        return {
          success: false,
          message: 'Failed to process ingredients for fallback recipe'
        };
      }
    }
  }

  private async validateInput(input: GenerateRecipeDto): Promise<{ success: boolean; message?: string }> {
    // Validate diet enum
    if (input.diet && !Object.values(Diet).includes(input.diet)) {
      return {
        success: false,
        message: `Invalid diet value. Must be one of: ${Object.values(Diet).join(', ')}`
      };
    }

    // Validate locale is string
    if (input.locale && typeof input.locale !== 'string') {
      return {
        success: false,
        message: 'Locale must be a string'
      };
    }

    // Validate imageGeneration is boolean
    if (input.imageGeneration !== undefined && typeof input.imageGeneration !== 'boolean') {
      return {
        success: false,
        message: 'imageGeneration must be a boolean value'
      };
    }

    // Validate ingredients array is not empty
    if (!input.ingredients || input.ingredients.length === 0) {
      return {
        success: false,
        message: 'At least one ingredient is required'
      };
    }

    return { success: true };
  }

  private async processIngredients(input: GenerateRecipeDto): Promise<GenerateRecipeDto> {
    const processedIngredients: string[] = [];
    
    for (const ingredient of input.ingredients) {
      // Check if ingredient is a UUID (36 characters with hyphens)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(ingredient)) {
        // Fetch ingredient name from database
        try {
          const ingredientRecord = await this.prisma.ingredient.findUnique({
            where: { id: ingredient },
            select: { name: true, isDeleted: true }
          });
          
          if (!ingredientRecord) {
            throw new Error(`Ingredient with ID ${ingredient} not found`);
          }
          
          if (ingredientRecord.isDeleted) {
            throw new Error(`Ingredient ${ingredientRecord.name} is no longer available`);
          }
          
          processedIngredients.push(ingredientRecord.name);
        } catch (error) {
          throw new Error(`Invalid ingredient: ${ingredient}`);
        }
      } else {
        // Use ingredient name as-is
        processedIngredients.push(ingredient);
      }
    }
    
    return {
      ...input,
      ingredients: processedIngredients
    };
  }

  async generateImage(prompt: string): Promise<string> {
    if (!this.openai) {
      // Return a placeholder image URL
      return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
    }

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: `Food photography: ${prompt}`,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      return response.data[0]?.url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
    } catch (error) {
      console.error('Image generation error:', error);
      // Return fallback image
      return 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
    }
  }
  private buildSystemPrompt(locale: string): string {
    return `You are "ChefJSON" — ALWAYS output valid JSON matching the "GeneratedRecipe" schema provided. Do NOT output any additional prose, explanations, or markdown formatting. Output ONLY the JSON object.

If constraints are impossible, return {"error":"INFEASIBLE","reason":"..."} in place of recipe fields.

Locale: ${locale}. Units: metric. Prefer simple common ingredients. If a quantity cannot be determined, use a reasonable default and set note: "estimated".

Required JSON Schema:
{
  "id": "string",
  "title": "string",
  "description": "string",
  "servings": "integer",
  "totalCalories": "integer",
  "caloriesPerServing": "number",
  "estimatedCostVND": "number",
  "difficulty": "easy|medium|hard",
  "estimatedTimeMinutes": "integer",
  "tags": ["string"],
  "ingredients": [{"name": "string", "normalized": "string", "quantity": "number", "unit": "string", "note": "string"}],
  "steps": [{"order": "integer", "text": "string", "durationMinutes": "integer", "tips": "string"}],
  "nutrition": {"protein_g": "number", "fat_g": "number", "carbs_g": "number", "fiber_g": "number", "sodium_mg": "number"},
  "imagePrompt": "string",
  "imageGenerationRequested": "boolean",
  "imageUrl": "string (optional)"
}`;
  }

  private buildUserPrompt(input: GenerateRecipeDto): string {
    // Use maxCookingTime if provided, fallback to maxTimeMinutes for backward compatibility
    const maxTime = input.maxCookingTime || input.maxTimeMinutes || 'flexible';
    const servings = input.servings || 2;
    
    let prompt = `Create a recipe with these requirements:
- Available ingredients: ${JSON.stringify(input.ingredients)}
- Servings: ${servings}
- Maximum cooking time: ${maxTime} minutes`;

    if (input.cuisine) {
      prompt += `\n- Cuisine style: ${input.cuisine}`;
    }

    if (input.difficulty) {
      prompt += `\n- Difficulty level: ${input.difficulty}`;
    }

    if (input.diet) {
      prompt += `\n- Dietary requirements: ${input.diet}`;
    }

    if (input.dietaryRestrictions && input.dietaryRestrictions.length > 0) {
      prompt += `\n- Dietary restrictions: ${input.dietaryRestrictions.join(', ')}`;
    }

    if (input.calories) {
      prompt += `\n- Target total calories: ${input.calories}`;
    }

    if (input.exclude && input.exclude.length > 0) {
      prompt += `\n- Exclude ingredients: ${JSON.stringify(input.exclude)}`;
    }

    if (input.budgetVND) {
      prompt += `\n- Budget constraint: ${input.budgetVND} VND`;
    }

    prompt += `\n- Generate image: ${input.imageGeneration || false}`;
    
    prompt += `\n\nGenerate a complete recipe that uses the available ingredients efficiently. `;
    prompt += `Calculate accurate nutrition values and provide a detailed imagePrompt for food photography. `;
    prompt += `Ensure all steps are clear and include timing. Return ONLY the JSON object with no additional text.`;

    return prompt;
  }

  private generateMockRecipe(input: GenerateRecipeDto): any {
    const baseCalories = input.calories || 600;
    const servings = input.servings || 2;
    const caloriesPerServing = Math.round(baseCalories / servings);
    const maxTime = input.maxCookingTime || input.maxTimeMinutes || 35;
    const difficulty = input.difficulty || 'easy';
    const cuisine = input.cuisine || 'vietnamese';

    // Generate title based on cuisine and ingredients
    let title = 'Gà rim cà chua nhanh';
    if (input.cuisine) {
      if (input.cuisine.toLowerCase().includes('italian')) {
        title = 'Chicken Tomato Pasta';
      } else if (input.cuisine.toLowerCase().includes('asian')) {
        title = 'Asian Chicken Stir-fry';
      } else if (input.cuisine.toLowerCase().includes('mexican')) {
        title = 'Chicken Tomato Tacos';
      }
    }

    const tags = [cuisine.toLowerCase(), 'quick', 'healthy'];
    if (input.dietaryRestrictions) {
      tags.push(...input.dietaryRestrictions);
    }

    return {
      id: `recipe-${Date.now()}`,
      title,
      description: `Món ${title.toLowerCase()} đơn giản, phù hợp cho bữa cơm gia đình`,
      servings,
      totalCalories: baseCalories,
      caloriesPerServing,
      estimatedCostVND: input.budgetVND || 85000,
      difficulty,
      estimatedTimeMinutes: maxTime,
      tags,
      ingredients: [
        { name: 'Thịt gà', normalized: 'chicken_breast', quantity: 300, unit: 'g' },
        { name: 'Cà chua', normalized: 'tomato', quantity: 2, unit: 'quả' },
        { name: 'Hành tây', normalized: 'onion', quantity: 1, unit: 'củ' },
        { name: 'Tỏi', normalized: 'garlic', quantity: 3, unit: 'tép' },
        { name: 'Nước mắm', normalized: 'fish_sauce', quantity: 2, unit: 'thìa canh' },
        { name: 'Đường', normalized: 'sugar', quantity: 1, unit: 'thìa cà phê' },
        { name: 'Tiêu', normalized: 'pepper', quantity: 0.5, unit: 'thìa cà phê' }
      ],
      steps: [
        { 
          order: 1, 
          text: 'Rửa sạch thịt gà, cắt thành miếng vừa ăn. Ướp với muối, tiêu trong 10 phút.', 
          durationMinutes: 10, 
          tips: 'Ướp thịt giúp thấm gia vị hơn' 
        },
        { 
          order: 2, 
          text: 'Cà chua rửa sạch, cắt múi cau. Hành tây thái lát, tỏi băm nhỏ.', 
          durationMinutes: 5 
        },
        { 
          order: 3, 
          text: 'Đun chảo với một chút dầu, phi thơm tỏi và hành tây.', 
          durationMinutes: 2 
        },
        { 
          order: 4, 
          text: 'Cho thịt gà vào xào trên lửa lớn cho đến khi chín đều, khoảng 7-8 phút.', 
          durationMinutes: 8 
        },
        { 
          order: 5, 
          text: 'Thêm cà chua vào, nêm nước mắm, đường. Đảo đều và rim trong 10-15 phút cho đến khi sốt cà chua đặc lại.', 
          durationMinutes: 15, 
          tips: 'Rim với lửa vừa để tránh cháy' 
        }
      ],
      nutrition: {
        protein_g: 45,
        fat_g: 12,
        carbs_g: 18,
        fiber_g: 4,
        sodium_mg: 850
      },
      imagePrompt: 'A photorealistic Vietnamese chicken and tomato stew in a clay pot, garnished with scallions, shot from above, warm lighting',
      imageGenerationRequested: input.imageGeneration,
      imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'
    };
  }
}