import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  GenerateRecipeVideoDto, 
  GeneratedVideoResponseDto, 
  VideoStatusResponseDto,
  VideoListResponseDto,
  VideoGenerationStatsDto,
  VideoStyle,
  VoiceType,
  VideoResolution 
} from './dto/video-generator.dto';
import { 
  VideoGenerationStatus, 
  JobStatus,
  Recipe, 
  RecipeVideo 
} from '@prisma/client';

export interface VideoGenerationJob {
  recipeVideoId: string;
  recipeId: string;
  recipe: Recipe;
  options: GenerateRecipeVideoDto;
  userId: string;
}

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a video for a recipe
   */
  async generateVideo(
    userId: string, 
    generateVideoDto: GenerateRecipeVideoDto
  ): Promise<GeneratedVideoResponseDto> {
    const startTime = Date.now();

    try {
      // 1. Validate recipe exists and user has access
      const recipe = await this.validateRecipeAccess(generateVideoDto.recipeId, userId);

      // 2. Check if video generation is already in progress for this recipe
      const existingVideo = await this.prisma.recipeVideo.findFirst({
        where: {
          recipeId: generateVideoDto.recipeId,
          status: {
            in: [VideoGenerationStatus.PENDING, VideoGenerationStatus.PROCESSING]
          }
        }
      });

      if (existingVideo) {
        return this.mapToResponseDto(existingVideo);
      }

      // 3. Create video record in database
      const recipeVideo = await this.prisma.recipeVideo.create({
        data: {
          recipeId: generateVideoDto.recipeId,
          status: VideoGenerationStatus.PENDING,
          style: generateVideoDto.style || VideoStyle.STEP_BY_STEP,
          narration: generateVideoDto.narration ?? true,
          voice: generateVideoDto.voice || VoiceType.FEMALE_VIETNAMESE,
          resolution: generateVideoDto.resolution || VideoResolution.HD_720P,
          generatedBy: userId,
          metadata: {
            maxDuration: generateVideoDto.maxDuration || 120,
            backgroundMusic: generateVideoDto.backgroundMusic ?? true,
            musicGenre: generateVideoDto.musicGenre || 'cooking',
            requestedAt: new Date().toISOString()
          }
        }
      });

      // 4. Queue video generation job
      const jobPayload = {
        recipeVideoId: recipeVideo.id,
        recipeId: generateVideoDto.recipeId,
        recipe: recipe,
        options: generateVideoDto,
        userId
      };

      const job = await this.prisma.aIJobQueue.create({
        data: {
          type: 'video_generation',
          payload: jobPayload as any,
          status: JobStatus.QUEUED,
          scheduledAt: new Date()
        }
      });

      // 5. Update video record with job ID
      await this.prisma.recipeVideo.update({
        where: { id: recipeVideo.id },
        data: { jobId: job.id }
      });

      // 6. Start async processing (in production, this would be handled by a queue worker)
      this.processVideoGenerationAsync(job.id, jobPayload);

      const processingTime = Date.now() - startTime;
      this.logger.log(`Video generation queued for recipe ${generateVideoDto.recipeId} in ${processingTime}ms`);

      return this.mapToResponseDto(recipeVideo);

    } catch (error) {
      this.logger.error(`Video generation failed for recipe ${generateVideoDto.recipeId}:`, error);
      throw error;
    }
  }

  /**
   * Get video status by video ID
   */
  async getVideoStatus(videoId: string): Promise<VideoStatusResponseDto> {
    const video = await this.prisma.recipeVideo.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return {
      id: video.id,
      recipeId: video.recipeId,
      status: video.status,
      progress: this.calculateProgress(video.status),
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      resolution: video.resolution,
      fileSize: video.fileSize,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      processingTimeMs: video.processingTimeMs
    };
  }

  /**
   * Get videos for a recipe
   */
  async getRecipeVideos(recipeId: string, userId?: string): Promise<VideoListResponseDto[]> {
    // Verify recipe exists
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const videos = await this.prisma.recipeVideo.findMany({
      where: { 
        recipeId,
        ...(userId && { generatedBy: userId })
      },
      include: {
        recipe: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return videos.map(video => ({
      id: video.id,
      recipeId: video.recipeId,
      recipeTitle: video.recipe.title,
      status: video.status,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      resolution: video.resolution,
      style: video.style || VideoStyle.STEP_BY_STEP,
      narration: video.narration,
      createdAt: video.createdAt.toISOString()
    }));
  }

  /**
   * Get user's video generation statistics
   */
  async getGenerationStats(userId: string): Promise<VideoGenerationStatsDto> {
    const stats = await this.prisma.recipeVideo.groupBy({
      by: ['status'],
      where: { generatedBy: userId },
      _count: {
        status: true
      }
    });

    const processingTimes = await this.prisma.recipeVideo.aggregate({
      where: { 
        generatedBy: userId,
        processingTimeMs: { not: null }
      },
      _avg: {
        processingTimeMs: true
      }
    });

    let totalGenerated = 0;
    let successful = 0;
    let failed = 0;
    let processing = 0;

    stats.forEach(stat => {
      totalGenerated += stat._count.status;
      switch (stat.status) {
        case VideoGenerationStatus.DONE:
          successful += stat._count.status;
          break;
        case VideoGenerationStatus.FAILED:
          failed += stat._count.status;
          break;
        case VideoGenerationStatus.PROCESSING:
          processing += stat._count.status;
          break;
      }
    });

    const avgProcessingTimeSeconds = processingTimes._avg.processingTimeMs 
      ? processingTimes._avg.processingTimeMs / 1000 
      : 0;

    const successRate = totalGenerated > 0 ? (successful / totalGenerated) * 100 : 0;

    return {
      totalGenerated,
      successful,
      failed,
      processing,
      avgProcessingTimeSeconds,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Validate recipe access
   */
  private async validateRecipeAccess(recipeId: string, userId: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if recipe is public or belongs to the user
    if (!recipe.isPublic && recipe.createdById !== userId) {
      throw new BadRequestException('You do not have access to this recipe');
    }

    return recipe;
  }

  /**
   * Process video generation asynchronously (mock implementation)
   */
  private async processVideoGenerationAsync(jobId: string, payload: VideoGenerationJob): Promise<void> {
    try {
      // Update job status to processing
      await this.prisma.aIJobQueue.update({
        where: { id: jobId },
        data: { 
          status: JobStatus.PROCESSING,
          startedAt: new Date()
        }
      });

      // Update video status
      await this.prisma.recipeVideo.update({
        where: { id: payload.recipeVideoId },
        data: { status: VideoGenerationStatus.PROCESSING }
      });

      // Simulate video generation process
      await this.mockVideoGeneration(payload);

      // Update job as completed
      await this.prisma.aIJobQueue.update({
        where: { id: jobId },
        data: { 
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          result: {
            success: true,
            videoId: payload.recipeVideoId
          }
        }
      });

      this.logger.log(`Video generation completed for recipe ${payload.recipeId}`);

    } catch (error) {
      this.logger.error(`Video generation failed for job ${jobId}:`, error);

      // Update job as failed
      await this.prisma.aIJobQueue.update({
        where: { id: jobId },
        data: { 
          status: JobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error.message
        }
      });

      // Update video status as failed
      await this.prisma.recipeVideo.update({
        where: { id: payload.recipeVideoId },
        data: { 
          status: VideoGenerationStatus.FAILED,
          errorMessage: error.message
        }
      });
    }
  }

  /**
   * Mock video generation implementation
   */
  private async mockVideoGeneration(payload: VideoGenerationJob): Promise<void> {
    const startTime = Date.now();
    
    // Simulate processing time based on recipe complexity
    const recipe = payload.recipe;
    const steps = Array.isArray(recipe.steps) ? recipe.steps : JSON.parse(recipe.steps as string || '[]');
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : JSON.parse(recipe.ingredients as string || '[]');
    
    // Calculate processing time (more steps = longer processing)
    const baseTime = 5000; // 5 seconds base
    const stepTime = steps.length * 1000; // 1 second per step
    const ingredientTime = ingredients.length * 500; // 0.5 seconds per ingredient
    const totalSimulatedTime = baseTime + stepTime + ingredientTime;
    
    this.logger.log(`Starting video generation for ${payload.recipeId} (estimated ${totalSimulatedTime}ms)`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, totalSimulatedTime));

    // Generate mock video data
    const duration = Math.min(
      Math.max(30, steps.length * 8), // 8 seconds per step, min 30 seconds
      payload.options.maxDuration || 120
    );
    
    const resolution = payload.options.resolution || VideoResolution.HD_720P;
    const fileSize = this.calculateFileSize(duration, resolution);
    
    // Mock CDN URLs (in production, these would be real URLs)
    const videoUrl = `https://cdn.recipe-videos.com/videos/${payload.recipeVideoId}.mp4`;
    const thumbnailUrl = `https://cdn.recipe-videos.com/thumbnails/${payload.recipeVideoId}.jpg`;
    
    const processingTime = Date.now() - startTime;

    // Update video record with generated data
    await this.prisma.recipeVideo.update({
      where: { id: payload.recipeVideoId },
      data: {
        status: VideoGenerationStatus.DONE,
        videoUrl,
        thumbnailUrl,
        duration,
        fileSize,
        processingTimeMs: processingTime,
        metadata: {
          ...payload.options,
          generationInfo: {
            stepsCount: steps.length,
            ingredientsCount: ingredients.length,
            actualDuration: duration,
            codec: 'h264',
            fps: 30,
            bitrate: this.calculateBitrate(resolution)
          }
        }
      }
    });

    this.logger.log(`Video generation completed: ${videoUrl} (${duration}s, ${fileSize} bytes)`);
  }

  /**
   * Calculate file size based on duration and resolution
   */
  private calculateFileSize(duration: number, resolution: string): number {
    const bitrates = {
      '480p': 1000000,  // 1 Mbps
      '720p': 2500000,  // 2.5 Mbps
      '1080p': 5000000, // 5 Mbps
      '4k': 15000000    // 15 Mbps
    };
    
    const bitrate = bitrates[resolution] || bitrates['720p'];
    return Math.round((bitrate * duration) / 8); // Convert bits to bytes
  }

  /**
   * Calculate bitrate for video quality
   */
  private calculateBitrate(resolution: string): string {
    const bitrates = {
      '480p': '1000k',
      '720p': '2500k',
      '1080p': '5000k',
      '4k': '15000k'
    };
    
    return bitrates[resolution] || bitrates['720p'];
  }

  /**
   * Calculate progress percentage based on status
   */
  private calculateProgress(status: VideoGenerationStatus): number {
    switch (status) {
      case VideoGenerationStatus.PENDING:
        return 0;
      case VideoGenerationStatus.PROCESSING:
        return 50;
      case VideoGenerationStatus.DONE:
        return 100;
      case VideoGenerationStatus.FAILED:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Map RecipeVideo to response DTO
   */
  private mapToResponseDto(video: RecipeVideo): GeneratedVideoResponseDto {
    return {
      recipeVideoId: video.id,
      recipeId: video.recipeId,
      status: video.status,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      resolution: video.resolution,
      style: video.style,
      narration: video.narration,
      voice: video.voice,
      fileSize: video.fileSize,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      processingTimeMs: video.processingTimeMs
    };
  }
}
