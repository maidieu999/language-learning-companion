import { Injectable } from '@nestjs/common';
import type { DocumentModel } from '../database/prisma.types';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentRepository } from './documents.repository';

@Injectable()
export class DocumentsService {
  constructor(private readonly documentRepository: DocumentRepository) {}

  createDocument(createDocumentDto: CreateDocumentDto): Promise<DocumentModel> {
    return this.documentRepository.createDocument({
      title: createDocumentDto.title,
      content: createDocumentDto.content,
    });
  }
}
