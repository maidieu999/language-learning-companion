import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { DocumentModel } from '../database/prisma.types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOkResponse({ description: 'Document details' })
  getDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<DocumentModel> {
    return this.documentsService.getDocument(user.id, id);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document and re-index when content changes' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOkResponse({ description: 'Document updated' })
  updateDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentModel> {
    return this.documentsService.updateDocument(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a document and its chunks and embeddings' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiNoContentResponse({ description: 'Document deleted' })
  deleteDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.documentsService.deleteDocument(user.id, id);
  }
}
