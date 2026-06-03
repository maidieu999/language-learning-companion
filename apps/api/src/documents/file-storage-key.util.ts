import * as path from 'path';

export function buildStoredFileKey(
  userId: string,
  documentId: string,
  extension: 'pdf' | 'txt',
): string {
  return path.posix.join(userId, documentId, `original.${extension}`);
}

export function isKeySafe(storedFileKey: string): boolean {
  if (!storedFileKey || storedFileKey.includes('..')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/original\.(pdf|txt)$/.test(
    storedFileKey,
  );
}

export function contentTypeForKey(storedFileKey: string): string {
  return storedFileKey.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
}
