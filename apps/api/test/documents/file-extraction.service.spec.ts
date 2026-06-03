import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentSourceType } from '@prisma/client';
import { FileExtractionService } from 'src/documents/file-extraction.service';

describe('FileExtractionService', () => {
  let service: FileExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileExtractionService],
    }).compile();

    service = module.get(FileExtractionService);
  });

  it('extracts UTF-8 text from a text file', async () => {
    const buffer = Buffer.from('  Hello from a lesson file.  ', 'utf8');

    const text = await service.extractText(
      buffer,
      DocumentSourceType.TEXT_FILE,
    );

    expect(text).toBe('Hello from a lesson file.');
  });

  it('throws when text file content is empty', async () => {
    await expect(
      service.extractText(Buffer.from('   '), DocumentSourceType.TEXT_FILE),
    ).rejects.toThrow(BadRequestException);
  });
});
