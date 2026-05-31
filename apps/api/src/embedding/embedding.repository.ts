import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmbeddingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const vector = `[${embedding.join(',')}]`;
    await this.getClient().$executeRawUnsafe(
      `INSERT INTO "Embedding" ("id", "chunkId", "vector", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2::vector, NOW())`,
      chunkId,
      vector,
    );
  }

  async createMany(chunkIds: string[], embeddings: number[][]): Promise<void> {
    await Promise.all(
      chunkIds.map((chunkId, index) =>
        this.createEmbedding(chunkId, embeddings[index]),
      ),
    );
  }
}
