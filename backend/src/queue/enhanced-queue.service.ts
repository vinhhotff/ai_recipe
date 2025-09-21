import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../common/logger.service';
import { MetricsService } from '../common/metrics.service';
import { CostTrackingService } from '../common/cost-tracking.service';

export interface QueueJob {
  id: string;
  type: 'ai_generation' | 'video_generation' | 'email' | 'analytics' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  userId: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  batchId?: string;
}

export interface BatchJob {
  id: string;
  type: string;
  jobs: QueueJob[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: any[];
  errors?: string[];
}

@Injectable()
export class EnhancedQueueService implements OnModuleInit {
  private queues = new Map<string, QueueJob[]>();
  private batches = new Map<string, BatchJob>();
  private workers = new Map<string, boolean>();
  private processingStats = new Map<string, { processed: number; failed: number; avgDuration: number }>();
  
  // Configuration
  private readonly config = {
    maxConcurrentJobs: {
      ai_generation: 5,
      video_generation: 2,
      email: 10,
      analytics: 3,
      cleanup: 1,
    },
    batchSizes: {
      ai_generation: 3,
      email: 20,
      analytics: 50,
    },
    batchTimeouts: {
      ai_generation: 30000, // 30 seconds
      email: 10000, // 10 seconds
      analytics: 60000, // 1 minute
    },
    retryDelays: [1000, 5000, 15000, 30000], // Exponential backoff
    priorityWeights: { high: 10, medium: 5, low: 1 },
  };

  constructor(
    private configService: ConfigService,
    private logger: AppLoggerService,
    private metrics: MetricsService,
    private costTracking: CostTrackingService,
  ) {
    this.initializeQueues();
  }

  async onModuleInit() {
    this.startWorkers();
    this.startBatchProcessing();
    this.startMetricsCollection();
  }

  private initializeQueues() {
    const queueTypes = ['ai_generation', 'video_generation', 'email', 'analytics', 'cleanup'];
    queueTypes.forEach(type => {
      this.queues.set(type, []);
      this.processingStats.set(type, { processed: 0, failed: 0, avgDuration: 0 });
    });
  }

  async addJob(job: Omit<QueueJob, 'id' | 'attempts' | 'createdAt'>): Promise<string> {
    const fullJob: QueueJob = {
      ...job,
      id: this.generateJobId(),
      attempts: 0,
      createdAt: new Date(),
    };

    // Check if this job type should be batched
    if (this.shouldBatch(job.type)) {
      return this.addToBatch(fullJob);
    }

    // Add to appropriate queue
    const queue = this.queues.get(job.type) || [];
    queue.push(fullJob);
    
    // Sort by priority
    queue.sort((a, b) => this.priorityWeights[b.priority] - this.priorityWeights[a.priority]);
    
    this.queues.set(job.type, queue);
    
    this.logger.log(`Job ${fullJob.id} added to ${job.type} queue`, 'EnhancedQueue');
    this.metrics.setActiveQueueJobs(job.type, queue.length);
    
    return fullJob.id;
  }

  private shouldBatch(jobType: string): boolean {
    return jobType in this.config.batchSizes;
  }

  private async addToBatch(job: QueueJob): Promise<string> {
    // Find existing batch or create new one
    let batch = this.findPendingBatch(job.type);
    
    if (!batch) {
      batch = this.createBatch(job.type);
    }
    
    job.batchId = batch.id;
    batch.jobs.push(job);
    
    // Check if batch is ready for processing
    if (this.isBatchReady(batch)) {
      await this.processBatch(batch);
    }
    
    return job.id;
  }

  private findPendingBatch(type: string): BatchJob | null {
    for (const batch of this.batches.values()) {
      if (batch.type === type && batch.status === 'pending') {
        return batch;
      }
    }
    return null;
  }

  private createBatch(type: string): BatchJob {
    const batch: BatchJob = {
      id: this.generateBatchId(),
      type,
      jobs: [],
      status: 'pending',
      createdAt: new Date(),
    };
    
    this.batches.set(batch.id, batch);
    
    // Set timeout for batch processing
    setTimeout(() => {
      if (batch.status === 'pending') {
        this.processBatch(batch);
      }
    }, this.config.batchTimeouts[type] || 30000);
    
    return batch;
  }

  private isBatchReady(batch: BatchJob): boolean {
    const batchSize = this.config.batchSizes[batch.type] || 1;
    return batch.jobs.length >= batchSize;
  }

