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
}
