import { Injectable } from '@nestjs/common';
import type { Chunk } from '@prisma/client';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChunkingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createMany(documentId: string, chunks: string[]): Promise<Chunk[]> {
    if (chunks.length === 0) {
      return [];
    }

    const chunkData = chunks.map((chunk, index) => ({
      documentId,
      content: chunk,
      chunkIndex: index,
    }));
    return this.getClient().chunk.createManyAndReturn({ data: chunkData });
  }

  findByDocumentId(documentId: string) {
    return this.getClient().chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  deleteByDocumentId(documentId: string): Promise<void> {
    return this.getClient()
      .chunk.deleteMany({ where: { documentId } })
      .then(() => undefined);
  }
}
