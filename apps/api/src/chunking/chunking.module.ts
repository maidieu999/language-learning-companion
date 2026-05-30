import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service';

@Module({
  providers: [ChunkingService],
})
export class ChunkingModule {}
