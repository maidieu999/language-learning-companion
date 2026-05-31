import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AiModule } from '../ai/ai.module';
import { SearchController } from './search.controller';

@Module({
  imports: [AiModule, EmbeddingModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
