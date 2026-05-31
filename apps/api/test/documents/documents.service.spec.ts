import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Chunk } from '@prisma/client';
import { AiService } from 'src/ai/ai.service';
import { ChunkingRepository } from 'src/chunking/chunking.repository';
import { ChunkingService } from 'src/chunking/chunking.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { DocumentRepository } from 'src/documents/documents.repository';
import { DocumentsService } from 'src/documents/documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: {
    createDocument: jest.Mock;
    listDocuments: jest.Mock;
    findDocumentForUser: jest.Mock;
    updateDocument: jest.Mock;
    deleteDocumentForUser: jest.Mock;
  };
  let chunkingService: { chunkText: jest.Mock };
  let chunkingRepository: {
    createMany: jest.Mock;
    deleteByDocumentId: jest.Mock;
  };
  let aiService: { createEmbedding: jest.Mock };
  let embeddingService: {
    createEmbeddings: jest.Mock;
    deleteByDocumentId: jest.Mock;
  };

  const createDocumentDto = {
    title: 'Intro to Vietnamese',
    content: 'Xin chào means hello.',
  };

  const userId = 'user-1';

  const document = {
    id: 'doc-1',
    title: createDocumentDto.title,
    content: createDocumentDto.content,
    userId,
    createdAt: new Date('2026-01-01'),
  };

  const textChunks = ['chunk-a', 'chunk-b'];

  const savedChunks: Chunk[] = [
    {
      id: 'chunk-1',
      documentId: document.id,
      content: 'chunk-a',
      chunkIndex: 0,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'chunk-2',
      documentId: document.id,
      content: 'chunk-b',
      chunkIndex: 1,
      createdAt: new Date('2026-01-01'),
    },
  ];

  const embeddings = [
    [0.1, 0.2],
    [0.3, 0.4],
  ];

  beforeEach(async () => {
    documentRepository = {
      createDocument: jest.fn().mockResolvedValue(document),
      listDocuments: jest.fn().mockResolvedValue([document]),
      findDocumentForUser: jest.fn().mockResolvedValue(document),
      updateDocument: jest.fn().mockResolvedValue(document),
      deleteDocumentForUser: jest.fn().mockResolvedValue(undefined),
    };
    chunkingService = {
      chunkText: jest.fn().mockReturnValue(textChunks),
    };
    chunkingRepository = {
      createMany: jest.fn().mockResolvedValue(savedChunks),
      deleteByDocumentId: jest.fn().mockResolvedValue(undefined),
    };
    aiService = {
      createEmbedding: jest
        .fn()
        .mockImplementation((text: string) =>
          Promise.resolve(embeddings[text === 'chunk-a' ? 0 : 1]),
        ),
    };
    embeddingService = {
      createEmbeddings: jest.fn().mockResolvedValue(undefined),
      deleteByDocumentId: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentRepository, useValue: documentRepository },
        { provide: ChunkingService, useValue: chunkingService },
        { provide: ChunkingRepository, useValue: chunkingRepository },
        { provide: AiService, useValue: aiService },
        { provide: EmbeddingService, useValue: embeddingService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listDocuments', () => {
    it('returns documents from the repository', async () => {
      const result = await service.listDocuments(userId);

      expect(result).toEqual([document]);
      expect(documentRepository.listDocuments).toHaveBeenCalledWith(userId);
    });
  });

  describe('getDocument', () => {
    it('returns the document when found', async () => {
      const result = await service.getDocument(userId, document.id);

      expect(result).toBe(document);
      expect(documentRepository.findDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(service.getDocument(userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDocument', () => {
    it('deletes after verifying ownership', async () => {
      await service.deleteDocument(userId, document.id);

      expect(documentRepository.findDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
      expect(documentRepository.deleteDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(service.deleteDocument(userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(documentRepository.deleteDocumentForUser).not.toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('throws BadRequestException when no fields provided', async () => {
      await expect(
        service.updateDocument(userId, document.id, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates title only without re-indexing', async () => {
      const updated = { ...document, title: 'New title' };
      documentRepository.updateDocument.mockResolvedValue(updated);

      const result = await service.updateDocument(userId, document.id, {
        title: 'New title',
      });

      expect(result).toBe(updated);
      expect(documentRepository.updateDocument).toHaveBeenCalledWith(
        document.id,
        userId,
        { title: 'New title' },
      );
      expect(embeddingService.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingRepository.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingService.chunkText).not.toHaveBeenCalled();
    });

    it('re-indexes when content changes', async () => {
      const newContent = 'Updated lesson text.';
      const updated = { ...document, content: newContent };
      documentRepository.updateDocument.mockResolvedValue(updated);

      const result = await service.updateDocument(userId, document.id, {
        content: newContent,
      });

      expect(result).toBe(updated);
      expect(embeddingService.deleteByDocumentId).toHaveBeenCalledWith(
        document.id,
      );
      expect(chunkingRepository.deleteByDocumentId).toHaveBeenCalledWith(
        document.id,
      );
      expect(chunkingService.chunkText).toHaveBeenCalledWith(newContent);
      expect(chunkingRepository.createMany).toHaveBeenCalledWith(
        document.id,
        textChunks,
      );
      expect(embeddingService.createEmbeddings).toHaveBeenCalled();
    });

    it('skips re-index when content is unchanged', async () => {
      const result = await service.updateDocument(userId, document.id, {
        content: document.content,
      });

      expect(result).toBe(document);
      expect(embeddingService.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingService.chunkText).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(
        service.updateDocument(userId, 'missing', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDocument', () => {
    it('persists document, chunks, and embeddings in order with chunk ids', async () => {
      const result = await service.createDocument(userId, createDocumentDto);

      expect(result).toBe(document);
      expect(documentRepository.createDocument).toHaveBeenCalledWith({
        title: createDocumentDto.title,
        content: createDocumentDto.content,
        userId,
      });
      expect(chunkingService.chunkText).toHaveBeenCalledWith(
        createDocumentDto.content,
      );
      expect(chunkingRepository.createMany).toHaveBeenCalledWith(
        document.id,
        textChunks,
      );
      expect(aiService.createEmbedding).toHaveBeenCalledTimes(2);
      expect(aiService.createEmbedding).toHaveBeenNthCalledWith(1, 'chunk-a');
      expect(aiService.createEmbedding).toHaveBeenNthCalledWith(2, 'chunk-b');
      expect(embeddingService.createEmbeddings).toHaveBeenCalledWith(
        ['chunk-1', 'chunk-2'],
        embeddings,
      );
    });

    it('skips embedding when content produces no chunks', async () => {
      chunkingService.chunkText.mockReturnValue([]);
      chunkingRepository.createMany.mockResolvedValue([]);

      const result = await service.createDocument(userId, createDocumentDto);

      expect(result).toBe(document);
      expect(chunkingRepository.createMany).toHaveBeenCalledWith(
        document.id,
        [],
      );
      expect(aiService.createEmbedding).not.toHaveBeenCalled();
      expect(embeddingService.createEmbeddings).toHaveBeenCalledWith([], []);
    });
  });
});
