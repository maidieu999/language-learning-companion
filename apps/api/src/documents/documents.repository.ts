import { Injectable } from '@nestjs/common';
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

  listDocuments(): Promise<DocumentModel[]> {
    return this.getClient().document.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
