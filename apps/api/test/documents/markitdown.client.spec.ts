import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarkItDownClient } from 'src/documents/markitdown.client';

describe('MarkItDownClient', () => {
  let client: MarkItDownClient;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarkItDownClient],
    }).compile();

    client = module.get(MarkItDownClient);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns trimmed markdown on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ markdown: '  # Lesson\n\nHello  ' }),
    });

    const markdown = await client.convertToMarkdown(
      Buffer.from('pdf'),
      'lesson.pdf',
      'application/pdf',
    );

    expect(markdown).toBe('# Lesson\n\nHello');
  });

  it('throws BadRequestException for empty conversion output', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ markdown: '   ' }),
    });

    await expect(
      client.convertToMarkdown(
        Buffer.from('pdf'),
        'lesson.pdf',
        'application/pdf',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for 422 responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => ({ detail: 'File contains no extractable text' }),
    });

    await expect(
      client.convertToMarkdown(
        Buffer.from('pdf'),
        'lesson.pdf',
        'application/pdf',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ServiceUnavailableException when converter is down', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ detail: 'down' }),
    });

    await expect(
      client.convertToMarkdown(
        Buffer.from('pdf'),
        'lesson.pdf',
        'application/pdf',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
