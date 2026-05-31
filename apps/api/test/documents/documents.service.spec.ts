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
  let documentRepository: { createDocument: jest.Mock };
  let chunkingService: { chunkText: jest.Mock };
  let chunkingRepository: { createMany: jest.Mock };
  let aiService: { createEmbedding: jest.Mock };
  let embeddingService: { createEmbeddings: jest.Mock };

  const createDocumentDto = {
    title: 'Intro to Vietnamese',
    content: 'Xin chào means hello.',
  };

  const document = {
    id: 'doc-1',
    title: createDocumentDto.title,
    content: createDocumentDto.content,
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
    };
    chunkingService = {
      chunkText: jest.fn().mockReturnValue(textChunks),
    };
    chunkingRepository = {
      createMany: jest.fn().mockResolvedValue(savedChunks),
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

  describe('createDocument', () => {
    it('persists document, chunks, and embeddings in order with chunk ids', async () => {
      const result = await service.createDocument(createDocumentDto);

      expect(result).toBe(document);
      expect(documentRepository.createDocument).toHaveBeenCalledWith({
        title: createDocumentDto.title,
        content: createDocumentDto.content,
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

      const result = await service.createDocument(createDocumentDto);

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
