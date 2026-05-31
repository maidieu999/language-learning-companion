import { Injectable } from '@nestjs/common';
import type {
  CreateUserData,
  UserModel,
  UserWhereUniqueInput,
} from '../database/prisma.types';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  createUser(data: CreateUserData): Promise<UserModel> {
    return this.getClient().user.create({ data });
  }

  findByEmail(email: string): Promise<UserModel | null> {
    return this.getClient().user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserModel | null> {
    return this.getClient().user.findUnique({ where: { id } });
  }

  findUnique(where: UserWhereUniqueInput): Promise<UserModel | null> {
    return this.getClient().user.findUnique({ where });
  }

  updatePassword(id: string, passwordHash: string): Promise<UserModel> {
    return this.getClient().user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  listUsers(): Promise<
    Array<{
      id: string;
      email: string;
      role: UserModel['role'];
      createdAt: Date;
      _count: { documents: number };
    }>
  > {
    return this.getClient().user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
