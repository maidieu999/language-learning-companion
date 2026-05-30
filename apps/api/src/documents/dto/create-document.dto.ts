import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Intro to Vietnamese' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Xin chào means hello.' })
  @IsString()
  @MinLength(1)
  content: string;
}
