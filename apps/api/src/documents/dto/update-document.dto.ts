import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Intro to Vietnamese' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Xin chào means hello.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}
