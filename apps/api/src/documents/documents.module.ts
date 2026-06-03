import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ChunkingModule } from '../chunking/chunking.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentRepository } from './documents.repository';
import { DocumentsService } from './documents.service';
import { FileExtractionService } from './file-extraction.service';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [PrismaModule, ChunkingModule, EmbeddingModule, AiModule],
  controllers: [DocumentsController],
  providers: [
    DocumentRepository,
    DocumentsService,
    FileExtractionService,
    FileStorageService,
  ],
  exports: [DocumentRepository, DocumentsService],
})
export class DocumentsModule {}
