import { BadRequestException } from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';
import {
  parseUploadedFile,
  titleFromFilename,
} from 'src/documents/file-validation.util';
import type { UploadedFilePayload } from 'src/documents/file-upload.types';

describe('file-validation.util', () => {
  const baseFile: UploadedFilePayload = {
    buffer: Buffer.from('hello'),
    originalname: 'notes.txt',
    mimetype: 'text/plain',
    size: 5,
  };

  it('parses text files', () => {
    const parsed = parseUploadedFile(baseFile);

    expect(parsed.sourceType).toBe(DocumentSourceType.TEXT_FILE);
    expect(parsed.extension).toBe('txt');
  });

  it('parses pdf files', () => {
    const parsed = parseUploadedFile({
      ...baseFile,
      originalname: 'lesson.pdf',
      mimetype: 'application/pdf',
    });

    expect(parsed.sourceType).toBe(DocumentSourceType.PDF);
    expect(parsed.extension).toBe('pdf');
  });

  it('parses docx files', () => {
    const parsed = parseUploadedFile({
      ...baseFile,
      originalname: 'lesson.docx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(parsed.sourceType).toBe(DocumentSourceType.DOCX);
    expect(parsed.extension).toBe('docx');
  });

  it('rejects unsupported types', () => {
    expect(() =>
      parseUploadedFile({
        ...baseFile,
        originalname: 'photo.png',
        mimetype: 'image/png',
      }),
    ).toThrow(BadRequestException);
  });

  it('derives title from filename', () => {
    expect(titleFromFilename('my-lesson.pdf')).toBe('my-lesson');
  });
});
