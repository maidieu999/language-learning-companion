import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChunkingRepository } from './chunking.repository';
import { ChunkingService } from './chunking.service';

@Module({
  imports: [PrismaModule],
  providers: [ChunkingService, ChunkingRepository],
  exports: [ChunkingService, ChunkingRepository],
})
export class ChunkingModule {}
