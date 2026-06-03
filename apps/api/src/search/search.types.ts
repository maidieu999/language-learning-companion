import type { QueryIntent, SearchStrategy } from './query-intent.types';

export interface SearchSource {
  chunkId: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  documentTitle: string;
  similarity: number;
}

export interface SearchResult {
  answer: string;
  sources: SearchSource[];
  strategy: SearchStrategy;
  intent: QueryIntent;
}
