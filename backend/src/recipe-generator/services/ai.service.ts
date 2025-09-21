import { Injectable } from '@nestjs/common';
import { 
  InputIngredientDto, 
  RecipePreferencesDto, 
  GeneratedNutritionDto,
  Diet,
  Difficulty
} from '../dto/recipe-generator.dto';

export interface AIRecipeResult {
  title: string;
  steps: string[];
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
  servings: number;
  estimatedTime: number;
  difficulty: Difficulty;
  nutrition?: GeneratedNutritionDto;
}

export interface AIGenerationRequest {
  ingredients: InputIngredientDto[];
  preferences?: RecipePreferencesDto;
}

@Injectable()
export class AIService {
  /**
   * Main method to generate recipe using AI model
   * This is abstracted to allow for different AI providers (OpenAI, Claude, etc.)
   */
  async generateRecipe(request: AIGenerationRequest): Promise<AIRecipeResult> {
    try {
      // For now, use mock implementation until real AI integration
      return await this.mockGenerateRecipe(request);
    } catch (error) {
      throw new Error(`AI recipe generation failed: ${error.message}`);
    }
  }

  /**
   * Mock implementation for testing purposes
   * Replace this with actual AI model calls
   */
  private async mockGenerateRecipe(request: AIGenerationRequest): Promise<AIRecipeResult> {
    const { ingredients, preferences } = request;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

    // Create mock recipe based on ingredients
    const ingredientNames = ingredients.map(ing => ing.name.toLowerCase());
    
    let title = 'Món ăn tự chế';
    let steps = [
      'Chuẩn bị tất cả nguyên liệu',
      'Làm sạch và sơ chế nguyên liệu',
      'Nấu theo hướng dẫn',
      'Trang trí và thưởng thức'
    ];
    
    // Generate more realistic recipe based on common Vietnamese ingredients
    if (ingredientNames.includes('cà chua') && ingredientNames.includes('trứng gà')) {
      title = 'Trứng chiên cà chua';
      steps = [
        'Rửa sạch cà chua, thái múi cau',
        'Đánh trứng với một chút muối',
        'Làm nóng chảo với ít dầu ăn',
        'Xào cà chua chín mềm',
        'Đổ trứng vào, trộn đều và chiên chín',
        'Trang trí với rau thơm và thưởng thức'
      ];
    } else if (ingredientNames.includes('gà') || ingredientNames.includes('thịt gà')) {
      title = 'Gà xào';
      steps = [
        'Thái thịt gà thành từng miếng nhỏ',
        'Ướp thịt gà với gia vị trong 15 phút',
        'Làm nóng chảo với dầu ăn',
        'Xào thịt gà cho đến khi chín vàng',
        'Thêm các nguyên liệu khác và xào đều',
        'Nêm nước mắm, đường để vừa miệng'
      ];
    } else if (ingredientNames.includes('cá')) {
      title = 'Cá nướng';
      steps = [
        'Làm sạch cá, ướp với muối và gia vị',
        'Để cá ướp trong 30 phút',
        'Làm nóng lò nướng hoặc chảo',
        'Nướng cá đến khi chín và vàng đều hai mặt',
        'Trang trí với rau thơm và chanh'
      ];
    } else if (ingredientNames.includes('tôm')) {
      title = 'Tôm xào';
      steps = [
        'Làm sạch tôm, bỏ vỏ và chỉ tôm',
        'Ướp tôm với muối và tiêu',
        'Làm nóng chảo với dầu ăn',
        'Xào tôm cho đến khi chín đỏ',
        'Thêm các nguyên liệu khác và xào đều'
      ];
    }

    // Apply preferences
    const servings = preferences?.servings || 2;
    const estimatedTime = preferences?.timeLimit || this.estimateTimeByDifficulty(
      preferences?.difficulty || Difficulty.EASY
    );
    const difficulty = preferences?.difficulty || Difficulty.EASY;

    // Generate nutrition info (mock values)
    const nutrition: GeneratedNutritionDto = {
      calories: Math.floor(Math.random() * 400) + 200,
      protein: Math.floor(Math.random() * 25) + 10,
      fat: Math.floor(Math.random() * 20) + 5,
      carbs: Math.floor(Math.random() * 30) + 10,
      fiber: Math.floor(Math.random() * 8) + 2
    };

    // Normalize ingredient quantities for serving size
    const normalizedIngredients = ingredients.map(ing => {
      const baseQuantity = parseFloat(ing.quantity) || 1;
      const adjustedQuantity = (baseQuantity * servings / 2).toString(); // Assuming base recipe is for 2 servings
      
      return {
        name: this.capitalizeIngredientName(ing.name),
        quantity: adjustedQuantity,
        unit: ing.unit
      };
    });

    return {
      title,
      steps,
      ingredients: normalizedIngredients,
      servings,
      estimatedTime,
      difficulty,
      nutrition
    };
  }

