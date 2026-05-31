import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AiService } from './ai.service';
import { EmbeddingTestDto } from './dto/embedding-test.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('embedding-test')
  @ApiOperation({ summary: 'Create an embedding for test text' })
  @ApiOkResponse({
    description: 'Embedding vector (1536 dimensions)',
    schema: { type: 'array', items: { type: 'number' } },
  })
  embeddingTest(@Body() dto: EmbeddingTestDto): Promise<number[]> {
    return this.aiService.createEmbedding(dto.text);
  }
}
