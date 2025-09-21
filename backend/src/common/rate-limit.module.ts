import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          // Different limits for different environments
          throttlers: [
            // General API rate limiting
            {
              name: 'default',
              ttl: 60000, // 1 minute
              limit: isProduction ? 100 : 1000, // Stricter in production
            },
            // AI Generation - more restrictive
            {
              name: 'ai-generation',
              ttl: 300000, // 5 minutes
              limit: isProduction ? 10 : 50,
            },
            // Video Generation - most restrictive
            {
              name: 'video-generation',
              ttl: 600000, // 10 minutes
              limit: isProduction ? 5 : 20,
            },
            // Auth endpoints
            {
              name: 'auth',
              ttl: 900000, // 15 minutes
              limit: 10, // Very strict for auth
            },
          ],
          // Use Redis for distributed rate limiting in production
          ...(isProduction && {
            storage: new ThrottlerStorageRedisService({
              host: configService.get('REDIS_HOST', 'localhost'),
              port: parseInt(configService.get('REDIS_PORT', '6379')),
              password: configService.get('REDIS_PASSWORD'),
            }),
          }),
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RateLimitModule {}
