import type { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected getClient(): PrismaClient {
    return this.prisma.getClient();
  }
}
