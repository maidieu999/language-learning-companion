import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';

/** Matches Postgres `vector(1536)` in prisma/schema.prisma */
const EMBEDDING_DIMENSIONS = 1536;

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
    const response = await this.client.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values?.length) {
      throw new Error('Gemini returned no embedding values');
    }

    return this.normalizeVector(values);
  }

  /** Required for gemini-embedding-001 when outputDimensionality is not 3072. */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((x) => x / magnitude);
  }
}
