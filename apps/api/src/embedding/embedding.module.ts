import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingRepository } from './embedding.repository';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [PrismaModule],
  providers: [EmbeddingService, EmbeddingRepository],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
