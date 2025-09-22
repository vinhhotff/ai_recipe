import { IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great recipe! I loved the flavors.' })
  @IsString()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ 
    example: 'uuid-of-parent-comment',
    description: 'ID of the parent comment for replies'
  })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'Updated comment content' })
  @IsString()
  @MaxLength(1000)
  content: string;
}
