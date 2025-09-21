import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import {
  CreateIngredientDto,
  UpdateIngredientDto,
  ComputeRecipeCostDto,
  RecipeCostResponse,
} from './dto/ingredient.dto';

@ApiTags('Ingredients')
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ingredient' })
  @ApiResponse({
    status: 201,
    description: 'Ingredient created successfully',
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
    description: 'Validation failed or ingredient name already exists',
  })
  create(@Body() createIngredientDto: CreateIngredientDto) {
    return this.ingredientsService.create(createIngredientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ingredients' })
  @ApiResponse({
    status: 200,
    description: 'Ingredients fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'array' },
      },
    },
  })
  findAll() {
    return this.ingredientsService.findAll();
  }

  @Get('units')
  @ApiOperation({ summary: 'Get available units grouped by type' })
  @ApiResponse({
    status: 200,
    description: 'Available units by type',
    schema: {
      type: 'object',
      properties: {
        weight: { type: 'array', items: { type: 'string' } },
        volume: { type: 'array', items: { type: 'string' } },
        count: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  getAvailableUnits() {
    return {
      success: true,
      message: 'Available units fetched successfully',
      data: this.ingredientsService.getAvailableUnits(),
    };
  }

  @Post('compute-recipe-cost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Compute total cost for a recipe',
    description: 'Calculate the total cost of a recipe based on ingredient quantities and current pricing'
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe cost computed successfully',
    type: RecipeCostResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ingredients or units',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more ingredients not found',
  })
  async computeRecipeCost(@Body() computeRecipeCostDto: ComputeRecipeCostDto): Promise<RecipeCostResponse> {
    return this.ingredientsService.computeRecipeCost(computeRecipeCostDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  @ApiResponse({
    status: 200,
    description: 'Ingredient fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Ingredient not found',
  })
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ingredient by ID' })
  @ApiResponse({
    status: 200,
    description: 'Ingredient updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Ingredient not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or ingredient name already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
  ) {
    return this.ingredientsService.update(id, updateIngredientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ingredient by ID (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Ingredient deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Ingredient not found',
  })
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }
}
