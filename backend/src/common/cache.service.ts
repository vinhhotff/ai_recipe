import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = this.configService.get('REDIS_ENABLED', 'true') === 'true';
    
    if (this.isEnabled) {
      const redisConfig = {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: Number(this.configService.get('REDIS_PORT', 6379)),
        ...(this.configService.get('REDIS_PASSWORD') && {
          password: this.configService.get('REDIS_PASSWORD')
        }),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };
      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected');
      });

      this.redis.on('error', (err) => {
        this.logger.warn('⚠️ Redis connection error:', err.message);
      });
    } else {
      this.logger.warn('📦 Redis caching disabled');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}:`, error.message);
    }
    
    return null;
  }

  /**
   * Set value in cache with TTL (time to live in seconds)
   */
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}:`, error.message);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Cache del error for key ${key}:`, error.message);
    }
  }

  /**
   * Get or set value with automatic caching
   */
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    const value = await fetchFn();
    
    // Cache the result
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache keys with pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.warn(`Cache pattern invalidation error for ${pattern}:`, error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.isEnabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        enabled: true,
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || !this.redis) {
      return;
    }

    try {
      await this.redis.flushdb();
      this.logger.log('🗑️ Cache flushed');
    } catch (error) {
      this.logger.warn('Cache flush error:', error.message);
    }
  }

  // Predefined cache keys and TTLs
  static readonly KEYS = {
    SUBSCRIPTION_PLANS: 'subscription:plans',
    USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
    INGREDIENTS: 'ingredients:all',
    ANALYTICS_OVERVIEW: 'analytics:overview',
    TRENDING_RECIPES: 'recipes:trending',
  };

  static readonly TTL = {
    SHORT: 60,        // 1 minute
    MEDIUM: 300,      // 5 minutes  
    LONG: 900,        // 15 minutes
    VERY_LONG: 3600,  // 1 hour
    DAILY: 86400,     // 24 hours
  };

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}
