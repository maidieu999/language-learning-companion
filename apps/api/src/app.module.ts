import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { ChunkingModule } from './chunking/chunking.module';

@Module({
  imports: [PrismaModule, DocumentsModule, ChunkingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
