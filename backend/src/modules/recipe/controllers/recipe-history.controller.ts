import { 
  Controller, 
  Get, 
  Put, 
  Delete, 
  Param, 
  Query, 
  Body,
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  Post
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RecipeHistoryService } from '../services/recipe-history.service';
import { 
  RecipeHistoryQueryDto,
  UpdateRecipeDto,
  RecipeHistoryResponseDto,
  RecipeHistoryItemDto,
  RecipeStatsDto,
  PublicRecipeSearchDto
} from '../dto/recipe-history.dto';
import { RecipeHistoryItem } from '../interfaces/recipe-history.interfaces';

@ApiTags('Recipe History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/recipe-history')
export class RecipeHistoryController {
  constructor(private readonly recipeHistoryService: RecipeHistoryService) {}

  @Get('my-recipes')
  @ApiOperation({ summary: 'Get current user\'s recipe history with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Recipe history retrieved successfully',
    type: RecipeHistoryResponseDto,
  })
  async getMyRecipes(@Request() req: any, @Query() query: RecipeHistoryQueryDto) {
    const filters = {
      search: query.search,
      difficulty: query.difficulty,
      minCalories: query.minCalories,
      maxCalories: query.maxCalories,
      tags: query.tags,
      createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
      createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
    };

    const result = await this.recipeHistoryService.getUserRecipeHistory(
      req.user.id,
      query.page,
      query.limit,
      filters
    );

    return {
      success: true,
      message: 'Recipe history retrieved successfully',
      ...result,
    };
  }

  @Get('recipe/:id')
  @ApiOperation({ summary: 'Get specific recipe by ID with interaction stats' })
  @ApiResponse({
    status: 200,
    description: 'Recipe retrieved successfully',
    type: RecipeHistoryItemDto,
  })
  async getRecipeById(@Request() req: any, @Param('id') recipeId: string) {
    const recipe = await this.recipeHistoryService.getRecipeById(recipeId, req.user.id);

    return {
      success: true,
      message: 'Recipe retrieved successfully',
      data: recipe,
    };
  }

  @Put('recipe/:id')
  @ApiOperation({ summary: 'Update recipe details (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
    type: RecipeHistoryItemDto,
  })
  async updateRecipe(
    @Request() req: any,
    @Param('id') recipeId: string,
    @Body() updateData: UpdateRecipeDto
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    const recipe = await this.recipeHistoryService.updateRecipe(
      recipeId,
      req.user.id,
      updateData,
      isAdmin
    );

    return {
      success: true,
      message: 'Recipe updated successfully',
      data: recipe,
    };
  }

  @Delete('recipe/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete recipe (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Recipe deleted successfully',
  })
  async deleteRecipe(@Request() req: any, @Param('id') recipeId: string) {
    const isAdmin = req.user.role === 'ADMIN';
    await this.recipeHistoryService.deleteRecipe(recipeId, req.user.id, isAdmin);

    return {
      success: true,
      message: 'Recipe deleted successfully',
    };
  }

  @Post('recipe/:id/toggle-visibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle recipe visibility (public/private)' })
  @ApiResponse({
    status: 200,
    description: 'Recipe visibility toggled successfully',
    type: RecipeHistoryItemDto,
  })
  async toggleRecipeVisibility(@Request() req: any, @Param('id') recipeId: string) {
    const isAdmin = req.user.role === 'ADMIN';
    const recipe = await this.recipeHistoryService.toggleRecipeVisibility(
      recipeId,
      req.user.id,
      isAdmin
    );

    return {
      success: true,
      message: `Recipe is now ${recipe.isPublic ? 'public' : 'private'}`,
      data: recipe,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current user\'s recipe statistics' })
  @ApiResponse({
    status: 200,
    description: 'Recipe statistics retrieved successfully',
    type: RecipeStatsDto,
  })
  async getMyStats(@Request() req: any) {
    const stats = await this.recipeHistoryService.getUserRecipeStats(req.user.id);

    return {
      success: true,
      message: 'Recipe statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('public-search')
  @ApiOperation({ summary: 'Search public recipes' })
  @ApiResponse({
    status: 200,
    description: 'Public recipes search results',
    type: RecipeHistoryResponseDto,
  })
  async searchPublicRecipes(@Request() req: any, @Query() query: PublicRecipeSearchDto) {
    const filters = {
      difficulty: query.difficulty,
      minCalories: query.minCalories,
      maxCalories: query.maxCalories,
    };

    const result = await this.recipeHistoryService.searchPublicRecipes(
      query.query,
      req.user.id, // to check if user has liked the recipes
      query.page,
      query.limit,
      filters
    );

    return {
      success: true,
      message: 'Public recipes search completed',
      ...result,
    };
  }
}

// Public controller for non-authenticated access to public recipes
@ApiTags('Public Recipes')
@Controller('api/public-recipes')
export class PublicRecipesController {
  constructor(private readonly recipeHistoryService: RecipeHistoryService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search public recipes (no authentication required)' })
  @ApiResponse({
    status: 200,
    description: 'Public recipes search results',
    type: RecipeHistoryResponseDto,
  })
  async searchPublicRecipes(@Query() query: PublicRecipeSearchDto) {
    const filters = {
      difficulty: query.difficulty,
      minCalories: query.minCalories,
      maxCalories: query.maxCalories,
    };

    const result = await this.recipeHistoryService.searchPublicRecipes(
      query.query,
      undefined, // no user ID for public access
      query.page,
      query.limit,
      filters
    );

    return {
      success: true,
      message: 'Public recipes search completed',
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public recipe by ID (no authentication required)' })
  @ApiResponse({
    status: 200,
    description: 'Public recipe retrieved successfully',
    type: RecipeHistoryItemDto,
  })
  async getPublicRecipeById(@Param('id') recipeId: string) {
    const recipe = await this.recipeHistoryService.getRecipeById(recipeId);

    // Check if recipe is public
    if (!recipe.isPublic) {
      return {
        success: false,
        message: 'Recipe not found or not public',
        statusCode: 404,
      };
    }

    return {
      success: true,
      message: 'Public recipe retrieved successfully',
      data: recipe,
    };
  }
}
