import { Injectable } from '@nestjs/common';
import type { DocumentModel } from '../database/prisma.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentRepository } from './documents.repository';
import { ChunkingService } from '../chunking/chunking.service';
import { ChunkingRepository } from '../chunking/chunking.repository';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly chunkingService: ChunkingService,
    private readonly chunkingRepository: ChunkingRepository,
  ) {}

  async createDocument(
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentModel> {
    const document = await this.documentRepository.createDocument({
      title: createDocumentDto.title,
      content: createDocumentDto.content,
    });
    const chunks = this.chunkingService.chunkText(createDocumentDto.content);
    await this.chunkingRepository.createMany(document.id, chunks);
    return document;
  }
}
