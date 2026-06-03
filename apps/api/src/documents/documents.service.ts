import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';
import type { DocumentModel } from '../database/prisma.types';
import { AiService } from '../ai/ai.service';
import { ChunkingRepository } from '../chunking/chunking.repository';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import {
  type DocumentResponse,
  toDocumentResponse,
} from './document-response.util';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentRepository } from './documents.repository';
import { FileExtractionService } from './file-extraction.service';
import { FileStorageService } from './file-storage.service';
import type {
  DocumentFileStream,
  UploadedFilePayload,
} from './file-upload.types';
import {
  parseUploadedFile,
  titleFromFilename,
} from './file-validation.util';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly chunkingService: ChunkingService,
    private readonly chunkingRepository: ChunkingRepository,
    private readonly aiService: AiService,
    private readonly embeddingService: EmbeddingService,
    private readonly fileExtractionService: FileExtractionService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async createDocument(
    userId: string,
    createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
    const document = await this.documentRepository.createDocument({
      title: createDocumentDto.title,
      content: createDocumentDto.content,
      userId,
      sourceType: DocumentSourceType.PASTE,
    });
    await this.indexDocumentContent(document.id, createDocumentDto.content);
    return toDocumentResponse(document);
  }

  async createDocumentFromFile(
    userId: string,
    file: UploadedFilePayload,
    title?: string,
  ): Promise<DocumentResponse> {
    const parsed = parseUploadedFile(file);
    const content = await this.fileExtractionService.extractText(
      file.buffer,
      parsed.sourceType,
    );
    const resolvedTitle =
      title?.trim() || titleFromFilename(parsed.originalFilename);

    const document = await this.documentRepository.createDocument({
      title: resolvedTitle,
      content,
      userId,
      sourceType: parsed.sourceType,
      originalFilename: parsed.originalFilename,
      mimeType: parsed.mimeType,
    });

    const storedFileKey = await this.fileStorageService.save(
      userId,
      document.id,
      file.buffer,
      parsed.extension,
    );

    const updated = await this.documentRepository.updateDocument(
      document.id,
      userId,
      { storedFileKey },
    );
    const withFile = updated ?? { ...document, storedFileKey };

    await this.indexDocumentContent(document.id, content);
    return toDocumentResponse(withFile);
  }

  async replaceDocumentFile(
    userId: string,
    id: string,
    file: UploadedFilePayload,
    title?: string,
  ): Promise<DocumentResponse> {
    const parsed = parseUploadedFile(file);
    const existing = await this.getDocumentForUserOrThrow(id, userId);
    const content = await this.fileExtractionService.extractText(
      file.buffer,
      parsed.sourceType,
    );

    const storedFileKey = await this.fileStorageService.replace(
      userId,
      id,
      file.buffer,
      parsed.extension,
      existing.storedFileKey,
    );

    const updated = await this.documentRepository.updateDocument(id, userId, {
      content,
      sourceType: parsed.sourceType,
      originalFilename: parsed.originalFilename,
      mimeType: parsed.mimeType,
      storedFileKey,
      ...(title !== undefined && title.trim() !== ''
        ? { title: title.trim() }
        : {}),
    });
    if (!updated) {
      throw new NotFoundException('Document not found');
    }

    if (content !== existing.content) {
      await this.clearDocumentIndex(id);
      await this.indexDocumentContent(id, content);
    }

    return toDocumentResponse(updated);
  }

  async getDocumentFileStream(
    userId: string,
    id: string,
  ): Promise<DocumentFileStream> {
    const document = await this.getDocumentForUserOrThrow(id, userId);
    if (!document.storedFileKey) {
      throw new NotFoundException('This document has no stored file');
    }

    await this.fileStorageService.assertFileExists(document.storedFileKey);
    const { stream, mimeType } = this.fileStorageService.openReadStream(
      document.storedFileKey,
    );

    return {
      stream,
      mimeType: document.mimeType ?? mimeType,
      filename: document.originalFilename ?? 'download',
    };
  }

  async listDocuments(userId: string): Promise<DocumentResponse[]> {
    const documents = await this.documentRepository.listDocuments(userId);
    return documents.map(toDocumentResponse);
  }

  async getDocument(userId: string, id: string): Promise<DocumentResponse> {
    const document = await this.getDocumentForUserOrThrow(id, userId);
    return toDocumentResponse(document);
  }

  async deleteDocument(userId: string, id: string): Promise<void> {
    const existing = await this.getDocumentForUserOrThrow(id, userId);
    if (existing.storedFileKey) {
      try {
        await this.fileStorageService.delete(existing.storedFileKey);
      } catch (error) {
        this.logger.warn(
          `Could not delete file for document ${id}: ${String(error)}`,
        );
      }
    }
    await this.documentRepository.deleteDocumentForUser(id, userId);
  }

  async updateDocument(
    userId: string,
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<DocumentResponse> {
    if (
      updateDocumentDto.title === undefined &&
      updateDocumentDto.content === undefined
    ) {
      throw new BadRequestException(
        'At least one of title or content must be provided',
      );
    }

    const existing = await this.getDocumentForUserOrThrow(id, userId);

    if (
      updateDocumentDto.content !== undefined &&
      existing.sourceType !== DocumentSourceType.PASTE
    ) {
      throw new BadRequestException(
        'Content cannot be edited for file-based documents; upload a replacement file instead',
      );
    }

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

    return toDocumentResponse(updated);
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
