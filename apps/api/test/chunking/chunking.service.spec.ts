import { Test, TestingModule } from '@nestjs/testing';
import { ChunkingService } from '../../src/chunking/chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkingService],
    }).compile();

    service = module.get(ChunkingService);
  });

  it('chunks plain text by character window', () => {
    const text = 'a'.repeat(2500);
    const chunks = service.chunkText(text, 1000, 200);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(1000);
    expect(chunks[1]).toHaveLength(1000);
  });

  it('splits markdown sections without crossing headings', () => {
    const text = [
      '## Lesson 1',
      'Short intro.',
      '',
      '## Lesson 2',
      'Different topic.',
    ].join('\n');

    const chunks = service.chunkText(text, 1000, 200);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toContain('## Lesson 1');
    expect(chunks[0]).not.toContain('Lesson 2');
    expect(chunks[1]).toContain('## Lesson 2');
  });

  it('prefixes long section sub-chunks with the section heading', () => {
    const body = 'word '.repeat(400).trim();
    const text = `## Vocabulary\n\n${body}`;

    const chunks = service.chunkText(text, 200, 50);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk).toContain('## Vocabulary');
    }
  });
});
