import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { DocumentModel } from '../database/prisma.types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents for the current user' })
  @ApiOkResponse({ description: 'Documents ordered by newest first' })
  listDocuments(@CurrentUser() user: AuthUser): Promise<DocumentModel[]> {
    return this.documentsService.listDocuments(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a document' })
  @ApiCreatedResponse({ description: 'Document created' })
  createDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentModel> {
    return this.documentsService.createDocument(user.id, dto);
  }
}
