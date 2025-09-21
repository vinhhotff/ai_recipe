import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { RecipeProcessor } from './processors/recipe.processor';
import { RecipeGeneratorModule } from '../recipe-generator/recipe-generator.module';
import { RecipesModule } from '../recipes/recipes.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'recipe-generation',
    }),
    RecipeGeneratorModule,
    RecipesModule,
    PrismaModule,
  ],
  providers: [RecipeProcessor],
})
export class QueueModule {}
