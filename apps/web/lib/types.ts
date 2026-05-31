export type UserRole = 'LEARNER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
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
