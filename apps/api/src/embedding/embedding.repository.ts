import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';
import { SimilarChunkHit } from './embedding.types';

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

  deleteByDocumentId(documentId: string): Promise<void> {
    return this.getClient()
      .embedding.deleteMany({
        where: { chunk: { documentId } },
      })
      .then(() => undefined);
  }

  async findSimilar(
    queryVector: number[],
    options: { topK: number; userId: string; documentId?: string },
  ): Promise<SimilarChunkHit[]> {
    const { topK, userId, documentId } = options;
    const vector = `[${queryVector.join(',')}]`;
    const query = `SELECT
  c.id AS "chunkId",
  c.content,
  c."chunkIndex",
  d.id AS "documentId",
  d.title AS "documentTitle",
  (e.vector <=> $1::vector) AS distance
FROM "Embedding" e
INNER JOIN "Chunk" c ON c.id = e."chunkId"
INNER JOIN "Document" d ON d.id = c."documentId"
WHERE d."userId" = $2
  AND ($3::text IS NULL OR d.id = $3)
ORDER BY e.vector <=> $1::vector ASC
LIMIT $4`;
    const results = (await this.getClient().$queryRawUnsafe(
      query,
      vector,
      userId,
      documentId ?? null,
      topK,
    )) as SimilarChunkHit[];

    return results.map((row) => ({
      ...row,
      distance: Number(row.distance),
    }));
  }
}
