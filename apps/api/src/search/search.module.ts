import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { ChunkingModule } from '../chunking/chunking.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { SearchController } from './search.controller';

@Module({
  imports: [AiModule, ChunkingModule, EmbeddingModule, DocumentsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
