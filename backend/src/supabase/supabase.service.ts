import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Service Role Key must be provided');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.bucketName = this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'recipe-images';
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<{ url: string; path: string }> {
    const filePath = `${folder}/${Date.now()}-${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType: mimeType,
        duplex: 'half'
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  }

  /**
   * Upload image file specifically
   */
  async uploadImage(
    imageBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; path: string }> {
    return this.uploadFile(imageBuffer, fileName, mimeType, 'recipe-images');
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private files (if needed)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = 'uploads', limit: number = 100) {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .list(folder, {
        limit,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data;
  }

  /**
   * Create storage bucket if it doesn't exist
   */
  async createBucket(bucketName?: string): Promise<void> {
    const bucket = bucketName || this.bucketName;
    
    const { error } = await this.supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    });

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }

  /**
   * Get Supabase client for direct operations
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage.listBuckets();
      return !error;
    } catch {
      return false;
    }
  }
}
