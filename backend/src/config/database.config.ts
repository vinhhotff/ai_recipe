import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  getPrismaConfig() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    
    return {
      datasource: {
        url: this.configService.get('DATABASE_URL'),
      },
      // Connection pooling configuration
      datasources: {
        db: {
          url: this.configService.get('DATABASE_URL'),
          // Production connection pool settings
          ...(isProduction && {
            connection_limit: parseInt(this.configService.get('DB_CONNECTION_LIMIT', '20')),
            pool_timeout: parseInt(this.configService.get('DB_POOL_TIMEOUT', '10')),
          }),
        },
      },
      // Query optimization
      log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
      errorFormat: 'minimal',
    };
  }

  getRedisConfig() {
    return {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379')),
      password: this.configService.get('REDIS_PASSWORD'),
      db: parseInt(this.configService.get('REDIS_DB', '0')),
      // Connection pool settings
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      // Memory optimization
      maxMemoryPolicy: 'allkeys-lru',
    };
  }

  // Database performance monitoring queries
  async getDatabasePerformanceMetrics() {
    return {
      connectionPoolSize: this.configService.get('DB_CONNECTION_LIMIT', '20'),
      activeConnections: 'SELECT count(*) FROM pg_stat_activity WHERE state = \'active\'',
      longRunningQueries: `
        SELECT query, query_start, now() - query_start AS duration 
        FROM pg_stat_activity 
        WHERE now() - query_start > interval '5 minutes'
      `,
      databaseSize: 'SELECT pg_size_pretty(pg_database_size(current_database()))',
    };
  }
}
