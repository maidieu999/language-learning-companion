import * as path from 'path';
import type { StoredFileExtension } from './file-upload.types';

export function buildStoredFileKey(
  userId: string,
  documentId: string,
  extension: StoredFileExtension,
): string {
  return path.posix.join(userId, documentId, `original.${extension}`);
}

export function isKeySafe(storedFileKey: string): boolean {
  if (!storedFileKey || storedFileKey.includes('..')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/original\.(pdf|txt|docx)$/.test(
    storedFileKey,
  );
}

export function contentTypeForKey(storedFileKey: string): string {
  if (storedFileKey.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (storedFileKey.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'text/plain';
}
