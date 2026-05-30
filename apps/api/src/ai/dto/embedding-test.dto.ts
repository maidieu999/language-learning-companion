import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EmbeddingTestDto {
  @ApiProperty({ example: 'Xin chào means hello.' })
  @IsString()
  @MinLength(1)
  text: string;
}
