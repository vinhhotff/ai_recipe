import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScalingConfig {
  constructor(private configService: ConfigService) {}

  // Horizontal scaling configuration
  getClusterConfig() {
    return {
      // Enable clustering based on CPU cores
      enabled: this.configService.get('ENABLE_CLUSTERING', 'false') === 'true',
      workers: parseInt(this.configService.get('CLUSTER_WORKERS', '0')) || require('os').cpus().length,
      // Graceful shutdown timeout
      gracefulShutdownTimeout: parseInt(this.configService.get('GRACEFUL_SHUTDOWN_TIMEOUT', '30000')),
    };
  }

  // Load balancing configuration
  getLoadBalancerConfig() {
    return {
      // Health check endpoint
      healthCheckPath: '/api/health',
      healthCheckInterval: parseInt(this.configService.get('HEALTH_CHECK_INTERVAL', '30000')),
      
      // Session affinity for WebSocket connections
      stickySession: this.configService.get('STICKY_SESSION', 'false') === 'true',
      
      // Upstream servers (for nginx/load balancer config)
      upstreamServers: this.configService.get('UPSTREAM_SERVERS', 'localhost:3000').split(','),
    };
  }

  // Auto-scaling configuration
  getAutoScalingConfig() {
    return {
      // CPU threshold for scaling
      cpuThreshold: {
        scaleUp: parseInt(this.configService.get('CPU_SCALE_UP_THRESHOLD', '70')),
        scaleDown: parseInt(this.configService.get('CPU_SCALE_DOWN_THRESHOLD', '30')),
      },
      
      // Memory threshold for scaling
      memoryThreshold: {
        scaleUp: parseInt(this.configService.get('MEMORY_SCALE_UP_THRESHOLD', '80')),
        scaleDown: parseInt(this.configService.get('MEMORY_SCALE_DOWN_THRESHOLD', '40')),
      },
      
      // Request rate threshold
      requestRateThreshold: {
        scaleUp: parseInt(this.configService.get('REQUEST_RATE_SCALE_UP', '1000')),
        scaleDown: parseInt(this.configService.get('REQUEST_RATE_SCALE_DOWN', '200')),
      },
      
      // Scaling limits
      minInstances: parseInt(this.configService.get('MIN_INSTANCES', '2')),
      maxInstances: parseInt(this.configService.get('MAX_INSTANCES', '10')),
      
      // Cooldown periods
      scaleUpCooldown: parseInt(this.configService.get('SCALE_UP_COOLDOWN', '300000')), // 5 minutes
      scaleDownCooldown: parseInt(this.configService.get('SCALE_DOWN_COOLDOWN', '600000')), // 10 minutes
    };
  }

  // Queue configuration for background jobs
  getQueueScalingConfig() {
    return {
      // Worker configuration
      workers: {
        aiGeneration: parseInt(this.configService.get('AI_WORKERS', '2')),
        videoGeneration: parseInt(this.configService.get('VIDEO_WORKERS', '1')),
        emailNotification: parseInt(this.configService.get('EMAIL_WORKERS', '3')),
        analytics: parseInt(this.configService.get('ANALYTICS_WORKERS', '2')),
      },
      
      // Queue priorities
      priorities: {
        high: ['payment-processing', 'user-auth'],
        medium: ['email-notification', 'analytics'],
        low: ['video-generation', 'bulk-operations'],
      },
      
      // Concurrency limits per queue
      concurrency: {
        aiGeneration: parseInt(this.configService.get('AI_CONCURRENCY', '5')),
        videoGeneration: parseInt(this.configService.get('VIDEO_CONCURRENCY', '2')),
        default: parseInt(this.configService.get('DEFAULT_CONCURRENCY', '10')),
      },
    };
  }

  // Database sharding configuration (future-ready)
  getShardingConfig() {
    return {
      enabled: this.configService.get('ENABLE_SHARDING', 'false') === 'true',
      shards: [
        {
          name: 'shard_1',
          connection: this.configService.get('DATABASE_SHARD_1_URL'),
          readReplicas: this.configService.get('DATABASE_SHARD_1_REPLICAS', '').split(',').filter(Boolean),
        },
        {
          name: 'shard_2',
          connection: this.configService.get('DATABASE_SHARD_2_URL'),
          readReplicas: this.configService.get('DATABASE_SHARD_2_REPLICAS', '').split(',').filter(Boolean),
        },
      ],
      // Sharding strategy
      strategy: this.configService.get('SHARDING_STRATEGY', 'user_id'), // user_id, hash, range
    };
  }
}
