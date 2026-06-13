import { Injectable } from '@nestjs/common';

interface MarkdownSection {
  heading: string | null;
  body: string;
}

@Injectable()
export class ChunkingService {
  chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const sections = this.splitMarkdownSections(text);
    if (sections.length > 1 || sections[0]?.heading) {
      return this.chunkMarkdownSections(sections, chunkSize, overlap);
    }

    return this.chunkByCharacters(text, chunkSize, overlap);
  }

  private splitMarkdownSections(text: string): MarkdownSection[] {
    const lines = text.split('\n');
    const sections: MarkdownSection[] = [];
    let currentHeading: string | null = null;
    let currentLines: string[] = [];

    const flush = () => {
      const body = currentLines.join('\n').trim();
      if (body || currentHeading) {
        sections.push({ heading: currentHeading, body });
      }
      currentLines = [];
    };

    for (const line of lines) {
      const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
      if (headingMatch) {
        flush();
        currentHeading = line.trim();
        continue;
      }
      currentLines.push(line);
    }

    flush();

    if (sections.length === 0) {
      return [{ heading: null, body: text.trim() }];
    }

    return sections;
  }

  private chunkMarkdownSections(
    sections: MarkdownSection[],
    chunkSize: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];

    for (const section of sections) {
      const sectionText = this.formatSectionText(section);
      if (!sectionText) {
        continue;
      }

      if (sectionText.length <= chunkSize) {
        chunks.push(sectionText);
        continue;
      }

      const bodyChunks = this.chunkByCharacters(section.body, chunkSize, overlap);
      for (const bodyChunk of bodyChunks) {
        chunks.push(this.formatSectionChunk(section.heading, bodyChunk));
      }
    }

    return chunks.length > 0 ? chunks : this.chunkByCharacters('', chunkSize, overlap);
  }

  private formatSectionText(section: MarkdownSection): string {
    const body = section.body.trim();
    if (!section.heading) {
      return body;
    }
    if (!body) {
      return section.heading;
    }
    return `${section.heading}\n\n${body}`;
  }

  private formatSectionChunk(
    heading: string | null,
    bodyChunk: string,
  ): string {
    const trimmedBody = bodyChunk.trim();
    if (!heading) {
      return trimmedBody;
    }
    if (!trimmedBody) {
      return heading;
    }
    return `${heading}\n\n${trimmedBody}`;
  }

  private chunkByCharacters(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = start + chunkSize;
      chunks.push(text.slice(start, end));
      if (end >= text.length) {
        break;
      }
      start += chunkSize - overlap;
    }

    return chunks;
  }
}
