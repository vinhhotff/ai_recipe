import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getHealthStatus() {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    
    const services = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
    };

    const allHealthy = Object.values(services).every(status => status === 'healthy');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      services,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  async getReadinessStatus() {
    const services = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
    };

    const ready = Object.values(services).every(status => status === 'healthy');

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services
    };
  }

  async getLivenessStatus() {
    // Basic liveness check - just return that the process is running
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      // Simple database connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  private async checkCache(): Promise<string> {
    try {
      // Test cache connectivity
      const testKey = 'health-check';
      const testValue = Date.now().toString();
      
      await this.cacheService.set(testKey, testValue, 10); // 10 second TTL
      const retrieved = await this.cacheService.get(testKey);
      
      if (retrieved === testValue) {
        await this.cacheService.del(testKey); // Clean up
        return 'healthy';
      }
      
      return 'degraded'; // Cache exists but not working properly
    } catch (error) {
      return 'degraded'; // Cache not available but not critical
    }
  }
}
