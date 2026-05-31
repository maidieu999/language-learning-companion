export interface SimilarChunkHit {
  chunkId: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  documentTitle: string;
  distance: number;
}
