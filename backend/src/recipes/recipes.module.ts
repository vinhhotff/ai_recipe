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

// Recipe History functionality
import { RecipeHistoryService } from '../modules/recipe/services/recipe-history.service';
import { RecipeHistoryController, PublicRecipesController } from '../modules/recipe/controllers/recipe-history.controller';

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
    RecipeHistoryService,
  ],
  controllers: [
    RecipesController, 
    CoreRecipesController, 
    DebugController,
    AiRecipeLikeController,
    AiRecipeCommentController,
    RecipeHistoryController,
    PublicRecipesController,
  ],
  exports: [
    RecipesService, 
    CoreRecipesService,
    AiRecipeLikeService,
    AiRecipeCommentService,
    RecipeHistoryService,
  ],
})
export class RecipesModule {}
