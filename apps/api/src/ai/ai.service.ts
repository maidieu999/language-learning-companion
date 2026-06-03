import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import type { QueryIntent } from '../search/query-intent.types';
import {
  MAP_REDUCE_BATCH_CHAR_LIMIT,
  batchTextsByCharLimit,
} from '../search/search.constants';

/** Matches Postgres `vector(1536)` in prisma/schema.prisma */
const EMBEDDING_DIMENSIONS = 1536;
const GENERATION_MODEL = 'gemini-2.5-flash';

@Injectable()
export class AiService {
  private readonly client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async createEmbedding(text: string): Promise<number[]> {
    return await this.embedText(text, 'RETRIEVAL_DOCUMENT');
  }

  async createQueryEmbedding(text: string): Promise<number[]> {
    return await this.embedText(text, 'RETRIEVAL_QUERY');
  }

  async classifyQueryIntent(query: string): Promise<QueryIntent> {
    const prompt = `Classify the student's question for a language-learning app.

Return ONLY valid JSON with this shape: {"intent":"retrieval"} or {"intent":"document_scope"}

- retrieval: specific questions answerable from a few relevant passages (definitions, examples, "what does X mean", grammar points).
- document_scope: needs the whole lesson or document (summarize, outline, main topics, overview, "what is this document about").

Examples retrieval: "What does Xin chào mean?", "How do I use là?"
Examples document_scope: "Summarize this document", "What are the main topics?", "Give me an outline"

Question: ${query}`;

    const response = await this.client.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) {
      return 'retrieval';
    }

    return this.parseQueryIntent(text);
  }

  async generateAnswerFromContext(
    query: string,
    contexts: string[],
  ): Promise<string> {
    const excerpts = contexts
      .map((content, index) => `[${index + 1}] ${content}`)
      .join('\n\n');

    const prompt = `You are a language learning assistant. Answer the student's question using ONLY the excerpts below. If the excerpts do not contain enough information, say so clearly. Do not invent facts.

Excerpts:
${excerpts}

Question: ${query}`;

    return this.generateText(prompt);
  }

  async generateAnswerFromDocument(
    query: string,
    documentTitle: string,
    fullText: string,
  ): Promise<string> {
    const prompt = `You are a language learning assistant. Answer the student's question using ONLY the full document text below. If the document does not contain enough information, say so clearly. Do not invent facts.

Document title: ${documentTitle}

Document:
${fullText}

Question: ${query}`;

    return this.generateText(prompt);
  }

  async generateAnswerFromDocumentMapReduce(
    query: string,
    documentTitle: string,
    chunks: string[],
  ): Promise<string> {
    const batches = batchTextsByCharLimit(chunks, MAP_REDUCE_BATCH_CHAR_LIMIT);

    const partialSummaries: string[] = [];
    for (let i = 0; i < batches.length; i++) {
      const sectionText = batches[i].join('\n\n');
      const partial = await this.generateMapStep(
        query,
        documentTitle,
        sectionText,
        i + 1,
        batches.length,
      );
      partialSummaries.push(partial);
    }

    return this.generateReduceStep(query, documentTitle, partialSummaries);
  }

  /** Required for gemini-embedding-001 when outputDimensionality is not 3072. */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((x) => x / magnitude);
  }

  private parseQueryIntent(raw: string): QueryIntent {
    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'intent' in parsed &&
        (parsed.intent === 'retrieval' || parsed.intent === 'document_scope')
      ) {
        return parsed.intent;
      }
    } catch {
      // fall through to default
    }

    return 'retrieval';
  }

  private async generateMapStep(
    query: string,
    documentTitle: string,
    sectionText: string,
    sectionIndex: number,
    sectionCount: number,
  ): Promise<string> {
    const prompt = `You are a language learning assistant. The student asked a question about the document "${documentTitle}" (section ${sectionIndex} of ${sectionCount}).

Summarize only what is relevant to their question from this section. Do not invent facts.

Section:
${sectionText}

Question: ${query}`;

    return this.generateText(prompt);
  }

  private async generateReduceStep(
    query: string,
    documentTitle: string,
    partialSummaries: string[],
  ): Promise<string> {
    const combined = partialSummaries
      .map((summary, index) => `[Section ${index + 1}]\n${summary}`)
      .join('\n\n');

    const prompt = `You are a language learning assistant. Combine the section notes below into one clear answer for the student about "${documentTitle}". Use only information from the notes. Do not invent facts.

Section notes:
${combined}

Question: ${query}`;

    return this.generateText(prompt);
  }

  private async generateText(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Gemini returned no answer text');
    }

    return text;
  }

  private async embedText(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values?.length) {
      throw new Error('Gemini returned no embedding values');
    }

    return this.normalizeVector(values);
  }
}
