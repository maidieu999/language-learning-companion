import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';
import { MarkItDownClient } from './markitdown.client';

const MARKITDOWN_SOURCE_TYPES = new Set<DocumentSourceType>([
  DocumentSourceType.PDF,
  DocumentSourceType.DOCX,
]);

@Injectable()
export class FileExtractionService {
  constructor(private readonly markItDownClient: MarkItDownClient) {}

  async extractText(
    buffer: Buffer,
    sourceType: DocumentSourceType,
    originalFilename: string,
    mimeType: string,
  ): Promise<string> {
    let text: string;

    if (sourceType === DocumentSourceType.TEXT_FILE) {
      text = buffer.toString('utf8');
    } else if (MARKITDOWN_SOURCE_TYPES.has(sourceType)) {
      text = await this.markItDownClient.convertToMarkdown(
        buffer,
        originalFilename,
        mimeType,
      );
    } else {
      throw new BadRequestException('Unsupported file type for extraction');
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('File contains no extractable text');
    }

    return trimmed;
  }
}
