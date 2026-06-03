import { getAccessToken } from './auth';
import type {
  AdminUser,
  AuthResponse,
  CreateDocumentInput,
  Document,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SearchInput,
  SearchResult,
  UpdateDocumentInput,
  User,
} from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3000';

async function parseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }
  } catch {
    // ignore JSON parse errors
  }
  return response.statusText || 'Request failed';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await sendRequest(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await sendRequest(path, init);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

async function sendRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };

  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response;
}

async function requestMultipart<T>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PATCH',
): Promise<T> {
  const response = await sendRequest(path, { method, body: formData });
  return response.json() as Promise<T>;
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export function forgotPassword(
  input: ForgotPasswordInput,
): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resetPassword(
  input: ResetPasswordInput,
): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listDocuments(): Promise<Document[]> {
  return request<Document[]>('/documents');
}

export function createDocument(input: CreateDocumentInput): Promise<Document> {
  return request<Document>('/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getDocument(id: string): Promise<Document> {
  return request<Document>(`/documents/${id}`);
}

export function updateDocument(
  id: string,
  input: UpdateDocumentInput,
): Promise<Document> {
  return request<Document>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteDocument(id: string): Promise<void> {
  return requestVoid(`/documents/${id}`, { method: 'DELETE' });
}

export function createDocumentFromFile(
  file: File,
  title?: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  if (title?.trim()) {
    formData.append('title', title.trim());
  }
  return requestMultipart<Document>('/documents/from-file', formData, 'POST');
}

export function replaceDocumentFile(
  id: string,
  file: File,
  title?: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  if (title?.trim()) {
    formData.append('title', title.trim());
  }
  return requestMultipart<Document>(
    `/documents/${id}/file`,
    formData,
    'PATCH',
  );
}

export async function downloadDocumentFile(
  id: string,
  filename: string,
): Promise<void> {
  const response = await sendRequest(`/documents/${id}/file`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function search(input: SearchInput): Promise<SearchResult> {
  return request<SearchResult>('/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>('/admin/users');
}

export function listAdminUserDocuments(userId: string): Promise<Document[]> {
  return request<Document[]>(`/admin/users/${userId}/documents`);
}
