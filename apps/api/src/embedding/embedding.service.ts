import { Injectable } from '@nestjs/common';
import { EmbeddingRepository } from './embedding.repository';

@Injectable()
export class EmbeddingService {
  constructor(private readonly embeddingRepository: EmbeddingRepository) {}

  createEmbeddings(chunkIds: string[], embeddings: number[][]): Promise<void> {
    return this.embeddingRepository.createMany(chunkIds, embeddings);
  }
}
