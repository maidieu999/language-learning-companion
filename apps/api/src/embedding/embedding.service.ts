import { Injectable } from '@nestjs/common';
import { EmbeddingRepository } from './embedding.repository';
import type { SimilarChunkHit } from './embedding.types';

export interface SimilarChunkResult extends SimilarChunkHit {
  similarity: number;
}

@Injectable()
export class EmbeddingService {
  constructor(private readonly embeddingRepository: EmbeddingRepository) {}

  createEmbeddings(chunkIds: string[], embeddings: number[][]): Promise<void> {
    return this.embeddingRepository.createMany(chunkIds, embeddings);
  }

  async findSimilar(
    queryVector: number[],
    options: { topK: number; documentId?: string },
  ): Promise<SimilarChunkResult[]> {
    const hits = await this.embeddingRepository.findSimilar(
      queryVector,
      options,
    );
    return hits.map((hit) => ({
      ...hit,
      similarity: 1 - hit.distance,
    }));
  }
}
