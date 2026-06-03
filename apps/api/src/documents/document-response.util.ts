import type { DocumentModel } from '../database/prisma.types';

export type DocumentResponse = Omit<DocumentModel, 'storedFileKey'> & {
  hasFile: boolean;
};

export function toDocumentResponse(document: DocumentModel): DocumentResponse {
  const { storedFileKey, ...rest } = document;
  return {
    ...rest,
    hasFile: !!storedFileKey,
  };
}
