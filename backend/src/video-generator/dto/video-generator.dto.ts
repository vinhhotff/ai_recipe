import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsUUID, 
  IsEnum, 
  IsInt,
  Min,
  Max,
  IsNotEmpty 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VideoStyle {
  STEP_BY_STEP = 'step-by-step',
  TIMELAPSE = 'timelapse',
  SPLIT_SCREEN = 'split-screen',
  TOP_DOWN = 'top-down',
  PROFESSIONAL = 'professional'
}

export enum VoiceType {
  FEMALE_VIETNAMESE = 'female-vietnamese',
  MALE_VIETNAMESE = 'male-vietnamese',
  FEMALE_ENGLISH = 'female-english',
  MALE_ENGLISH = 'male-english',
  ROBOT = 'robot',
  NONE = 'none'
}

export enum VideoResolution {
  SD_480P = '480p',
  HD_720P = '720p',
  FULL_HD_1080P = '1080p',
  UHD_4K = '4k'
}

export class GenerateRecipeVideoDto {
  @ApiProperty({ 
    example: 'uuid-recipe-123',
    description: 'ID of the recipe to generate video for' 
  })
  @IsUUID()
  @IsNotEmpty()
  recipeId: string;

  @ApiPropertyOptional({ 
    enum: VideoStyle,
    example: VideoStyle.STEP_BY_STEP,
    description: 'Style of video to generate' 
  })
  @IsOptional()
  @IsEnum(VideoStyle)
  style?: VideoStyle = VideoStyle.STEP_BY_STEP;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to include narration in the video' 
  })
  @IsOptional()
  @IsBoolean()
  narration?: boolean = true;

  @ApiPropertyOptional({ 
    enum: VoiceType,
    example: VoiceType.FEMALE_VIETNAMESE,
    description: 'Voice type for narration' 
  })
  @IsOptional()
  @IsEnum(VoiceType)
  voice?: VoiceType = VoiceType.FEMALE_VIETNAMESE;

  @ApiPropertyOptional({ 
    enum: VideoResolution,
    example: VideoResolution.HD_720P,
    description: 'Video resolution' 
  })
  @IsOptional()
  @IsEnum(VideoResolution)
  resolution?: VideoResolution = VideoResolution.HD_720P;

  @ApiPropertyOptional({ 
    example: 60,
    description: 'Maximum video duration in seconds',
    minimum: 10,
    maximum: 300
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  maxDuration?: number = 120;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Whether to include background music' 
  })
  @IsOptional()
  @IsBoolean()
  backgroundMusic?: boolean = true;

  @ApiPropertyOptional({ 
    example: 'cooking',
    description: 'Music genre for background music' 
  })
  @IsOptional()
  @IsString()
  musicGenre?: string = 'cooking';
}

export class GeneratedVideoResponseDto {
  @ApiProperty({ example: 'uuid-video-456', description: 'Video record ID' })
  recipeVideoId: string;

  @ApiProperty({ example: 'uuid-recipe-123', description: 'Recipe ID' })
  recipeId: string;

  @ApiProperty({ example: 'processing', description: 'Video generation status' })
  status: string;

  @ApiPropertyOptional({ 
    example: 'https://cdn.example.com/videos/recipe-video-456.mp4',
    description: 'URL to generated video (available when done)' 
  })
  videoUrl?: string;

  @ApiPropertyOptional({ 
    example: 'https://cdn.example.com/thumbnails/recipe-video-456.jpg',
    description: 'URL to video thumbnail' 
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 85, description: 'Video duration in seconds' })
  duration?: number;

  @ApiPropertyOptional({ example: '720p', description: 'Video resolution' })
  resolution?: string;

  @ApiPropertyOptional({ example: 'step-by-step', description: 'Video style' })
  style?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether video has narration' })
  narration?: boolean;

  @ApiPropertyOptional({ example: 'female-vietnamese', description: 'Voice type used' })
  voice?: string;

  @ApiPropertyOptional({ example: 15728640, description: 'File size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ example: 'Error message if generation failed' })
  errorMessage?: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-20T10:35:00Z', description: 'Last update timestamp' })
  updatedAt: string;

  @ApiPropertyOptional({ 
    example: 45000,
    description: 'Processing time in milliseconds' 
  })
  processingTimeMs?: number;
}

export class VideoStatusResponseDto {
  @ApiProperty({ example: 'uuid-video-456', description: 'Video record ID' })
  id: string;

  @ApiProperty({ example: 'uuid-recipe-123', description: 'Recipe ID' })
  recipeId: string;

  @ApiProperty({ example: 'done', description: 'Current status' })
  status: string;

  @ApiProperty({ example: 75, description: 'Processing progress (0-100)' })
  progress: number;

  @ApiPropertyOptional({ 
    example: 'https://cdn.example.com/videos/recipe-video-456.mp4',
    description: 'Video URL when completed' 
  })
  videoUrl?: string;

  @ApiPropertyOptional({ 
    example: 'https://cdn.example.com/thumbnails/recipe-video-456.jpg',
    description: 'Thumbnail URL' 
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 85, description: 'Video duration in seconds' })
  duration?: number;

  @ApiPropertyOptional({ example: '720p', description: 'Video resolution' })
  resolution?: string;

  @ApiPropertyOptional({ example: 15728640, description: 'File size in bytes' })
  fileSize?: number;

  @ApiPropertyOptional({ example: 'Generation failed: invalid recipe format' })
  errorMessage?: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-20T10:35:00Z', description: 'Last update timestamp' })
  updatedAt: string;

  @ApiPropertyOptional({ 
    example: 45000,
    description: 'Processing time in milliseconds' 
  })
  processingTimeMs?: number;
}

export class VideoListResponseDto {
  @ApiProperty({ example: 'uuid-video-456', description: 'Video record ID' })
  id: string;

  @ApiProperty({ example: 'uuid-recipe-123', description: 'Recipe ID' })
  recipeId: string;

  @ApiProperty({ example: 'Trứng chiên cà chua', description: 'Recipe title' })
  recipeTitle: string;

  @ApiProperty({ example: 'done', description: 'Current status' })
  status: string;

  @ApiPropertyOptional({ 
    example: 'https://cdn.example.com/thumbnails/recipe-video-456.jpg',
    description: 'Thumbnail URL' 
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 85, description: 'Video duration in seconds' })
  duration?: number;

  @ApiPropertyOptional({ example: '720p', description: 'Video resolution' })
  resolution?: string;

  @ApiProperty({ example: 'step-by-step', description: 'Video style' })
  style: string;

  @ApiProperty({ example: true, description: 'Whether video has narration' })
  narration: boolean;

  @ApiProperty({ example: '2024-01-20T10:30:00Z', description: 'Creation timestamp' })
  createdAt: string;
}

export class VideoGenerationStatsDto {
  @ApiProperty({ example: 25, description: 'Total videos generated' })
  totalGenerated: number;

  @ApiProperty({ example: 23, description: 'Successfully completed videos' })
  successful: number;

  @ApiProperty({ example: 2, description: 'Failed video generations' })
  failed: number;

  @ApiProperty({ example: 3, description: 'Videos currently processing' })
  processing: number;

  @ApiProperty({ example: 45.5, description: 'Average processing time in seconds' })
  avgProcessingTimeSeconds: number;

  @ApiProperty({ example: 92.0, description: 'Success rate percentage' })
  successRate: number;
}
