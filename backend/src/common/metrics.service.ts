import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private registry: promClient.Registry;
  
  // Application metrics
  private httpRequestDuration: promClient.Histogram;
  private httpRequestTotal: promClient.Counter;
  private activeConnections: promClient.Gauge;
  
  // Business metrics
  private aiRequestsTotal: promClient.Counter;
  private videoGenerationsTotal: promClient.Counter;
  private subscriptionActiveGauge: promClient.Gauge;
  private revenueTotal: promClient.Counter;
  
  // System metrics
  private memoryUsage: promClient.Gauge;
  private cpuUsage: promClient.Gauge;
  private databaseConnections: promClient.Gauge;
  private redisConnections: promClient.Gauge;
  
  // Queue metrics
  private queueJobsTotal: promClient.Counter;
  private queueJobsDuration: promClient.Histogram;
  private queueJobsActive: promClient.Gauge;

  constructor(private configService: ConfigService) {
    this.initializeMetrics();
    this.startSystemMetricsCollection();
  }

  private initializeMetrics() {
    this.registry = new promClient.Registry();
    
    // Add default metrics
    promClient.collectDefaultMetrics({
      register: this.registry,
      prefix: 'recipe_app_',
    });

    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'recipe_app_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'recipe_app_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'recipe_app_active_connections',
      help: 'Number of active connections',
    });

    // Business metrics
    this.aiRequestsTotal = new promClient.Counter({
      name: 'recipe_app_ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['model', 'user_tier', 'status'],
    });

    this.videoGenerationsTotal = new promClient.Counter({
      name: 'recipe_app_video_generations_total',
      help: 'Total number of video generations',
      labelNames: ['user_tier', 'status'],
    });

    this.subscriptionActiveGauge = new promClient.Gauge({
      name: 'recipe_app_subscriptions_active',
      help: 'Number of active subscriptions',
      labelNames: ['tier'],
    });

    this.revenueTotal = new promClient.Counter({
      name: 'recipe_app_revenue_total',
      help: 'Total revenue in cents',
      labelNames: ['subscription_tier', 'currency'],
    });

    // System metrics
    this.memoryUsage = new promClient.Gauge({
      name: 'recipe_app_memory_usage_bytes',
      help: 'Memory usage in bytes',
    });

    this.cpuUsage = new promClient.Gauge({
      name: 'recipe_app_cpu_usage_percent',
      help: 'CPU usage percentage',
    });

    this.databaseConnections = new promClient.Gauge({
      name: 'recipe_app_database_connections',
      help: 'Number of database connections',
      labelNames: ['state'],
    });

    this.redisConnections = new promClient.Gauge({
      name: 'recipe_app_redis_connections',
      help: 'Number of Redis connections',
    });

    // Queue metrics
    this.queueJobsTotal = new promClient.Counter({
      name: 'recipe_app_queue_jobs_total',
      help: 'Total number of queue jobs',
      labelNames: ['queue', 'status'],
    });

    this.queueJobsDuration = new promClient.Histogram({
      name: 'recipe_app_queue_jobs_duration_seconds',
      help: 'Duration of queue jobs in seconds',
      labelNames: ['queue'],
      buckets: [1, 5, 15, 30, 60, 300, 600, 1800],
    });

    this.queueJobsActive = new promClient.Gauge({
      name: 'recipe_app_queue_jobs_active',
      help: 'Number of active queue jobs',
      labelNames: ['queue'],
    });

    // Register all metrics
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.httpRequestTotal);
    this.registry.registerMetric(this.activeConnections);
    this.registry.registerMetric(this.aiRequestsTotal);
    this.registry.registerMetric(this.videoGenerationsTotal);
    this.registry.registerMetric(this.subscriptionActiveGauge);
    this.registry.registerMetric(this.revenueTotal);
    this.registry.registerMetric(this.memoryUsage);
    this.registry.registerMetric(this.cpuUsage);
    this.registry.registerMetric(this.databaseConnections);
    this.registry.registerMetric(this.redisConnections);
    this.registry.registerMetric(this.queueJobsTotal);
    this.registry.registerMetric(this.queueJobsDuration);
    this.registry.registerMetric(this.queueJobsActive);
  }

  private startSystemMetricsCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set(memUsage.heapUsed);
    
    // CPU usage would require additional monitoring
    // This is a placeholder - in production use proper CPU monitoring
    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set((cpuUsage.user + cpuUsage.system) / 1000000); // Convert to seconds
  }

  // HTTP metrics methods
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestTotal.inc({ method, route, status: status.toString() });
    this.httpRequestDuration.observe({ method, route, status: status.toString() }, duration);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // Business metrics methods
  recordAIRequest(model: string, userTier: string, status: 'success' | 'error') {
    this.aiRequestsTotal.inc({ model, user_tier: userTier, status });
  }

  recordVideoGeneration(userTier: string, status: 'success' | 'error') {
    this.videoGenerationsTotal.inc({ user_tier: userTier, status });
  }

  setActiveSubscriptions(tier: string, count: number) {
    this.subscriptionActiveGauge.set({ tier }, count);
  }

  recordRevenue(amount: number, subscriptionTier: string, currency = 'USD') {
    this.revenueTotal.inc({ subscription_tier: subscriptionTier, currency }, amount);
  }

  // Database metrics methods
  setDatabaseConnections(active: number, idle: number) {
    this.databaseConnections.set({ state: 'active' }, active);
    this.databaseConnections.set({ state: 'idle' }, idle);
  }

  setRedisConnections(count: number) {
    this.redisConnections.set(count);
  }

  // Queue metrics methods
  recordQueueJob(queue: string, status: 'completed' | 'failed') {
    this.queueJobsTotal.inc({ queue, status });
  }

  recordQueueJobDuration(queue: string, duration: number) {
    this.queueJobsDuration.observe({ queue }, duration);
  }

  setActiveQueueJobs(queue: string, count: number) {
    this.queueJobsActive.set({ queue }, count);
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get custom metrics for internal monitoring
  async getCustomMetrics() {
    return {
      httpRequestsPerMinute: await this.httpRequestTotal.get(),
      avgResponseTime: await this.httpRequestDuration.get(),
      activeConnections: await this.activeConnections.get(),
      aiRequestsToday: await this.aiRequestsTotal.get(),
      videoGenerationsToday: await this.videoGenerationsTotal.get(),
      memoryUsageMB: (await this.memoryUsage.get()).values[0]?.value / (1024 * 1024),
    };
  }
}
