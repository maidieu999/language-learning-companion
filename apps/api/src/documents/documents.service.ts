import { Injectable } from '@nestjs/common';
import type { DocumentModel } from '../database/prisma.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentRepository } from './documents.repository';
import { ChunkingService } from '../chunking/chunking.service';
import { ChunkingRepository } from '../chunking/chunking.repository';
import { AiService } from '../ai/ai.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly chunkingService: ChunkingService,
    private readonly chunkingRepository: ChunkingRepository,
    private readonly aiService: AiService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async createDocument(
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentModel> {
    const document = await this.documentRepository.createDocument({
      title: createDocumentDto.title,
      content: createDocumentDto.content,
    });
    const textChunks = this.chunkingService.chunkText(
      createDocumentDto.content,
    );
    const savedChunks = await this.chunkingRepository.createMany(
      document.id,
      textChunks,
    );
    const embeddings = await Promise.all(
      savedChunks.map((chunk) => this.aiService.createEmbedding(chunk.content)),
    );
    await this.embeddingService.createEmbeddings(
      savedChunks.map((chunk) => chunk.id),
      embeddings,
    );
    return document;
  }
}
