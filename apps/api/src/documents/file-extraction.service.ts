import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class FileExtractionService {
  async extractText(
    buffer: Buffer,
    sourceType: DocumentSourceType,
  ): Promise<string> {
    let text: string;

    if (sourceType === DocumentSourceType.TEXT_FILE) {
      text = buffer.toString('utf8');
    } else if (sourceType === DocumentSourceType.PDF) {
      text = await this.extractPdfText(buffer);
    } else {
      throw new BadRequestException('Unsupported file type for extraction');
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('File contains no extractable text');
    }

    return trimmed;
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
