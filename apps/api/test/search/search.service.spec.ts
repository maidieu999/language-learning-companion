import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from 'src/ai/ai.service';
import { DocumentRepository } from 'src/documents/documents.repository';
import { EmbeddingService } from 'src/embedding/embedding.service';
import type { SimilarChunkResult } from 'src/embedding/embedding.service';
import { SearchService } from 'src/search/search.service';

describe('SearchService', () => {
  let service: SearchService;
  let aiService: {
    createQueryEmbedding: jest.Mock;
    generateAnswerFromContext: jest.Mock;
  };
  let embeddingService: { findSimilar: jest.Mock };
  let documentRepository: { findDocumentForUser: jest.Mock };

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

  beforeEach(async () => {
    aiService = {
      createQueryEmbedding: jest.fn().mockResolvedValue(queryVector),
      generateAnswerFromContext: jest
        .fn()
        .mockResolvedValue('Xin chào means hello.'),
    };
    embeddingService = {
      findSimilar: jest.fn().mockResolvedValue(hits),
    };
    documentRepository = {
      findDocumentForUser: jest.fn().mockResolvedValue({ id: 'doc-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: AiService, useValue: aiService },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: DocumentRepository, useValue: documentRepository },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('embeds query, retrieves similar chunks, and generates an answer', async () => {
      const result = await service.search(userId, query);

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
      });
    });
  });
});
