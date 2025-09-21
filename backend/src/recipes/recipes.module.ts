import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipeGeneratorService } from './recipe-generator.service';
import { VideoGeneratorService } from './video-generator.service';
import { CoreRecipesService } from './core-recipes.service';
import { CoreRecipesController } from './core-recipes.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
  ],
  providers: [RecipesService, RecipeGeneratorService, VideoGeneratorService, CoreRecipesService],
  controllers: [RecipesController, CoreRecipesController],
  exports: [RecipesService, CoreRecipesService],
})
export class RecipesModule {}
