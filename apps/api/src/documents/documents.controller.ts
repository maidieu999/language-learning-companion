import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import type { DocumentResponse } from './document-response.util';
import { getMaxUploadBytes } from './file-upload.constants';
import type { UploadedFilePayload } from './file-upload.types';
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
  listDocuments(@CurrentUser() user: AuthUser): Promise<DocumentResponse[]> {
    return this.documentsService.listDocuments(user.id);
  }

  @Post('from-file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: getMaxUploadBytes() } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a document from a PDF, Word, or text file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Document created from file' })
  createDocumentFromFile(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedFilePayload,
    @Body('title') title?: string,
  ): Promise<DocumentResponse> {
    return this.documentsService.createDocumentFromFile(user.id, file, title);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download the original uploaded file' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  async downloadDocumentFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, filename, mimeType } =
      await this.documentsService.getDocumentFileStream(user.id, id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Patch(':id/file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: getMaxUploadBytes() } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Replace a document file and re-index extracted text' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ description: 'Document file replaced' })
  replaceDocumentFile(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: UploadedFilePayload,
    @Body('title') title?: string,
  ): Promise<DocumentResponse> {
    return this.documentsService.replaceDocumentFile(user.id, id, file, title);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiOkResponse({ description: 'Document details' })
  getDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<DocumentResponse> {
    return this.documentsService.getDocument(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a document' })
  @ApiCreatedResponse({ description: 'Document created' })
  createDocument(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponse> {
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
  ): Promise<DocumentResponse> {
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