  /**
   * Estimate cooking time based on difficulty
   */
  private estimateTimeByDifficulty(difficulty: Difficulty): number {
    switch (difficulty) {
      case Difficulty.EASY:
        return Math.floor(Math.random() * 20) + 10; // 10-30 minutes
      case Difficulty.MEDIUM:
        return Math.floor(Math.random() * 30) + 30; // 30-60 minutes
      case Difficulty.HARD:
        return Math.floor(Math.random() * 60) + 60; // 60-120 minutes
      default:
        return 30;
    }
  }

  /**
   * Capitalize ingredient names properly
   */
  private capitalizeIngredientName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Future method for OpenAI integration
   * Uncomment and implement when ready to integrate with actual AI
   */
  /*
  private async generateRecipeWithOpenAI(request: AIGenerationRequest): Promise<AIRecipeResult> {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = this.buildPrompt(request);
    
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    return this.parseAIResponse(response);
  }
  */

  /**
   * Build prompt for AI model
   */
  private buildPrompt(request: AIGenerationRequest): string {
    const { ingredients, preferences } = request;
    
    let prompt = `Tạo một công thức nấu ăn bằng tiếng Việt với các nguyên liệu sau:\n`;
    
    ingredients.forEach(ing => {
      prompt += `- ${ing.name}: ${ing.quantity} ${ing.unit}\n`;
    });

    if (preferences) {
      if (preferences.diet && preferences.diet !== Diet.NONE) {
        prompt += `\nChế độ ăn: ${preferences.diet}\n`;
      }
      if (preferences.difficulty) {
        prompt += `Độ khó: ${preferences.difficulty}\n`;
      }
      if (preferences.timeLimit) {
        prompt += `Thời gian tối đa: ${preferences.timeLimit} phút\n`;
      }
      if (preferences.servings) {
        prompt += `Số khẩu phần: ${preferences.servings}\n`;
      }
      if (preferences.tags && preferences.tags.length > 0) {
        prompt += `Yêu cầu thêm: ${preferences.tags.join(', ')}\n`;
      }
    }

    prompt += `\nVui lòng tạo công thức theo định dạng JSON với các trường:
    - title: tên món ăn
    - steps: mảng các bước nấu ăn
    - ingredients: mảng nguyên liệu với name, quantity, unit
    - servings: số khẩu phần
    - estimatedTime: thời gian nấu (phút)
    - difficulty: easy/medium/hard
    - nutrition: calories, protein, fat, carbs, fiber (tùy chọn)`;

    return prompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(response: string): AIRecipeResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Món ăn không tên',
          steps: parsed.steps || ['Không có hướng dẫn'],
          ingredients: parsed.ingredients || [],
          servings: parsed.servings || 2,
          estimatedTime: parsed.estimatedTime || 30,
          difficulty: parsed.difficulty || Difficulty.EASY,
          nutrition: parsed.nutrition
        };
      }
    } catch (error) {
      // If parsing fails, return fallback
      console.error('Failed to parse AI response:', error);
    }

    // Fallback response
    return {
      title: 'Món ăn tự chế',
      steps: ['Sơ chế nguyên liệu', 'Nấu theo cách thông thường', 'Thưởng thức'],
      ingredients: [],
      servings: 2,
      estimatedTime: 30,
      difficulty: Difficulty.EASY
    };
  }
}
