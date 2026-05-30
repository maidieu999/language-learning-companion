import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import { ChunkingRepository } from '../chunking/chunking.repository';
import { ChunkingService } from '../chunking/chunking.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [
    DocumentRepository,
    DocumentsService,
    ChunkingService,
    ChunkingRepository,
  ],
})
export class DocumentsModule {}
