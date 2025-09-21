import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { RecipeGeneratorService } from './recipe-generator.service';
import { VideoGeneratorService } from './video-generator.service';
import { CoreRecipesService } from './core-recipes.service';
import { CoreRecipesController } from './core-recipes.controller';
import { DebugController } from './debug.controller';

// Prisma for database access
import { PrismaModule } from '../prisma/prisma.module';

// AI Recipe interactions
import { AiRecipeLikeService } from '../modules/recipe/services/ai-recipe-like.service';
import { AiRecipeCommentService } from '../modules/recipe/services/ai-recipe-comment.service';
import { AiRecipeLikeController } from '../modules/recipe/controllers/ai-recipe-like.controller';
import { AiRecipeCommentController } from '../modules/recipe/controllers/ai-recipe-comment.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
    PrismaModule,
  ],
  providers: [
    RecipesService, 
    RecipeGeneratorService, 
    VideoGeneratorService, 
    CoreRecipesService,
    AiRecipeLikeService,
    AiRecipeCommentService,
  ],
  controllers: [
    RecipesController, 
    CoreRecipesController, 
    DebugController,
    AiRecipeLikeController,
    AiRecipeCommentController,
  ],
  exports: [
    RecipesService, 
    CoreRecipesService,
    AiRecipeLikeService,
    AiRecipeCommentService,
  ],
})
export class RecipesModule {}