  private async processBatch(batch: BatchJob): Promise<void> {
    if (batch.status !== 'pending') return;
    
    batch.status = 'processing';
    batch.startedAt = new Date();
    
    this.logger.log(`Processing batch ${batch.id} with ${batch.jobs.length} jobs`, 'EnhancedQueue');
    
    try {
      const results = await this.executeBatchJobs(batch);
      
      batch.status = 'completed';
      batch.completedAt = new Date();
      batch.results = results;
      
      // Update metrics
      batch.jobs.forEach(job => {
        this.metrics.recordQueueJob(job.type, 'completed');
        const duration = (batch.completedAt!.getTime() - batch.startedAt!.getTime()) / 1000;
        this.metrics.recordQueueJobDuration(job.type, duration);
      });
      
      this.logger.log(`Batch ${batch.id} completed successfully`, 'EnhancedQueue');
      
    } catch (error) {
      batch.status = 'failed';
      batch.errors = [error.message];
      
      // Retry individual jobs
      await this.retryFailedBatchJobs(batch);
      
      this.logger.error(`Batch ${batch.id} failed: ${error.message}`, error.stack, 'EnhancedQueue');
    }
  }

  private async executeBatchJobs(batch: BatchJob): Promise<any[]> {
    switch (batch.type) {
      case 'ai_generation':
        return this.executeAIBatch(batch.jobs);
      case 'email':
        return this.executeEmailBatch(batch.jobs);
      case 'analytics':
        return this.executeAnalyticsBatch(batch.jobs);
      default:
        throw new Error(`Unsupported batch type: ${batch.type}`);
    }
  }

  private async executeAIBatch(jobs: QueueJob[]): Promise<any[]> {
    const results = [];
    
    for (const job of jobs) {
      try {
        // Simulate AI processing with cost tracking
        const result = await this.processAIJob(job);
        results.push({ jobId: job.id, result });
        
        // Track cost
        await this.costTracking.trackUsage({
          userId: job.userId,
          feature: 'ai_generation',
          model: job.data.model || 'gpt-3.5-turbo',
          tokensUsed: result.tokensUsed || 0,
          cost: await this.costTracking.calculateAICost(
            job.data.model || 'gpt-3.5-turbo',
            result.inputTokens || 0,
            result.outputTokens || 0
          ),
          currency: 'USD',
        });
        
      } catch (error) {
        results.push({ jobId: job.id, error: error.message });
      }
    }
    
    return results;
  }

  private async executeEmailBatch(jobs: QueueJob[]): Promise<any[]> {
    // Batch email sending for efficiency
    const emailGroups = new Map<string, QueueJob[]>();
    
    // Group by email template
    jobs.forEach(job => {
      const template = job.data.template || 'default';
      if (!emailGroups.has(template)) {
        emailGroups.set(template, []);
      }
      emailGroups.get(template)!.push(job);
    });
    
    const results = [];
    
    for (const [template, templateJobs] of emailGroups) {
      try {
        // Send emails in batch
        const batchResult = await this.sendEmailBatch(templateJobs);
        results.push(...batchResult);
      } catch (error) {
        templateJobs.forEach(job => {
          results.push({ jobId: job.id, error: error.message });
        });
      }
    }
    
    return results;
  }

  private async executeAnalyticsBatch(jobs: QueueJob[]): Promise<any[]> {
    // Batch analytics processing
    const results = [];
    
    try {
      const aggregatedData = this.aggregateAnalyticsJobs(jobs);
      const result = await this.processAnalyticsData(aggregatedData);
      
      jobs.forEach(job => {
        results.push({ jobId: job.id, result: result[job.id] });
      });
      
    } catch (error) {
      jobs.forEach(job => {
        results.push({ jobId: job.id, error: error.message });
      });
    }
    
    return results;
  }

  private startWorkers() {
    for (const queueType of this.queues.keys()) {
      const concurrency = this.config.maxConcurrentJobs[queueType] || 1;
      
      for (let i = 0; i < concurrency; i++) {
        this.startWorker(queueType, i);
      }
    }
  }

  private startWorker(queueType: string, workerId: number) {
    const workerKey = `${queueType}-${workerId}`;
    
    if (this.workers.get(workerKey)) return;
    
    this.workers.set(workerKey, true);
    
    const processJobs = async () => {
      while (this.workers.get(workerKey)) {
        try {
          const queue = this.queues.get(queueType) || [];
          const job = queue.shift();
          
          if (job) {
            await this.processJob(job);
            this.metrics.setActiveQueueJobs(queueType, queue.length);
          } else {
            // No jobs, wait a bit
            await this.sleep(1000);
          }
        } catch (error) {
          this.logger.error(`Worker ${workerKey} error: ${error.message}`, error.stack, 'EnhancedQueue');
          await this.sleep(5000); // Wait longer on error
        }
      }
    };
    
    processJobs();
    this.logger.log(`Started worker ${workerKey}`, 'EnhancedQueue');
  }

