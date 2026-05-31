import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { ChunkingModule } from './chunking/chunking.module';
import { AiModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    PrismaModule,
    DocumentsModule,
    ChunkingModule,
    AiModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
