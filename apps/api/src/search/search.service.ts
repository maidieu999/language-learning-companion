import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChunkingRepository } from '../chunking/chunking.repository';
import { SearchResult, SearchSource } from './search.types';
import { SINGLE_SHOT_CHAR_LIMIT } from './search.constants';
import { EmbeddingService } from '../embedding/embedding.service';
import { AiService } from '../ai/ai.service';
import { DocumentRepository } from '../documents/documents.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly aiService: AiService,
    private readonly embeddingService: EmbeddingService,
    private readonly documentRepository: DocumentRepository,
    private readonly chunkingRepository: ChunkingRepository,
  ) {}

  async search(
    userId: string,
    query: string,
    documentId?: string,
    topK: number = 5,
  ): Promise<SearchResult> {
    const intent = await this.aiService.classifyQueryIntent(query);

    if (intent === 'document_scope') {
      if (!documentId) {
        throw new BadRequestException(
          'Select a document to summarize or review the whole lesson.',
        );
      }
      return this.searchDocumentScope(userId, query, documentId, intent);
    }

    return this.searchRetrieval(userId, query, documentId, topK, intent);
  }

  private async searchRetrieval(
    userId: string,
    query: string,
    documentId: string | undefined,
    topK: number,
    intent: 'retrieval',
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
      return {
        answer: 'No matching material found.',
        sources: [],
        strategy: 'rag',
        intent,
      };
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
    return { answer, sources, strategy: 'rag', intent };
  }

  private async searchDocumentScope(
    userId: string,
    query: string,
    documentId: string,
    intent: 'document_scope',
  ): Promise<SearchResult> {
    const document = await this.documentRepository.findDocumentForUser(
      documentId,
      userId,
    );
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const chunks = await this.chunkingRepository.findByDocumentId(documentId);
    if (!document.content.trim() || chunks.length === 0) {
      return {
        answer: 'No matching material found.',
        sources: [],
        strategy: 'full_document',
        intent,
      };
    }

    const answer =
      document.content.length <= SINGLE_SHOT_CHAR_LIMIT
        ? await this.aiService.generateAnswerFromDocument(
            query,
            document.title,
            document.content,
          )
        : await this.aiService.generateAnswerFromDocumentMapReduce(
            query,
            document.title,
            chunks.map((chunk) => chunk.content),
          );

    const sources: SearchSource[] = chunks.map((chunk) => ({
      chunkId: chunk.id,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      documentId: document.id,
      documentTitle: document.title,
      similarity: 1,
    }));

    return { answer, sources, strategy: 'full_document', intent };
  }
}
