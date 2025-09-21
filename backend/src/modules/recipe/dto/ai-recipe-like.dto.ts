import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateAiRecipeLikeDto {
  @ApiProperty({ description: 'Recipe ID to like' })
  @IsUUID()
  recipeId: string;
}

export class AiRecipeLikeResponseDto {
  @ApiProperty({ description: 'Like ID' })
  id: string;

  @ApiProperty({ description: 'User ID who liked' })
  userId: string;

  @ApiProperty({ description: 'Recipe ID that was liked' })
  recipeId: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class AiRecipeLikeQueryDto {
  @ApiProperty({ description: 'Recipe ID to get likes for', required: false })
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiProperty({ description: 'User ID to get likes by user', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
