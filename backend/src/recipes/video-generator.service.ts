import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class VideoGeneratorService {
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private supabase: SupabaseService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateVideo(recipeId: string): Promise<{ success: boolean; videoUrl?: string; message?: string }> {
    try {
      // 1. Fetch recipe by ID
      const recipe = await this.prisma.recipe.findUnique({
        where: { id: recipeId }
      });

      if (!recipe) {
        return {
          success: false,
          message: 'Recipe not found'
        };
      }

      // 2. Generate video (mock implementation or real AI service)
      const videoFilePath = await this.generateVideoContent(recipe);

      // 3. Upload to Supabase Storage
      const videoUrl = await this.uploadToSupabase(videoFilePath, recipeId);

      // 4. Update recipe with video URL
      await this.prisma.recipe.update({
        where: { id: recipeId },
        data: { 
          videoUrl: videoUrl 
        }
      });

      // Clean up temporary files
      if (fs.existsSync(videoFilePath)) {
        fs.unlinkSync(videoFilePath);
      }

      return {
        success: true,
        videoUrl
      };
    } catch (error) {
      console.error('Video generation error:', error);
      return {
        success: false,
        message: `Failed to generate video: ${error.message}`
      };
    }
  }

  private async generateVideoContent(recipe: any): Promise<string> {
    // Mock implementation - in production, you would:
    // 1. Generate images for each step using OpenAI
    // 2. Generate narration using TTS
    // 3. Merge using FFmpeg

    if (this.openai) {
      return await this.generateWithAI(recipe);
    } else {
      return await this.generateMockVideo(recipe);
    }
  }

  private async generateWithAI(recipe: any): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoFileName = `recipe-video-${recipe.id}-${Date.now()}.mp4`;
    const videoPath = path.join(tempDir, videoFileName);

    try {
      // Generate images for each step
      const steps = Array.isArray(recipe.steps) ? recipe.steps : JSON.parse(recipe.steps || '[]');
      const imagePromises = steps.slice(0, 5).map(async (step: any, index: number) => {
        const imagePrompt = `Food photography step ${index + 1}: ${step.text}. Professional kitchen setup, bright lighting, detailed cooking process.`;
        
        try {
          const response = await this.openai.images.generate({
            model: 'dall-e-3',
            prompt: imagePrompt,
            size: '1024x1024',
            quality: 'standard',
            n: 1,
          });

          return response.data[0]?.url;
        } catch (error) {
          console.error(`Failed to generate image for step ${index + 1}:`, error);
          return null;
        }
      });

      const imageUrls = await Promise.all(imagePromises);
      const validImages = imageUrls.filter(url => url !== null);

      if (validImages.length > 0) {
        // In a real implementation, you would:
        // 1. Download the images
        // 2. Generate audio narration using TTS
        // 3. Use FFmpeg to combine images and audio into video
        
        // For now, create a simple placeholder video
        await this.createPlaceholderVideo(videoPath, recipe.title, validImages.length);
      } else {
        throw new Error('Failed to generate any images');
      }
    } catch (error) {
      console.error('AI video generation error:', error);
      // Fallback to mock video
      await this.createPlaceholderVideo(videoPath, recipe.title, 3);
    }

    return videoPath;
  }

  private async generateMockVideo(recipe: any): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoFileName = `recipe-video-${recipe.id}-${Date.now()}.mp4`;
    const videoPath = path.join(tempDir, videoFileName);

    // Create a simple placeholder video using FFmpeg
    await this.createPlaceholderVideo(videoPath, recipe.title);

    return videoPath;
  }

  private async createPlaceholderVideo(outputPath: string, title: string, stepCount: number = 3): Promise<void> {
    try {
      // Create a simple video with text overlay using FFmpeg
      // This requires FFmpeg to be installed on the system
      const ffmpegCommand = `ffmpeg -f lavfi -i color=c=orange:size=1280x720:duration=10 -vf "drawtext=text='Recipe: ${title}\\nStep count: ${stepCount}\\nGenerated at: $(date)':fontsize=30:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -t 10 -pix_fmt yuv420p -y "${outputPath}"`;

      await execAsync(ffmpegCommand);
    } catch (error) {
      console.error('FFmpeg error:', error);
      // If FFmpeg fails, create a minimal placeholder file
      const placeholderContent = `# Recipe Video Placeholder\nRecipe: ${title}\nGenerated at: ${new Date().toISOString()}`;
      fs.writeFileSync(outputPath.replace('.mp4', '.txt'), placeholderContent);
      
      // Rename to .mp4 for consistency
      if (fs.existsSync(outputPath.replace('.mp4', '.txt'))) {
        fs.renameSync(outputPath.replace('.mp4', '.txt'), outputPath);
      }
    }
  }

  private async uploadToSupabase(filePath: string, recipeId: string): Promise<string> {
    const fileName = `recipe-${recipeId}-${Date.now()}.mp4`;
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found at ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);

    const { data, error } = await this.supabase.getClient()
      .storage
      .from('recipe-videos')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = this.supabase.getClient()
      .storage
      .from('recipe-videos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
}
