import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { CacheModule } from './common/cache.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PantryModule } from './pantry/pantry.module';
import { RecipesModule } from './recipes/recipes.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { QueueModule } from './queue/queue.module';
import { RecipeGeneratorModule } from './recipe-generator/recipe-generator.module';
import { VideoGeneratorModule } from './video-generator/video-generator.module';
import { MonetizationModule } from './monetization/monetization.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    CacheModule,
    HealthModule,
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    PantryModule,
    RecipesModule,
    IngredientsModule,
    QueueModule,
    RecipeGeneratorModule,
    VideoGeneratorModule,
    MonetizationModule,
    AnalyticsModule,
  ],
})
export class AppModule {}