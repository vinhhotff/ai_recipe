import { Module } from '@nestjs/common';
import { RecipeGeneratorController } from './recipe-generator.controller';
import { RecipeGeneratorService } from './recipe-generator.service';
import { AIService } from './services/ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IngredientsModule } from '../ingredients/ingredients.module';

@Module({
  imports: [
    PrismaModule,
    IngredientsModule, // Import to access IngredientService for pricing
  ],
  controllers: [RecipeGeneratorController],
  providers: [
    RecipeGeneratorService,
    AIService,
  ],
  exports: [
    RecipeGeneratorService, // Export in case other modules need to access
  ],
})
export class RecipeGeneratorModule {}
