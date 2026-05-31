import type {
  Document as PrismaDocument,
  Prisma,
  User as PrismaUser,
} from '@prisma/client';

export { Role } from '@prisma/client';

/** Prisma model type (aliased to avoid clashing with the DOM `Document` global). */
export type DocumentModel = PrismaDocument;

export type UserModel = PrismaUser;

export type CreateDocumentData = Prisma.DocumentUncheckedCreateInput;

export type CreateUserData = Prisma.UserUncheckedCreateInput;

export type DocumentWhereUniqueInput = Prisma.DocumentWhereUniqueInput;

export type DocumentWhereInput = Prisma.DocumentWhereInput;

export type UserWhereUniqueInput = Prisma.UserWhereUniqueInput;
