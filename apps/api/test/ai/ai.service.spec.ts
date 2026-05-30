import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from 'src/ai/ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    process.env.GEMINI_API_KEY ??= 'test-gemini-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
