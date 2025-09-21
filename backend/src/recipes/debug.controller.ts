import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecipeGeneratorService } from './recipe-generator.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Debug')
@Controller('debug')
export class DebugController {
  constructor(
    private configService: ConfigService,
    private recipeGeneratorService: RecipeGeneratorService
  ) {}

  @Get('openai-status')
  getOpenAIStatus() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const hasApiKey = !!apiKey;
    const keyPreview = apiKey ? `${apiKey.slice(0, 20)}...` : null;
    
    // Check if OpenAI client exists by checking private property
    const hasOpenAIClient = !!(this.recipeGeneratorService as any).openai;
    
    return {
      hasApiKey,
      keyPreview,
      hasOpenAIClient,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('OPENAI')),
      nodeEnv: this.configService.get('NODE_ENV'),
      timestamp: new Date().toISOString()
    };
  }

  @Get('test-openai-call')
  async testOpenAICall() {
    try {
      // Test a simple OpenAI call
      const result = await this.recipeGeneratorService.generateRecipe({
        ingredients: ['test'],
        servings: 1,
        maxCookingTime: 10
      });
      
      return {
        success: true,
        usedOpenAI: result.data?.title !== 'Món ăn từ test',
        result: result.data?.title
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
