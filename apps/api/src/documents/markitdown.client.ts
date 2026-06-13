import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  getMarkitdownTimeoutMs,
  getMarkitdownUrl,
} from './markitdown.constants';

interface ConvertResponse {
  markdown?: string;
}

@Injectable()
export class MarkItDownClient {
  async convertToMarkdown(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const baseUrl = getMarkitdownUrl().replace(/\/$/, '');
    const timeoutMs = getMarkitdownTimeoutMs();
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append('file', blob, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (response.status === 413 || response.status === 422) {
        const message = await this.readErrorMessage(response);
        throw new BadRequestException(message);
      }

      if (!response.ok) {
        const message = await this.readErrorMessage(response);
        throw new ServiceUnavailableException(
          message || 'Document conversion service is unavailable',
        );
      }

      const body = (await response.json()) as ConvertResponse;
      const markdown = body.markdown?.trim();
      if (!markdown) {
        throw new BadRequestException('File contains no extractable text');
      }

      return markdown;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'Document conversion timed out; try a smaller file',
        );
      }
      throw new ServiceUnavailableException(
        'Document conversion service is unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body) {
        const detail = (body as { detail: string | { msg: string }[] }).detail;
        if (typeof detail === 'string') {
          return detail;
        }
        if (Array.isArray(detail) && detail[0]?.msg) {
          return detail.map((item) => item.msg).join(', ');
        }
      }
    } catch {
      // ignore JSON parse errors
    }
    return response.statusText || 'Conversion failed';
  }
}
