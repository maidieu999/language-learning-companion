import { Injectable } from '@nestjs/common';
import { SearchResult } from './search.types';
import { EmbeddingService } from '../embedding/embedding.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly aiService: AiService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(
    query: string,
    documentId?: string,
    topK: number = 5,
  ): Promise<SearchResult> {
    const queryVector = await this.aiService.createQueryEmbedding(query);
    const hits = await this.embeddingService.findSimilar(queryVector, {
      topK: topK ?? 5,
      documentId,
    });
    if (hits.length === 0) {
      return { answer: 'No matching material found.', sources: [] };
    }
    const sources = hits.map((hit) => ({
      chunkId: hit.chunkId,
      content: hit.content,
      chunkIndex: hit.chunkIndex,
      documentId: hit.documentId,
      documentTitle: hit.documentTitle,
      similarity: hit.similarity,
    }));
    const answer = await this.aiService.generateAnswerFromContext(
      query,
      sources.map((source) => source.content),
    );
    return { answer, sources };
  }
}
