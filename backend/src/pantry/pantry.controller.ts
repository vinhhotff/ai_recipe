import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { PantryService } from './pantry.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePantryItemDto } from './dto/create-pantry-item.dto';
import { UpdatePantryItemDto } from './dto/update-pantry-item.dto';

@ApiTags('Pantry')
@Controller('pantry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Post()
  @ApiOperation({ summary: 'Add item to pantry' })
  create(@Request() req, @Body() createPantryItemDto: CreatePantryItemDto) {
    return this.pantryService.create(req.user.id, createPantryItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pantry items' })
  findAll(@Request() req) {
    return this.pantryService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pantry item by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.pantryService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pantry item' })
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updatePantryItemDto: UpdatePantryItemDto,
  ) {
    return this.pantryService.update(id, req.user.id, updatePantryItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove pantry item' })
  remove(@Param('id') id: string, @Request() req) {
    return this.pantryService.remove(id, req.user.id);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image for ingredient recognition' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.pantryService.recognizeIngredients(file.buffer, file.originalname);
  }
}