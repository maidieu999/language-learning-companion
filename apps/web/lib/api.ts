import type {
  CreateDocumentInput,
  Document,
  SearchInput,
  SearchResult,
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
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

export function search(input: SearchInput): Promise<SearchResult> {
  return request<SearchResult>('/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
