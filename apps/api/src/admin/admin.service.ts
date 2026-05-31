import { Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentModel } from '../database/prisma.types';
import { DocumentRepository } from '../documents/documents.repository';
import { UsersRepository } from '../users/users.repository';
import type { AdminUserDto } from './dto/admin-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async listUsers(): Promise<AdminUserDto[]> {
    const users = await this.usersRepository.listUsers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      documentCount: user._count.documents,
    }));
  }

  async listUserDocuments(userId: string): Promise<DocumentModel[]> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.documentRepository.listDocuments(userId);
  }
}
