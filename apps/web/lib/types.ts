export type UserRole = 'LEARNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  documentCount: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export type DocumentSourceType = 'PASTE' | 'PDF' | 'TEXT_FILE';

export interface Document {
  id: string;
  title: string;
  content: string;
  sourceType: DocumentSourceType;
  originalFilename?: string | null;
  mimeType?: string | null;
  hasFile: boolean;
  createdAt: string;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
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
