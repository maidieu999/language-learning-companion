import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from 'src/ai/ai.service';
import { ChunkingRepository } from 'src/chunking/chunking.repository';
import { DocumentRepository } from 'src/documents/documents.repository';
import { EmbeddingService } from 'src/embedding/embedding.service';
import type { SimilarChunkResult } from 'src/embedding/embedding.service';
import { SINGLE_SHOT_CHAR_LIMIT } from 'src/search/search.constants';
import { SearchService } from 'src/search/search.service';

describe('SearchService', () => {
  let service: SearchService;
  let aiService: {
    classifyQueryIntent: jest.Mock;
    createQueryEmbedding: jest.Mock;
    generateAnswerFromContext: jest.Mock;
    generateAnswerFromDocument: jest.Mock;
    generateAnswerFromDocumentMapReduce: jest.Mock;
  };
  let embeddingService: { findSimilar: jest.Mock };
  let documentRepository: { findDocumentForUser: jest.Mock };
  let chunkingRepository: { findByDocumentId: jest.Mock };

  const userId = 'user-1';
  const query = 'What does Xin chào mean?';
  const queryVector = [0.1, 0.2, 0.3];

  const hits: SimilarChunkResult[] = [
    {
      chunkId: 'chunk-1',
      content: 'Xin chào means hello.',
      chunkIndex: 0,
      documentId: 'doc-1',
      documentTitle: 'Intro to Vietnamese',
      distance: 0.1,
      similarity: 0.9,
    },
  ];

  const document = {
    id: 'doc-1',
    title: 'Intro to Vietnamese',
    content: 'Xin chào means hello.',
    userId,
  };

  const chunks = [
    {
      id: 'chunk-1',
      documentId: 'doc-1',
      content: 'Xin chào means hello.',
      chunkIndex: 0,
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    aiService = {
      classifyQueryIntent: jest.fn().mockResolvedValue('retrieval'),
      createQueryEmbedding: jest.fn().mockResolvedValue(queryVector),
      generateAnswerFromContext: jest
        .fn()
        .mockResolvedValue('Xin chào means hello.'),
      generateAnswerFromDocument: jest
        .fn()
        .mockResolvedValue('Document summary.'),
      generateAnswerFromDocumentMapReduce: jest
        .fn()
        .mockResolvedValue('Long document summary.'),
    };
    embeddingService = {
      findSimilar: jest.fn().mockResolvedValue(hits),
    };
    documentRepository = {
      findDocumentForUser: jest.fn().mockResolvedValue(document),
    };
    chunkingRepository = {
      findByDocumentId: jest.fn().mockResolvedValue(chunks),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: AiService, useValue: aiService },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: DocumentRepository, useValue: documentRepository },
        { provide: ChunkingRepository, useValue: chunkingRepository },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search (retrieval)', () => {
    it('embeds query, retrieves similar chunks, and generates an answer', async () => {
      const result = await service.search(userId, query);

      expect(aiService.classifyQueryIntent).toHaveBeenCalledWith(query);
      expect(aiService.createQueryEmbedding).toHaveBeenCalledWith(query);
      expect(embeddingService.findSimilar).toHaveBeenCalledWith(queryVector, {
        topK: 5,
        userId,
        documentId: undefined,
      });
      expect(aiService.generateAnswerFromContext).toHaveBeenCalledWith(query, [
        'Xin chào means hello.',
      ]);
      expect(result.answer).toBe('Xin chào means hello.');
      expect(result.strategy).toBe('rag');
      expect(result.intent).toBe('retrieval');
      expect(result.sources).toEqual([
        {
          chunkId: 'chunk-1',
          content: 'Xin chào means hello.',
          chunkIndex: 0,
          documentId: 'doc-1',
          documentTitle: 'Intro to Vietnamese',
          similarity: 0.9,
        },
      ]);
    });

    it('passes topK and documentId to findSimilar', async () => {
      const documentId = 'doc-1';

      await service.search(userId, query, documentId, 3);

      expect(documentRepository.findDocumentForUser).toHaveBeenCalledWith(
        documentId,
        userId,
      );
      expect(embeddingService.findSimilar).toHaveBeenCalledWith(queryVector, {
        topK: 3,
        userId,
        documentId,
      });
    });

    it('returns empty sources and skips generation when no hits', async () => {
      embeddingService.findSimilar.mockResolvedValue([]);

      const result = await service.search(userId, query);

      expect(aiService.generateAnswerFromContext).not.toHaveBeenCalled();
      expect(result).toEqual({
        answer: 'No matching material found.',
        sources: [],
        strategy: 'rag',
        intent: 'retrieval',
      });
    });
  });

  describe('search (document_scope)', () => {
    const summarizeQuery = 'Summarize the main content of this document';

    beforeEach(() => {
      aiService.classifyQueryIntent.mockResolvedValue('document_scope');
    });

    it('throws BadRequest when documentId is missing', async () => {
      await expect(service.search(userId, summarizeQuery)).rejects.toThrow(
        BadRequestException,
      );
      expect(documentRepository.findDocumentForUser).not.toHaveBeenCalled();
      expect(embeddingService.findSimilar).not.toHaveBeenCalled();
    });

    it('uses single-shot generation for short documents', async () => {
      const result = await service.search(userId, summarizeQuery, 'doc-1');

      expect(aiService.generateAnswerFromDocument).toHaveBeenCalledWith(
        summarizeQuery,
        document.title,
        document.content,
      );
      expect(aiService.generateAnswerFromDocumentMapReduce).not.toHaveBeenCalled();
      expect(embeddingService.findSimilar).not.toHaveBeenCalled();
      expect(result.strategy).toBe('full_document');
      expect(result.intent).toBe('document_scope');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].similarity).toBe(1);
    });

    it('uses map-reduce when document content exceeds single-shot limit', async () => {
      const longContent = 'x'.repeat(SINGLE_SHOT_CHAR_LIMIT + 1);
      documentRepository.findDocumentForUser.mockResolvedValue({
        ...document,
        content: longContent,
      });
      chunkingRepository.findByDocumentId.mockResolvedValue([
        { ...chunks[0], content: 'part one' },
        {
          id: 'chunk-2',
          documentId: 'doc-1',
          content: 'part two',
          chunkIndex: 1,
          createdAt: new Date(),
        },
      ]);

      const result = await service.search(userId, summarizeQuery, 'doc-1');

      expect(aiService.generateAnswerFromDocumentMapReduce).toHaveBeenCalledWith(
        summarizeQuery,
        document.title,
        ['part one', 'part two'],
      );
      expect(aiService.generateAnswerFromDocument).not.toHaveBeenCalled();
      expect(result.answer).toBe('Long document summary.');
      expect(result.sources).toHaveLength(2);
    });

    it('returns empty answer when document has no content', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue({
        ...document,
        content: '   ',
      });
      chunkingRepository.findByDocumentId.mockResolvedValue([]);

      const result = await service.search(userId, summarizeQuery, 'doc-1');

      expect(aiService.generateAnswerFromDocument).not.toHaveBeenCalled();
      expect(result).toEqual({
        answer: 'No matching material found.',
        sources: [],
        strategy: 'full_document',
        intent: 'document_scope',
      });
    });
  });
});
