import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from 'src/ai/ai.service';

const generateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent,
      embedContent: jest.fn(),
    },
  })),
}));

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    generateContent.mockReset();
    process.env.GEMINI_API_KEY ??= 'test-gemini-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyQueryIntent', () => {
    it('returns retrieval when model returns retrieval JSON', async () => {
      generateContent.mockResolvedValue({
        text: '{"intent":"retrieval"}',
      });

      await expect(
        service.classifyQueryIntent('What does Xin chào mean?'),
      ).resolves.toBe('retrieval');
    });

    it('returns document_scope when model returns document_scope JSON', async () => {
      generateContent.mockResolvedValue({
        text: '{"intent":"document_scope"}',
      });

      await expect(
        service.classifyQueryIntent('Summarize this document'),
      ).resolves.toBe('document_scope');
    });

    it('parses JSON wrapped in markdown fences', async () => {
      generateContent.mockResolvedValue({
        text: '```json\n{"intent":"document_scope"}\n```',
      });

      await expect(service.classifyQueryIntent('Give me an outline')).resolves.toBe(
        'document_scope',
      );
    });

    it('defaults to retrieval on invalid JSON', async () => {
      generateContent.mockResolvedValue({ text: 'not json' });

      await expect(service.classifyQueryIntent('Summarize')).resolves.toBe(
        'retrieval',
      );
    });

    it('defaults to retrieval when response has no text', async () => {
      generateContent.mockResolvedValue({ text: undefined });

      await expect(service.classifyQueryIntent('Summarize')).resolves.toBe(
        'retrieval',
      );
    });
  });
});
