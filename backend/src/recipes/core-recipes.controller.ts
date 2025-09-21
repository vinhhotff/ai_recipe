import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CoreRecipesService } from './core-recipes.service';
import {
  CreateCoreRecipeDto,
  UpdateCoreRecipeDto,
  QueryCoreRecipeDto,
} from './dto/core-recipe.dto';

@ApiTags('Core Recipes')
@Controller('core-recipes')
export class CoreRecipesController {
  constructor(private readonly coreRecipesService: CoreRecipesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new recipe' })
  @ApiResponse({
    status: 201,
    description: 'Recipe created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or ingredient not found',
  })
  create(@Body() createCoreRecipeDto: CreateCoreRecipeDto) {
    return this.coreRecipesService.create(createCoreRecipeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all recipes with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: 'number', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: 'string', example: 'trứng' })
  @ApiResponse({
    status: 200,
    description: 'Recipes fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array' },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  findAll(@Query() query: QueryCoreRecipeDto) {
    return this.coreRecipesService.findAll(query);
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'Get all available ingredients' })
  @ApiResponse({
    status: 200,
    description: 'Ingredients fetched successfully',
  })
  getIngredients() {
    return this.coreRecipesService.getIngredients();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipe by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  findOne(@Param('id') id: string) {
    return this.coreRecipesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update recipe by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or ingredient not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateCoreRecipeDto: UpdateCoreRecipeDto,
  ) {
    return this.coreRecipesService.update(id, updateCoreRecipeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete recipe by ID (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  remove(@Param('id') id: string) {
    return this.coreRecipesService.remove(id);
  }
}
