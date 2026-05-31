import { Injectable, NotFoundException } from '@nestjs/common';
import { SearchResult } from './search.types';
import { EmbeddingService } from '../embedding/embedding.service';
import { AiService } from '../ai/ai.service';
import { DocumentRepository } from '../documents/documents.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly aiService: AiService,
    private readonly embeddingService: EmbeddingService,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async search(
    userId: string,
    query: string,
    documentId?: string,
    topK: number = 5,
  ): Promise<SearchResult> {
    if (documentId) {
      const document = await this.documentRepository.findDocumentForUser(
        documentId,
        userId,
      );
      if (!document) {
        throw new NotFoundException('Document not found');
      }
    }

    const queryVector = await this.aiService.createQueryEmbedding(query);
    const hits = await this.embeddingService.findSimilar(queryVector, {
      topK: topK ?? 5,
      userId,
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
