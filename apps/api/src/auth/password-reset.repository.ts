import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../database/base.repository';
import { PrismaService } from '../prisma/prisma.service';

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

@Injectable()
export class PasswordResetRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    return this.getClient().passwordResetToken.create({ data });
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return this.getClient().passwordResetToken.findFirst({
      where: { tokenHash },
    });
  }

  markUsed(id: string): Promise<PasswordResetTokenRecord> {
    return this.getClient().passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  invalidateForUser(userId: string): Promise<void> {
    return this.getClient().passwordResetToken
      .updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      })
      .then(() => undefined);
  }
}
