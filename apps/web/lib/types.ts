export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
}

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

export interface SearchInput {
  query: string;
  topK?: number;
  documentId?: string;
}