  private async processJob(job: QueueJob): Promise<void> {
    const start = Date.now();
    job.attempts++;
    
    try {
      let result;
      
      switch (job.type) {
        case 'ai_generation':
          result = await this.processAIJob(job);
          break;
        case 'video_generation':
          result = await this.processVideoJob(job);
          break;
        case 'email':
          result = await this.processEmailJob(job);
          break;
        case 'analytics':
          result = await this.processAnalyticsJob(job);
          break;
        case 'cleanup':
          result = await this.processCleanupJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      const duration = (Date.now() - start) / 1000;
      
      // Update stats
      const stats = this.processingStats.get(job.type)!;
      stats.processed++;
      stats.avgDuration = (stats.avgDuration * (stats.processed - 1) + duration) / stats.processed;
      
      this.metrics.recordQueueJob(job.type, 'completed');
      this.metrics.recordQueueJobDuration(job.type, duration);
      
      this.logger.log(`Job ${job.id} completed in ${duration}s`, 'EnhancedQueue');
      
    } catch (error) {
      await this.handleJobError(job, error);
    }
  }

  private async handleJobError(job: QueueJob, error: any): Promise<void> {
    const stats = this.processingStats.get(job.type)!;
    stats.failed++;
    
    this.metrics.recordQueueJob(job.type, 'failed');
    
    if (job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const delay = this.config.retryDelays[job.attempts - 1] || 30000;
      
      setTimeout(() => {
        const queue = this.queues.get(job.type) || [];
        queue.push(job);
        this.queues.set(job.type, queue);
      }, delay);
      
      this.logger.warn(`Job ${job.id} failed, retrying in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`, 'EnhancedQueue');
    } else {
      this.logger.error(`Job ${job.id} failed permanently after ${job.attempts} attempts: ${error.message}`, error.stack, 'EnhancedQueue');
    }
  }

  private startBatchProcessing() {
    setInterval(() => {
      // Process any pending batches that have timed out
      for (const batch of this.batches.values()) {
        if (batch.status === 'pending') {
          const timeSinceCreated = Date.now() - batch.createdAt.getTime();
          const timeout = this.config.batchTimeouts[batch.type] || 30000;
          
          if (timeSinceCreated > timeout) {
            this.processBatch(batch);
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private startMetricsCollection() {
    setInterval(() => {
      // Update queue metrics
      for (const [queueType, queue] of this.queues) {
        this.metrics.setActiveQueueJobs(queueType, queue.length);
      }
      
      // Log processing stats
      for (const [queueType, stats] of this.processingStats) {
        this.logger.logSystemMetrics({
          queueType,
          processed: stats.processed,
          failed: stats.failed,
          avgDuration: stats.avgDuration,
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Job processing methods (placeholders)
  private async processAIJob(job: QueueJob): Promise<any> {
    // Simulate AI processing
    await this.sleep(2000);
    return { response: 'AI generated content', tokensUsed: 150, inputTokens: 50, outputTokens: 100 };
  }

  private async processVideoJob(job: QueueJob): Promise<any> {
    // Simulate video processing
    await this.sleep(10000);
    return { videoUrl: 'https://example.com/video.mp4', duration: 30 };
  }

  private async processEmailJob(job: QueueJob): Promise<any> {
    // Simulate email sending
    await this.sleep(500);
    return { sent: true, messageId: 'msg_123' };
  }

  private async processAnalyticsJob(job: QueueJob): Promise<any> {
    // Simulate analytics processing
    await this.sleep(1000);
    return { processed: true, metrics: { views: 100, clicks: 10 } };
  }

  private async processCleanupJob(job: QueueJob): Promise<any> {
    // Simulate cleanup processing
    await this.sleep(3000);
    return { cleaned: true, itemsRemoved: 25 };
  }

  private async sendEmailBatch(jobs: QueueJob[]): Promise<any[]> {
    // Simulate batch email sending
    await this.sleep(1000);
    return jobs.map(job => ({ jobId: job.id, sent: true, messageId: `msg_${job.id}` }));
  }

  private aggregateAnalyticsJobs(jobs: QueueJob[]): any {
    return {
      totalJobs: jobs.length,
      userIds: jobs.map(job => job.userId),
      data: jobs.map(job => job.data),
    };
  }

  private async processAnalyticsData(aggregatedData: any): Promise<any> {
    // Simulate analytics processing
    await this.sleep(2000);
    const results = {};
    
    aggregatedData.data.forEach((data, index) => {
      results[aggregatedData.userIds[index]] = { processed: true, metrics: data };
    });
    
    return results;
  }

  private async retryFailedBatchJobs(batch: BatchJob): Promise<void> {
    // Add failed jobs back to individual queues for retry
    for (const job of batch.jobs) {
      if (job.attempts < job.maxAttempts) {
        job.batchId = undefined; // Remove from batch
        await this.addJob(job);
      }
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private get priorityWeights() {
    return this.config.priorityWeights;
  }

  // Public API methods
  async getQueueStats(): Promise<any> {
    const stats = {};
    
    for (const [queueType, queue] of this.queues) {
      const processingStats = this.processingStats.get(queueType)!;
      stats[queueType] = {
        pending: queue.length,
        processed: processingStats.processed,
        failed: processingStats.failed,
        avgDuration: processingStats.avgDuration,
      };
    }
    
    return stats;
  }

  async getBatchStats(): Promise<any> {
    const stats = {
      total: this.batches.size,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    
    for (const batch of this.batches.values()) {
      stats[batch.status]++;
    }
    
    return stats;
  }
}
