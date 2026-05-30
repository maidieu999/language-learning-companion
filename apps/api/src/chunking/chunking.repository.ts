import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChunkingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createMany(documentId: string, chunks: string[]): Promise<void> {
    const chunkData = chunks.map((chunk, index) => ({
      documentId,
      content: chunk,
      chunkIndex: index,
    }));
    await this.getClient().chunk.createMany({ data: chunkData });
  }
}
