import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentRepository, DocumentsService],
})
export class DocumentsModule {}
