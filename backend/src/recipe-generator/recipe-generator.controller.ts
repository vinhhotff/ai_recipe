import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecipeGeneratorService } from './recipe-generator.service';
import { 
  GenerateRecipeDto,
  GeneratedRecipeResponseDto,
  SuggestionHistoryDto,
  GenerateRecipeJobStatusDto
} from './dto/recipe-generator.dto';

@ApiTags('Recipe Generator')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecipeGeneratorController {
  constructor(
    private readonly recipeGeneratorService: RecipeGeneratorService
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Generate recipe using AI',
    description: 'Generate a recipe based on provided ingredients and preferences using AI. The system will validate ingredients, calculate pricing, and store the generated recipe.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Recipe generated successfully',
    type: GeneratedRecipeResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid ingredients or preferences' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error - Recipe generation failed' 
  })
  async generateRecipe(
    @Request() req: any,
    @Body() generateRecipeDto: GenerateRecipeDto
  ): Promise<{
    success: boolean;
    message: string;
    data: GeneratedRecipeResponseDto;
  }> {
    try {
      const userId = req.user.id;
      
      const result = await this.recipeGeneratorService.generateRecipe(
        userId, 
        generateRecipeDto
      );

      return {
        success: true,
        message: 'Recipe generated successfully',
        data: result
      };
    } catch (error) {
      throw error; // Let NestJS handle the error response format
    }
  }

  @Get('suggestions/history')
  @ApiOperation({ 
    summary: 'Get recipe generation history',
    description: 'Retrieve the history of recipe generations for the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'History retrieved successfully',
    type: [SuggestionHistoryDto]
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  })
  async getSuggestionHistory(
    @Request() req: any
  ): Promise<{
    success: boolean;
    message: string;
    data: SuggestionHistoryDto[];
  }> {
    const userId = req.user.id;
    
    const history = await this.recipeGeneratorService.getSuggestionHistory(userId);

    return {
      success: true,
      message: 'History retrieved successfully',
      data: history
    };
  }

  @Get('jobs/:jobId/status')
  @ApiOperation({ 
    summary: 'Get recipe generation job status',
    description: 'Check the status of an asynchronous recipe generation job (for future use)'
  })
  @ApiParam({ 
    name: 'jobId', 
    description: 'Job ID to check status for',
    example: 'uuid-123-456-789'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job status retrieved successfully',
    type: GenerateRecipeJobStatusDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Job not found' 
  })
  async getJobStatus(
    @Param('jobId') jobId: string
  ): Promise<{
    success: boolean;
    message: string;
    data: GenerateRecipeJobStatusDto;
  }> {
    const jobStatus = await this.recipeGeneratorService.getJobStatus(jobId);

    return {
      success: true,
      message: 'Job status retrieved successfully',
      data: jobStatus
    };
  }

  // Future endpoints can be added here:
  
  /*
  @Post('generate/async')
  @ApiOperation({ 
    summary: 'Generate recipe asynchronously',
    description: 'Queue a recipe generation job for async processing'
  })
  async generateRecipeAsync(
    @Request() req: any,
    @Body() generateRecipeDto: GenerateRecipeDto
  ) {
    // Implementation for async processing
  }

  @Post('suggestions/feedback')
  @ApiOperation({ 
    summary: 'Provide feedback on generated recipe',
    description: 'Submit feedback to improve AI recipe generation'
  })
  async provideFeedback(
    @Request() req: any,
    @Body() feedbackDto: any
  ) {
    // Implementation for feedback collection
  }

  @Get('suggestions/favorites')
  @ApiOperation({ 
    summary: 'Get favorite generated recipes',
    description: 'Retrieve user\'s favorite AI-generated recipes'
  })
  async getFavoriteGeneratedRecipes(
    @Request() req: any
  ) {
    // Implementation for favorites
  }
  */
}
