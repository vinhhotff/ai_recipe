import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './services/recipe.service';
import { AIRecipeService } from './services/ai-recipe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from '../common/guards/auth.guard';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.register({}), // Configuration will be provided by ConfigService
  ],
  controllers: [RecipeController],
  providers: [
    RecipeService,
    AIRecipeService,
    AuthGuard,
    OptionalAuthGuard,
    RolesGuard,
  ],
  exports: [RecipeService, AIRecipeService],
})
export class RecipeModule {}
