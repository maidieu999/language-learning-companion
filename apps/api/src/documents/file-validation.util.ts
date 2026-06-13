import { BadRequestException } from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';
import type { ParsedUploadFile, UploadedFilePayload } from './file-upload.types';
import { getMaxUploadBytes } from './file-upload.constants';

function basename(filename: string): string {
  const normalized = filename.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? filename;
}

function extensionOf(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return '';
  }
  return base.slice(dot + 1).toLowerCase();
}

export function parseUploadedFile(
  file: UploadedFilePayload | undefined,
): ParsedUploadFile {
  if (!file?.buffer?.length) {
    throw new BadRequestException('A file is required');
  }

  const maxBytes = getMaxUploadBytes();
  if (file.size > maxBytes) {
    throw new BadRequestException(
      `File exceeds maximum size of ${maxBytes} bytes`,
    );
  }

  const originalFilename = basename(file.originalname || 'upload');
  const ext = extensionOf(originalFilename);
  const mime = file.mimetype?.toLowerCase() ?? '';

  if (ext === 'pdf' || mime === 'application/pdf') {
    return {
      sourceType: DocumentSourceType.PDF,
      mimeType: 'application/pdf',
      extension: 'pdf',
      originalFilename,
    };
  }

  if (ext === 'txt' || mime === 'text/plain') {
    return {
      sourceType: DocumentSourceType.TEXT_FILE,
      mimeType: 'text/plain',
      extension: 'txt',
      originalFilename,
    };
  }

  if (
    ext === 'docx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return {
      sourceType: DocumentSourceType.DOCX,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
      originalFilename,
    };
  }

  throw new BadRequestException(
    'Only PDF (.pdf), Word (.docx), and plain text (.txt) files are supported',
  );
}

export function titleFromFilename(filename: string): string {
  const base = basename(filename);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return base;
  }
  return base.slice(0, dot);
}
