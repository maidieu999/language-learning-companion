import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateDocumentData,
  DocumentModel,
  DocumentWhereInput,
  DocumentWhereUniqueInput,
} from '../database/prisma.types';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  createDocument(data: CreateDocumentData): Promise<DocumentModel> {
    return this.getClient().document.create({ data });
  }

  findDocument(where: DocumentWhereUniqueInput): Promise<DocumentModel | null> {
    return this.getClient().document.findUnique({ where });
  }

  findDocuments(where: DocumentWhereInput): Promise<DocumentModel[]> {
    return this.getClient().document.findMany({ where });
  }

  listDocuments(userId: string): Promise<DocumentModel[]> {
    return this.getClient().document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDocumentForUser(
    id: string,
    userId: string,
  ): Promise<DocumentModel | null> {
    return this.getClient().document.findFirst({
      where: { id, userId },
    });
  }

  async updateDocument(
    id: string,
    userId: string,
    data: Prisma.DocumentUpdateInput,
  ): Promise<DocumentModel | null> {
    const existing = await this.findDocumentForUser(id, userId);
    if (!existing) {
      return null;
    }
    return this.getClient().document.update({
      where: { id },
      data,
    });
  }

  async deleteDocumentForUser(id: string, userId: string): Promise<void> {
    await this.getClient().$transaction(async (tx) => {
      const existing = await tx.document.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        return;
      }
      await tx.embedding.deleteMany({
        where: { chunk: { documentId: id } },
      });
      await tx.chunk.deleteMany({ where: { documentId: id } });
      await tx.document.delete({ where: { id } });
    });
  }
}
