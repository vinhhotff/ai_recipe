import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RecipeService } from './services/recipe.service';
import { CreateRecipeDto, UpdateRecipeDto, QueryRecipesDto, GenerateRecipeDto } from './dto/recipe.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('recipes')
@Controller('recipes')
@UsePipes(new ValidationPipe({ transform: true }))
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ 
    summary: 'Get all recipes with filtering and pagination',
    description: 'Public endpoint that returns recipes based on filters. Authenticated users see additional data.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'pasta' })
  @ApiQuery({ name: 'cuisine', required: false, type: String, example: 'Italian' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @ApiQuery({ name: 'tags', required: false, type: String, example: 'Healthy,Vegetarian' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'title', 'totalCalories', 'difficulty'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'createdByAI', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipes retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipes fetched successfully',
        data: [
          {
            id: 'uuid',
            title: 'Spaghetti Carbonara',
            description: 'Classic Italian pasta dish',
            servings: 4,
            totalCalories: 520,
            difficulty: 'medium',
            cuisine: 'Italian',
            createdByAI: false,
            _count: { likes: 15, comments: 3, savedBy: 8 }
          }
        ],
        meta: { total: 100, page: 1, limit: 10, totalPages: 10 }
      }
    }
  })
  async findAll(@Query() query: QueryRecipesDto, @Request() req: any) {
    return this.recipeService.findAll(query, req.user);
  }

  @Get('saved')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get user saved recipes',
    description: 'Get all recipes saved by the authenticated user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Saved recipes retrieved successfully',
  })
  async getUserSavedRecipes(@Query() query: QueryRecipesDto, @Request() req: any) {
    return this.recipeService.getUserSavedRecipes(req.user.id, query);
  }

  @Get('suggestions/ingredients')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ 
    summary: 'Get ingredient suggestions',
    description: 'Get AI-powered ingredient suggestions based on existing ingredients'
  })
  @ApiQuery({ name: 'ingredients', required: true, type: String, example: 'chicken,rice,broccoli' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ingredient suggestions retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Ingredient suggestions fetched successfully',
        data: ['garlic', 'ginger', 'soy sauce', 'sesame oil', 'green onions']
      }
    }
  })
  async getIngredientSuggestions(@Query('ingredients') ingredientsStr: string) {
    const ingredients = ingredientsStr ? ingredientsStr.split(',').map(i => i.trim()) : [];
    return this.recipeService.getIngredientSuggestions(ingredients);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ 
    summary: 'Get a single recipe by ID',
    description: 'Get detailed recipe information including comments and likes. Authenticated users see interaction status.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe fetched successfully',
        data: {
          id: 'uuid',
          title: 'Spaghetti Carbonara',
          description: 'Classic Italian pasta dish',
          ingredients: [{ name: 'Spaghetti', quantity: '400', unit: 'g' }],
          steps: ['Step 1', 'Step 2'],
          comments: [],
          likes: [],
          userInteractions: { isLiked: false, isSaved: true }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to private recipe' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.recipeService.findOne(id, req.user);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new recipe',
    description: 'Create a new recipe. Available to MEMBER and ADMIN users.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Recipe created successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe created successfully',
        data: {
          id: 'uuid',
          title: 'New Recipe',
          slug: 'new-recipe'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied for guest users' })
  async create(@Body() createRecipeDto: CreateRecipeDto, @Request() req: any) {
    // Only MEMBER and ADMIN can create recipes
    if (req.user.role === 'GUEST') {
      throw new ForbiddenException('Guest users cannot create recipes. Please register to become a member.');
    }
    return this.recipeService.create(createRecipeDto, req.user);
  }

  @Post('generate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate recipe using AI',
    description: 'Generate a new recipe using AI based on provided ingredients and preferences. Available to MEMBER and ADMIN users.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'AI recipe generated successfully',
    schema: {
      example: {
        success: true,
        message: 'AI recipe generated successfully',
        data: {
          id: 'uuid',
          title: 'AI Generated Recipe',
          createdByAI: true
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied for guest users' })
  async generateWithAI(@Body() generateRecipeDto: GenerateRecipeDto, @Request() req: any) {
    // Only MEMBER and ADMIN can generate recipes
    if (req.user.role === 'GUEST') {
      throw new ForbiddenException('Guest users cannot generate recipes. Please register to become a member.');
    }
    return this.recipeService.generateWithAI(generateRecipeDto, req.user);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Toggle like on a recipe',
    description: 'Like or unlike a recipe. Available to MEMBER and ADMIN users.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Like status toggled successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe liked successfully',
        data: { isLiked: true }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied for guest users' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  async toggleLike(@Param('id') id: string, @Request() req: any) {
    // Only MEMBER and ADMIN can like recipes
    if (req.user.role === 'GUEST') {
      throw new ForbiddenException('Guest users cannot like recipes. Please register to become a member.');
    }
    return this.recipeService.toggleLike(id, req.user);
  }

  @Post(':id/save')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Toggle save on a recipe',
    description: 'Save or unsave a recipe. Available to MEMBER and ADMIN users.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Save status toggled successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe saved successfully',
        data: { isSaved: true }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied for guest users' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  async toggleSave(@Param('id') id: string, @Request() req: any) {
    // Only MEMBER and ADMIN can save recipes
    if (req.user.role === 'GUEST') {
      throw new ForbiddenException('Guest users cannot save recipes. Please register to become a member.');
    }
    return this.recipeService.toggleSave(id, req.user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.MEMBER, Role.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update a recipe',
    description: 'Update recipe details. Users can only update their own recipes, admins can update any recipe.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe updated successfully',
        data: {
          id: 'uuid',
          title: 'Updated Recipe Title'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied - not recipe owner or admin' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  async update(@Param('id') id: string, @Body() updateRecipeDto: UpdateRecipeDto, @Request() req: any) {
    return this.recipeService.update(id, updateRecipeDto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles([Role.MEMBER, Role.ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a recipe',
    description: 'Soft delete a recipe. Users can only delete their own recipes, admins can delete any recipe.'
  })
  @ApiParam({ name: 'id', type: String, description: 'Recipe UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipe deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Recipe deleted successfully'
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied - not recipe owner or admin' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Recipe not found' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.recipeService.remove(id, req.user);
  }
}
