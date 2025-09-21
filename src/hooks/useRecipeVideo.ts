import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

// Types for Video Generation
export interface VideoGenerationRequest {
  recipeId: string;
  style?: 'step-by-step' | 'timelapse' | 'split-screen' | 'top-down' | 'professional';
  narration?: boolean;
  voice?: 'female-vietnamese' | 'male-vietnamese' | 'female-english' | 'male-english' | 'robot' | 'none';
  resolution?: '480p' | '720p' | '1080p' | '4k';
  maxDuration?: number;
  backgroundMusic?: boolean;
  musicGenre?: string;
}

export interface GeneratedVideoResponse {
  recipeVideoId: string;
  recipeId: string;
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  style?: string;
  narration?: boolean;
  voice?: string;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  processingTimeMs?: number;
}

export interface VideoStatus {
  id: string;
  recipeId: string;
  status: string;
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  processingTimeMs?: number;
}

export interface RecipeVideoList {
  id: string;
  recipeId: string;
  recipeTitle: string;
  status: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  style: string;
  narration: boolean;
  createdAt: string;
}

export interface VideoStats {
  totalGenerated: number;
  successful: number;
  failed: number;
  processing: number;
  avgProcessingTimeSeconds: number;
  successRate: number;
}

// React Query Keys
export const VIDEO_KEYS = {
  all: ['videos'] as const,
  generate: (request: VideoGenerationRequest) => ['videos', 'generate', request] as const,
  status: (videoId: string) => ['videos', 'status', videoId] as const,
  recipeVideos: (recipeId: string, userOnly?: boolean) => 
    ['videos', 'recipe', recipeId, userOnly] as const,
  stats: () => ['videos', 'stats'] as const,
};

/**
 * Hook to generate video for a recipe
 */
export function useGenerateRecipeVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: VideoGenerationRequest): Promise<GeneratedVideoResponse> => {
      const response = await apiClient.generateRecipeVideo(request);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to generate video');
      }
      
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: VIDEO_KEYS.recipeVideos(variables.recipeId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: VIDEO_KEYS.stats() 
      });
      
      console.log('Video generation started:', data.recipeVideoId);
    },
    onError: (error) => {
      console.error('Video generation failed:', error);
    },
  });
}

/**
 * Hook to get video status with polling for processing videos
 */
export function useVideoStatus(videoId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: VIDEO_KEYS.status(videoId),
    queryFn: async (): Promise<VideoStatus> => {
      const response = await apiClient.getVideoStatus(videoId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch video status');
      }
      
      return response.data;
    },
    enabled: enabled && !!videoId,
    refetchInterval: (data) => {
      // Poll every 3 seconds if video is processing
      if (data?.status === 'processing') {
        return 3000;
      }
      // Poll every 10 seconds if pending
      if (data?.status === 'pending') {
        return 10000;
      }
      // Stop polling if done or failed
      return false;
    },
    staleTime: 0, // Always fetch fresh data for status
  });
}

/**
 * Hook to get all videos for a recipe
 */
export function useRecipeVideos(recipeId: string, userOnly?: boolean, enabled: boolean = true) {
  return useQuery({
    queryKey: VIDEO_KEYS.recipeVideos(recipeId, userOnly),
    queryFn: async (): Promise<RecipeVideoList[]> => {
      const response = await apiClient.getRecipeVideos(recipeId, userOnly);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch recipe videos');
      }
      
      return response.data;
    },
    enabled: enabled && !!recipeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get user video generation statistics
 */
export function useVideoStats(enabled: boolean = true) {
  return useQuery({
    queryKey: VIDEO_KEYS.stats(),
    queryFn: async (): Promise<VideoStats> => {
      const response = await apiClient.getUserVideoStats();
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch video stats');
      }
      
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Utility functions for video generation
 */
export function getVideoStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'done':
      return 'text-green-600';
    case 'processing':
      return 'text-blue-600';
    case 'pending':
      return 'text-yellow-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function getVideoStatusText(status: string): string {
  switch (status.toLowerCase()) {
    case 'done':
      return 'Hoàn thành';
    case 'processing':
      return 'Đang xử lý';
    case 'pending':
      return 'Chờ xử lý';
    case 'failed':
      return 'Thất bại';
    default:
      return status;
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function getVideoStyleText(style: string): string {
  switch (style) {
    case 'step-by-step':
      return 'Từng bước';
    case 'timelapse':
      return 'Tua nhanh';
    case 'split-screen':
      return 'Chia màn hình';
    case 'top-down':
      return 'Nhìn từ trên';
    case 'professional':
      return 'Chuyên nghiệp';
    default:
      return style;
  }
}

export function getVoiceTypeText(voice: string): string {
  switch (voice) {
    case 'female-vietnamese':
      return 'Nữ Tiếng Việt';
    case 'male-vietnamese':
      return 'Nam Tiếng Việt';
    case 'female-english':
      return 'Nữ Tiếng Anh';
    case 'male-english':
      return 'Nam Tiếng Anh';
    case 'robot':
      return 'Robot';
    case 'none':
      return 'Không lồng tiếng';
    default:
      return voice;
  }
}
