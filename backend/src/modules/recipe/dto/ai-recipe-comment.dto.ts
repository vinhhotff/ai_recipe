import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNotEmpty, IsBoolean, IsDateString } from 'class-validator';

export class CreateAiRecipeCommentDto {
  @ApiProperty({ description: 'Recipe ID to comment on' })
  @IsUUID()
  recipeId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Parent comment ID for replies', required: false })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}

export class UpdateAiRecipeCommentDto {
  @ApiProperty({ description: 'Updated comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AiRecipeCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'User ID who commented' })
  userId: string;

  @ApiProperty({ description: 'Recipe ID that was commented on' })
  recipeId: string;

  @ApiProperty({ description: 'Comment content' })
  content: string;

  @ApiProperty({ description: 'Parent comment ID for replies', nullable: true })
  parentCommentId: string | null;

  @ApiProperty({ description: 'Whether comment is deleted' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'User information', required: false })
  user?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ description: 'Reply comments', required: false, type: [AiRecipeCommentResponseDto] })
  replies?: AiRecipeCommentResponseDto[];

  @ApiProperty({ description: 'Number of replies', required: false })
  replyCount?: number;
}

export class AiRecipeCommentQueryDto {
  @ApiProperty({ description: 'Recipe ID to get comments for', required: false })
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiProperty({ description: 'User ID to get comments by user', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Parent comment ID to get replies', required: false })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiProperty({ description: 'Include deleted comments', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean = false;

  @ApiProperty({ description: 'Include replies in response', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  includeReplies?: boolean = true;

  @ApiProperty({ description: 'Page number for pagination', required: false, default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  limit?: number = 20;
}
