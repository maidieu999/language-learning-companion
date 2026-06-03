import type { DocumentSourceType } from '@prisma/client';

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface ParsedUploadFile {
  sourceType: DocumentSourceType;
  mimeType: string;
  extension: 'pdf' | 'txt';
  originalFilename: string;
}

export interface DocumentFileStream {
  stream: NodeJS.ReadableStream;
  filename: string;
  mimeType: string;
}
