import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { DocumentModel } from '../database/prisma.types';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all documents' })
  @ApiOkResponse({ description: 'Documents ordered by newest first' })
  listDocuments(): Promise<DocumentModel[]> {
    return this.documentsService.listDocuments();
  }

  @Post()
  @ApiOperation({ summary: 'Create a document' })
  @ApiCreatedResponse({ description: 'Document created' })
  createDocument(@Body() dto: CreateDocumentDto): Promise<DocumentModel> {
    return this.documentsService.createDocument(dto);
  }
}
