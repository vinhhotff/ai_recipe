import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AppLoggerService } from '../common/logger.service';
import { MetricsService } from '../common/metrics.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    storage: ServiceHealth;
    ai: ServiceHealth;
    video: ServiceHealth;
    queue: ServiceHealth;
    external: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    connections: ConnectionMetrics;
  };
  alerts?: Alert[];
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  lastChecked: string;
}

interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface CpuMetrics {
  percentage: number;
  loadAverage: number[];
}

interface ConnectionMetrics {
  database: number;
  redis: number;
  websocket: number;
}

interface Alert {
  level: 'warning' | 'critical';
  service: string;
  message: string;
  timestamp: string;
}

@Injectable()
export class EnhancedHealthService {
  private healthCache: HealthCheckResult | null = null;
  private cacheExpiry: number = 0;
  private alerts: Alert[] = [];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private logger: AppLoggerService,
    private metrics: MetricsService,
  ) {
    // Start periodic health checks
    this.startPeriodicHealthChecks();
  }

  private startPeriodicHealthChecks() {
    // Run health checks every 30 seconds
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);
  }

  async getHealthStatus(): Promise<HealthCheckResult> {
    // Return cached result if still valid (cache for 10 seconds)
    if (this.healthCache && Date.now() < this.cacheExpiry) {
      return this.healthCache;
    }

    return this.performHealthCheck();
  }

  private async performHealthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const services = await this.checkAllServices();
      const metrics = await this.getSystemMetrics();
      const overallStatus = this.determineOverallStatus(services);

      const healthResult: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.configService.get('APP_VERSION', '1.0.0'),
        services,
        metrics,
        alerts: this.alerts.slice(-10), // Last 10 alerts
      };

      // Cache the result
      this.healthCache = healthResult;
      this.cacheExpiry = Date.now() + 10000; // Cache for 10 seconds

      // Log health check result
      this.logger.logSystemMetrics({
        healthStatus: overallStatus,
        responseTime: Date.now() - start,
        servicesHealthy: Object.values(services).filter(s => s.status === 'healthy').length,
        servicesTotal: Object.keys(services).length,
      });

      return healthResult;
    } catch (error) {
      this.logger.error('Health check failed', error.stack, 'HealthService');
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: this.configService.get('APP_VERSION', '1.0.0'),
        services: {} as any,
        metrics: {} as any,
        alerts: [
          {
            level: 'critical',
            service: 'health-check',
            message: 'Health check system failure',
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }
  }

  private async checkAllServices() {
    const [database, redis, storage, ai, video, queue, external] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkAI(),
      this.checkVideo(),
      this.checkQueue(),
      this.checkExternalServices(),
    ]);

    return {
      database: this.getServiceResult(database),
      redis: this.getServiceResult(redis),
      storage: this.getServiceResult(storage),
      ai: this.getServiceResult(ai),
      video: this.getServiceResult(video),
      queue: this.getServiceResult(queue),
      external: this.getServiceResult(external),
    };
  }

  private getServiceResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    
    return {
      status: 'unhealthy',
      responseTime: 0,
      message: result.reason.message || 'Service check failed',
      lastChecked: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    
    try {
      // Simple query to test database connectivity
      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        this.addAlert('warning', 'database', `Database response time high: ${responseTime}ms`);
        return {
          status: 'degraded',
          responseTime,
          message: 'High response time',
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('critical', 'database', 'Database connection failed');
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    
    try {
      // This would need to be implemented based on your Redis client
      // For now, returning a mock response
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('critical', 'redis', 'Redis connection failed');
      throw new Error(`Redis check failed: ${error.message}`);
    }
  }

  private async checkStorage(): Promise<ServiceHealth> {
    // Check file storage/S3 connectivity
    const start = Date.now();
    
    try {
      // Mock storage check - implement based on your storage provider
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('warning', 'storage', 'Storage service degraded');
      return {
        status: 'degraded',
        responseTime: Date.now() - start,
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkAI(): Promise<ServiceHealth> {
    // Check AI service availability
    const start = Date.now();
    
    try {
      // Mock AI service check
      const responseTime = Date.now() - start;
      
      if (responseTime > 5000) {
        return {
          status: 'degraded',
          responseTime,
          message: 'AI service slow response',
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('warning', 'ai', 'AI service unavailable');
      throw new Error(`AI service check failed: ${error.message}`);
    }
  }

  private async checkVideo(): Promise<ServiceHealth> {
    // Check video generation service
    const start = Date.now();
    
    try {
      // Mock video service check
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('warning', 'video', 'Video generation service unavailable');
      return {
        status: 'degraded',
        responseTime: Date.now() - start,
        message: error.message,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async checkQueue(): Promise<ServiceHealth> {
    // Check queue system health
    const start = Date.now();
    
    try {
      // Mock queue health check
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.addAlert('critical', 'queue', 'Queue system failure');
      throw new Error(`Queue check failed: ${error.message}`);
    }
  }

  private async checkExternalServices(): Promise<ServiceHealth> {
    // Check external API dependencies
    const start = Date.now();
    
    try {
      // Mock external services check
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        responseTime: Date.now() - start,
        message: 'Some external services unavailable',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const loadAvg = require('os').loadavg();

    return {
      memory: {
        used: memUsage.rss,
        total: totalMemory,
        percentage: (memUsage.rss / totalMemory) * 100,
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        },
      },
      cpu: {
        percentage: 0, // Would need proper CPU monitoring library
        loadAverage: loadAvg,
      },
      connections: {
        database: 0, // Would need to query actual connections
        redis: 0,
        websocket: 0,
      },
    };
  }

  private determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services);
    
    const unhealthyCount = serviceStatuses.filter(s => s.status === 'unhealthy').length;
    const degradedCount = serviceStatuses.filter(s => s.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    }
    
    if (degradedCount > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private addAlert(level: 'warning' | 'critical', service: string, message: string) {
    const alert: Alert = {
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
    };
    
    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
    
    // Log the alert
    this.logger.warn(`Health Alert [${level.toUpperCase()}] ${service}: ${message}`, 'HealthService');
  }
}
