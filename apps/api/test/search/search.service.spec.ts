import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from 'src/ai/ai.service';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: AiService, useValue: aiService },
        { provide: EmbeddingService, useValue: embeddingService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('embeds query, retrieves similar chunks, and generates an answer', async () => {
      const result = await service.search(query);

      expect(aiService.createQueryEmbedding).toHaveBeenCalledWith(query);
      expect(embeddingService.findSimilar).toHaveBeenCalledWith(queryVector, {
        topK: 5,
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

      await service.search(query, documentId, 3);

      expect(embeddingService.findSimilar).toHaveBeenCalledWith(queryVector, {
        topK: 3,
        documentId,
      });
    });

    it('returns empty sources and skips generation when no hits', async () => {
      embeddingService.findSimilar.mockResolvedValue([]);

      const result = await service.search(query);

      expect(aiService.generateAnswerFromContext).not.toHaveBeenCalled();
      expect(result).toEqual({
        answer: 'No matching material found.',
        sources: [],
      });
    });
  });
});
