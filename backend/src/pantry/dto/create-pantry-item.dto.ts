import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePantryItemDto {
  @ApiProperty({ example: 'Cà chua' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({ example: 'quả', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 'Tươi, màu đỏ', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}