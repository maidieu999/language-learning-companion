import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentSourceType } from '@prisma/client';
import { FileExtractionService } from 'src/documents/file-extraction.service';
import { MarkItDownClient } from 'src/documents/markitdown.client';

describe('FileExtractionService', () => {
  let service: FileExtractionService;
  let markItDownClient: { convertToMarkdown: jest.Mock };

  beforeEach(async () => {
    markItDownClient = {
      convertToMarkdown: jest.fn().mockResolvedValue('# Lesson\n\nHello'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileExtractionService,
        { provide: MarkItDownClient, useValue: markItDownClient },
      ],
    }).compile();

    service = module.get(FileExtractionService);
  });

  it('extracts UTF-8 text from a text file', async () => {
    const buffer = Buffer.from('  Hello from a lesson file.  ', 'utf8');

    const text = await service.extractText(
      buffer,
      DocumentSourceType.TEXT_FILE,
      'notes.txt',
      'text/plain',
    );

    expect(text).toBe('Hello from a lesson file.');
    expect(markItDownClient.convertToMarkdown).not.toHaveBeenCalled();
  });

  it('converts PDF files through MarkItDown', async () => {
    const text = await service.extractText(
      Buffer.from('pdf'),
      DocumentSourceType.PDF,
      'lesson.pdf',
      'application/pdf',
    );

    expect(text).toBe('# Lesson\n\nHello');
    expect(markItDownClient.convertToMarkdown).toHaveBeenCalledWith(
      expect.any(Buffer),
      'lesson.pdf',
      'application/pdf',
    );
  });

  it('converts DOCX files through MarkItDown', async () => {
    const text = await service.extractText(
      Buffer.from('docx'),
      DocumentSourceType.DOCX,
      'lesson.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    expect(text).toBe('# Lesson\n\nHello');
    expect(markItDownClient.convertToMarkdown).toHaveBeenCalled();
  });

  it('throws when text file content is empty', async () => {
    await expect(
      service.extractText(
        Buffer.from('   '),
        DocumentSourceType.TEXT_FILE,
        'notes.txt',
        'text/plain',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
