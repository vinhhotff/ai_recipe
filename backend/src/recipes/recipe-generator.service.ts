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
    console.log('🔑 OpenAI API Key detected:', apiKey ? `${apiKey.slice(0, 20)}...` : 'NONE');
    
    if (apiKey) {
      try {
        this.openai = new OpenAI({ apiKey });
        console.log('✅ OpenAI client initialized successfully');
      } catch (error) {
        console.error('❌ OpenAI client initialization failed:', error);
      }
    } else {
      console.warn('⚠️  No OpenAI API key found - using mock responses');
    }
  }

  async generateRecipe(input: GenerateRecipeDto): Promise<any> {
    try {
      console.log('🚀 Starting recipe generation with input:', input);
      console.log('🤖 OpenAI client exists:', !!this.openai);
      
      // Validate input strictly
      const validationResult = await this.validateInput(input);
      if (!validationResult.success) {
        console.log('❌ Validation failed:', validationResult.message);
        return {
          success: false,
          message: validationResult.message
        };
      }

      // Map ingredient UUIDs to names
      const processedInput = await this.processIngredients(input);
      console.log('🔄 Processed ingredients:', processedInput.ingredients);

      // If OpenAI is not configured, return mock data
      if (!this.openai) {
        console.log('🤖 Using mock recipe generation (OpenAI not available)');
        const mockRecipe = this.generateMockRecipe(processedInput);
        
        // Save mock recipe to database for video generation
        try {
          const uniqueSlug = `${mockRecipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
          
          await this.prisma.recipe.create({
            data: {
              id: mockRecipe.id,
              title: mockRecipe.title,
              slug: uniqueSlug,
              servings: parseInt(mockRecipe.servings.toString()),
              totalCalories: parseInt(mockRecipe.totalCalories.toString()),
              caloriesPer: parseInt(mockRecipe.caloriesPerServing.toString()),
              ingredients: mockRecipe.ingredients,
              steps: mockRecipe.steps,
              nutrition: mockRecipe.nutrition,
              estimatedCost: parseFloat(mockRecipe.estimatedCostVND?.toString() || '0'),
              difficulty: mockRecipe.difficulty,
              tags: mockRecipe.tags,
              imageUrl: mockRecipe.imageUrl,
              imagePrompt: mockRecipe.imagePrompt,
              isPublic: true,
            },
          });
          console.log('✅ Mock recipe saved to database:', mockRecipe.id);
        } catch (error) {
          console.warn('Failed to save mock recipe to database:', error.message);
        }
        
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

      console.log('🤖 Calling OpenAI API with ingredients:', processedInput.ingredients);
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
        
        // Save fallback recipe to database
        try {
          const uniqueSlug = `${mockRecipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
          
          await this.prisma.recipe.create({
            data: {
              id: mockRecipe.id,
              title: mockRecipe.title,
              slug: uniqueSlug,
              servings: parseInt(mockRecipe.servings.toString()),
              totalCalories: parseInt(mockRecipe.totalCalories.toString()),
              caloriesPer: parseInt(mockRecipe.caloriesPerServing.toString()),
              ingredients: mockRecipe.ingredients,
              steps: mockRecipe.steps,
              nutrition: mockRecipe.nutrition,
              estimatedCost: parseFloat(mockRecipe.estimatedCostVND?.toString() || '0'),
              difficulty: mockRecipe.difficulty,
              tags: mockRecipe.tags,
              imageUrl: mockRecipe.imageUrl,
              imagePrompt: mockRecipe.imagePrompt,
              isPublic: true,
            },
          });
          console.log('✅ Fallback recipe saved to database:', mockRecipe.id);
        } catch (error) {
          console.warn('Failed to save fallback recipe to database:', error.message);
        }
        
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

    // Generate title based on actual ingredients
    const ingredientNames = input.ingredients || [];
    console.log('🍜 Generating mock recipe for ingredients:', ingredientNames);
    
    let title = 'Mixed Ingredient Recipe';
    let recipeIngredients = [];
    let steps = [];
    
    // Generate recipe based on actual ingredients
    if (ingredientNames.some(ing => ing.toLowerCase().includes('mì') || ing.toLowerCase().includes('noodle'))) {
      if (ingredientNames.some(ing => ing.toLowerCase().includes('trứng') || ing.toLowerCase().includes('egg'))) {
        title = 'Mì trứng chiên giòn';
        recipeIngredients = [
          { name: 'Mì sợi', normalized: 'instant_noodles', quantity: 1, unit: 'gói' },
          { name: 'Trứng gà', normalized: 'eggs', quantity: 2, unit: 'quả' },
          { name: 'Hành lá', normalized: 'scallions', quantity: 2, unit: 'cây' },
          { name: 'Dầu ăn', normalized: 'cooking_oil', quantity: 2, unit: 'thìa canh' },
          { name: 'Nước mắm', normalized: 'fish_sauce', quantity: 1, unit: 'thìa cà phê' }
        ];
        steps = [
          { order: 1, text: 'Luộc mì sợi trong 2-3 phút, vớt ra để ráo.', durationMinutes: 3 },
          { order: 2, text: 'Đánh trứng trong bát, thêm chút muối tiêu.', durationMinutes: 1 },
          { order: 3, text: 'Làm nóng chảo, cho dầu vào và đổ trứng vào chiên.', durationMinutes: 2 },
          { order: 4, text: 'Cho mì vào trộn đều với trứng, chiên cho đến khi vàng giòn.', durationMinutes: 5 },
          { order: 5, text: 'Nêm nước mắm, rắc hành lá và tắt bếp.', durationMinutes: 1 }
        ];
      } else {
        title = 'Mì xào đơn giản';
        recipeIngredients = [
          { name: 'Mì sợi', normalized: 'instant_noodles', quantity: 1, unit: 'gói' },
          { name: 'Rau củ', normalized: 'mixed_vegetables', quantity: 100, unit: 'g' },
          { name: 'Nước mắm', normalized: 'fish_sauce', quantity: 1, unit: 'thìa canh' }
        ];
        steps = [
          { order: 1, text: 'Luộc mì sợi cho chín, vớt ra.', durationMinutes: 3 },
          { order: 2, text: 'Xào rau củ trong chảo nóng.', durationMinutes: 3 },
          { order: 3, text: 'Cho mì vào trộn đều, nêm nước mắm.', durationMinutes: 2 }
        ];
      }
    } else if (ingredientNames.some(ing => ing.toLowerCase().includes('gà') || ing.toLowerCase().includes('chicken'))) {
      title = 'Gà rim cà chua nhanh';
      recipeIngredients = [
        { name: 'Thịt gà', normalized: 'chicken_breast', quantity: 300, unit: 'g' },
        { name: 'Cà chua', normalized: 'tomato', quantity: 2, unit: 'quả' },
        { name: 'Hành tây', normalized: 'onion', quantity: 1, unit: 'củ' },
        { name: 'Tỏi', normalized: 'garlic', quantity: 3, unit: 'tép' }
      ];
      steps = [
        { order: 1, text: 'Rửa sạch thịt gà, cắt miếng vừa ăn.', durationMinutes: 5 },
        { order: 2, text: 'Cà chua cắt múi cau, hành tây thái lát.', durationMinutes: 3 },
        { order: 3, text: 'Xào thịt gà cho chín vàng.', durationMinutes: 8 },
        { order: 4, text: 'Thêm cà chua, rim cho đến khi sốt đặc.', durationMinutes: 12 }
      ];
    } else {
      // Generic recipe for other ingredients
      title = `Món ăn từ ${ingredientNames.slice(0,2).join(' và ')}`;
      recipeIngredients = ingredientNames.slice(0,3).map((name, index) => ({
        name,
        normalized: name.toLowerCase().replace(/\s+/g, '_'),
        quantity: 100 + index * 50,
        unit: 'g'
      }));
      steps = [
        { order: 1, text: `Sơ chế ${ingredientNames[0]} sạch sẽ.`, durationMinutes: 5 },
        { order: 2, text: `Chế biến các nguyên liệu theo sở thích.`, durationMinutes: 10 },
        { order: 3, text: 'Nêm nếm gia vị cho phù hợp và hoàn thành.', durationMinutes: 5 }
      ];
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
      ingredients: recipeIngredients,
      steps,
      nutrition: {
        protein_g: 25,
        fat_g: 8,
        carbs_g: 35,
        fiber_g: 3,
        sodium_mg: 650
      },
      imagePrompt: `A photorealistic ${title} dish, beautifully plated, warm lighting, food photography`,
      imageGenerationRequested: input.imageGeneration,
      imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg'
    };
  }
}