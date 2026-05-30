import type { Document as PrismaDocument, Prisma } from '@prisma/client';

/** Prisma model type (aliased to avoid clashing with the DOM `Document` global). */
export type DocumentModel = PrismaDocument;

export type CreateDocumentData = Prisma.DocumentUncheckedCreateInput;

export type DocumentWhereUniqueInput = Prisma.DocumentWhereUniqueInput;

export type DocumentWhereInput = Prisma.DocumentWhereInput;
