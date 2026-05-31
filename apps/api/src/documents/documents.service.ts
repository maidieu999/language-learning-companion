import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DocumentModel } from '../database/prisma.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
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
    userId: string,
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentModel> {
    const document = await this.documentRepository.createDocument({
      title: createDocumentDto.title,
      content: createDocumentDto.content,
      userId,
    });
    await this.indexDocumentContent(document.id, createDocumentDto.content);
    return document;
  }

  listDocuments(userId: string): Promise<DocumentModel[]> {
    return this.documentRepository.listDocuments(userId);
  }

  async getDocument(userId: string, id: string): Promise<DocumentModel> {
    return this.getDocumentForUserOrThrow(id, userId);
  }

  async deleteDocument(userId: string, id: string): Promise<void> {
    await this.getDocumentForUserOrThrow(id, userId);
    await this.documentRepository.deleteDocumentForUser(id, userId);
  }

  async updateDocument(
    userId: string,
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<DocumentModel> {
    if (
      updateDocumentDto.title === undefined &&
      updateDocumentDto.content === undefined
    ) {
      throw new BadRequestException(
        'At least one of title or content must be provided',
      );
    }

    const existing = await this.getDocumentForUserOrThrow(id, userId);

    const updated = await this.documentRepository.updateDocument(id, userId, {
      ...(updateDocumentDto.title !== undefined
        ? { title: updateDocumentDto.title }
        : {}),
      ...(updateDocumentDto.content !== undefined
        ? { content: updateDocumentDto.content }
        : {}),
    });
    if (!updated) {
      throw new NotFoundException('Document not found');
    }

    if (
      updateDocumentDto.content !== undefined &&
      updateDocumentDto.content !== existing.content
    ) {
      await this.clearDocumentIndex(id);
      await this.indexDocumentContent(id, updateDocumentDto.content);
    }

    return updated;
  }

  private async getDocumentForUserOrThrow(
    id: string,
    userId: string,
  ): Promise<DocumentModel> {
    const document = await this.documentRepository.findDocumentForUser(
      id,
      userId,
    );
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private async clearDocumentIndex(documentId: string): Promise<void> {
    await this.embeddingService.deleteByDocumentId(documentId);
    await this.chunkingRepository.deleteByDocumentId(documentId);
  }

  private async indexDocumentContent(
    documentId: string,
    content: string,
  ): Promise<void> {
    const textChunks = this.chunkingService.chunkText(content);
    const savedChunks = await this.chunkingRepository.createMany(
      documentId,
      textChunks,
    );
    const embeddings = await Promise.all(
      savedChunks.map((chunk) => this.aiService.createEmbedding(chunk.content)),
    );
    await this.embeddingService.createEmbeddings(
      savedChunks.map((chunk) => chunk.id),
      embeddings,
    );
  }
}
