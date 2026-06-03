import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Chunk } from '@prisma/client';
import { DocumentSourceType } from '@prisma/client';
import { AiService } from 'src/ai/ai.service';
import { ChunkingRepository } from 'src/chunking/chunking.repository';
import { ChunkingService } from 'src/chunking/chunking.service';
import { EmbeddingService } from 'src/embedding/embedding.service';
import { toDocumentResponse } from 'src/documents/document-response.util';
import { DocumentRepository } from 'src/documents/documents.repository';
import { DocumentsService } from 'src/documents/documents.service';
import { FileExtractionService } from 'src/documents/file-extraction.service';
import { FileStorageService } from 'src/documents/file-storage.service';
import type { UploadedFilePayload } from 'src/documents/file-upload.types';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: {
    createDocument: jest.Mock;
    listDocuments: jest.Mock;
    findDocumentForUser: jest.Mock;
    updateDocument: jest.Mock;
    deleteDocumentForUser: jest.Mock;
  };
  let chunkingService: { chunkText: jest.Mock };
  let chunkingRepository: {
    createMany: jest.Mock;
    deleteByDocumentId: jest.Mock;
  };
  let aiService: { createEmbedding: jest.Mock };
  let embeddingService: {
    createEmbeddings: jest.Mock;
    deleteByDocumentId: jest.Mock;
  };
  let fileExtractionService: { extractText: jest.Mock };
  let fileStorageService: {
    save: jest.Mock;
    replace: jest.Mock;
    delete: jest.Mock;
    assertFileExists: jest.Mock;
    openReadStream: jest.Mock;
  };

  const createDocumentDto = {
    title: 'Intro to Vietnamese',
    content: 'Xin chào means hello.',
  };

  const userId = 'user-1';

  const document = {
    id: 'doc-1',
    title: createDocumentDto.title,
    content: createDocumentDto.content,
    userId,
    sourceType: DocumentSourceType.PASTE,
    originalFilename: null,
    storedFileKey: null,
    mimeType: null,
    createdAt: new Date('2026-01-01'),
  };

  const pdfDocument = {
    ...document,
    sourceType: DocumentSourceType.PDF,
    originalFilename: 'lesson.pdf',
    storedFileKey: 'user-1/doc-1/original.pdf',
    mimeType: 'application/pdf',
  };

  const textChunks = ['chunk-a', 'chunk-b'];

  const savedChunks: Chunk[] = [
    {
      id: 'chunk-1',
      documentId: document.id,
      content: 'chunk-a',
      chunkIndex: 0,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'chunk-2',
      documentId: document.id,
      content: 'chunk-b',
      chunkIndex: 1,
      createdAt: new Date('2026-01-01'),
    },
  ];

  const embeddings = [
    [0.1, 0.2],
    [0.3, 0.4],
  ];

  const uploadFile: UploadedFilePayload = {
    buffer: Buffer.from('file body'),
    originalname: 'lesson.txt',
    mimetype: 'text/plain',
    size: 9,
  };

  beforeEach(async () => {
    documentRepository = {
      createDocument: jest.fn().mockResolvedValue(document),
      listDocuments: jest.fn().mockResolvedValue([document]),
      findDocumentForUser: jest.fn().mockResolvedValue(document),
      updateDocument: jest.fn().mockResolvedValue(document),
      deleteDocumentForUser: jest.fn().mockResolvedValue(undefined),
    };
    chunkingService = {
      chunkText: jest.fn().mockReturnValue(textChunks),
    };
    chunkingRepository = {
      createMany: jest.fn().mockResolvedValue(savedChunks),
      deleteByDocumentId: jest.fn().mockResolvedValue(undefined),
    };
    aiService = {
      createEmbedding: jest
        .fn()
        .mockImplementation((text: string) =>
          Promise.resolve(embeddings[text === 'chunk-a' ? 0 : 1]),
        ),
    };
    embeddingService = {
      createEmbeddings: jest.fn().mockResolvedValue(undefined),
      deleteByDocumentId: jest.fn().mockResolvedValue(undefined),
    };
    fileExtractionService = {
      extractText: jest.fn().mockResolvedValue('Extracted lesson text.'),
    };
    fileStorageService = {
      save: jest.fn().mockResolvedValue('user-1/doc-1/original.txt'),
      replace: jest.fn().mockResolvedValue('user-1/doc-1/original.txt'),
      delete: jest.fn().mockResolvedValue(undefined),
      assertFileExists: jest.fn().mockResolvedValue(undefined),
      openReadStream: jest.fn().mockReturnValue({
        stream: {} as NodeJS.ReadableStream,
        mimeType: 'text/plain',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentRepository, useValue: documentRepository },
        { provide: ChunkingService, useValue: chunkingService },
        { provide: ChunkingRepository, useValue: chunkingRepository },
        { provide: AiService, useValue: aiService },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: FileExtractionService, useValue: fileExtractionService },
        { provide: FileStorageService, useValue: fileStorageService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listDocuments', () => {
    it('returns documents from the repository', async () => {
      const result = await service.listDocuments(userId);

      expect(result).toEqual([toDocumentResponse(document)]);
      expect(documentRepository.listDocuments).toHaveBeenCalledWith(userId);
    });
  });

  describe('getDocument', () => {
    it('returns the document when found', async () => {
      const result = await service.getDocument(userId, document.id);

      expect(result).toEqual(toDocumentResponse(document));
      expect(documentRepository.findDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(service.getDocument(userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDocument', () => {
    it('deletes after verifying ownership', async () => {
      await service.deleteDocument(userId, document.id);

      expect(documentRepository.findDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
      expect(documentRepository.deleteDocumentForUser).toHaveBeenCalledWith(
        document.id,
        userId,
      );
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('deletes stored file when present', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(pdfDocument);

      await service.deleteDocument(userId, pdfDocument.id);

      expect(fileStorageService.delete).toHaveBeenCalledWith(
        pdfDocument.storedFileKey,
      );
      expect(documentRepository.deleteDocumentForUser).toHaveBeenCalledWith(
        pdfDocument.id,
        userId,
      );
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(service.deleteDocument(userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(documentRepository.deleteDocumentForUser).not.toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('throws BadRequestException when no fields provided', async () => {
      await expect(
        service.updateDocument(userId, document.id, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates title only without re-indexing', async () => {
      const updated = { ...document, title: 'New title' };
      documentRepository.updateDocument.mockResolvedValue(updated);

      const result = await service.updateDocument(userId, document.id, {
        title: 'New title',
      });

      expect(result).toEqual(toDocumentResponse(updated));
      expect(documentRepository.updateDocument).toHaveBeenCalledWith(
        document.id,
        userId,
        { title: 'New title' },
      );
      expect(embeddingService.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingRepository.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingService.chunkText).not.toHaveBeenCalled();
    });

    it('re-indexes when content changes', async () => {
      const newContent = 'Updated lesson text.';
      const updated = { ...document, content: newContent };
      documentRepository.updateDocument.mockResolvedValue(updated);

      const result = await service.updateDocument(userId, document.id, {
        content: newContent,
      });

      expect(result).toEqual(toDocumentResponse(updated));
      expect(embeddingService.deleteByDocumentId).toHaveBeenCalledWith(
        document.id,
      );
      expect(chunkingRepository.deleteByDocumentId).toHaveBeenCalledWith(
        document.id,
      );
      expect(chunkingService.chunkText).toHaveBeenCalledWith(newContent);
      expect(chunkingRepository.createMany).toHaveBeenCalledWith(
        document.id,
        textChunks,
      );
      expect(embeddingService.createEmbeddings).toHaveBeenCalled();
    });

    it('rejects content updates for file-based documents', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(pdfDocument);

      await expect(
        service.updateDocument(userId, pdfDocument.id, {
          content: 'Edited in textarea',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(documentRepository.updateDocument).not.toHaveBeenCalled();
    });

    it('skips re-index when content is unchanged', async () => {
      const result = await service.updateDocument(userId, document.id, {
        content: document.content,
      });

      expect(result).toEqual(toDocumentResponse(document));
      expect(embeddingService.deleteByDocumentId).not.toHaveBeenCalled();
      expect(chunkingService.chunkText).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when missing', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(null);

      await expect(
        service.updateDocument(userId, 'missing', { title: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDocument', () => {
    it('persists document, chunks, and embeddings in order with chunk ids', async () => {
      const result = await service.createDocument(userId, createDocumentDto);

      expect(result).toEqual(toDocumentResponse(document));
      expect(documentRepository.createDocument).toHaveBeenCalledWith({
        title: createDocumentDto.title,
        content: createDocumentDto.content,
        userId,
        sourceType: DocumentSourceType.PASTE,
      });
      expect(chunkingService.chunkText).toHaveBeenCalledWith(
        createDocumentDto.content,
      );
      expect(chunkingRepository.createMany).toHaveBeenCalledWith(
        document.id,
        textChunks,
      );
      expect(aiService.createEmbedding).toHaveBeenCalledTimes(2);
      expect(embeddingService.createEmbeddings).toHaveBeenCalledWith(
        ['chunk-1', 'chunk-2'],
        embeddings,
      );
    });

    it('skips embedding when content produces no chunks', async () => {
      chunkingService.chunkText.mockReturnValue([]);
      chunkingRepository.createMany.mockResolvedValue([]);

      const result = await service.createDocument(userId, createDocumentDto);

      expect(result).toEqual(toDocumentResponse(document));
      expect(aiService.createEmbedding).not.toHaveBeenCalled();
      expect(embeddingService.createEmbeddings).toHaveBeenCalledWith([], []);
    });
  });

  describe('createDocumentFromFile', () => {
    it('extracts text, stores file, and indexes', async () => {
      const created = {
        ...document,
        title: 'Custom title',
        content: 'Extracted lesson text.',
        sourceType: DocumentSourceType.TEXT_FILE,
        originalFilename: 'lesson.txt',
        mimeType: 'text/plain',
      };
      const withKey = {
        ...created,
        storedFileKey: 'user-1/doc-1/original.txt',
      };
      documentRepository.createDocument.mockResolvedValue(created);
      documentRepository.updateDocument.mockResolvedValue(withKey);

      const result = await service.createDocumentFromFile(
        userId,
        uploadFile,
        'Custom title',
      );

      expect(fileExtractionService.extractText).toHaveBeenCalled();
      expect(fileStorageService.save).toHaveBeenCalledWith(
        userId,
        created.id,
        uploadFile.buffer,
        'txt',
      );
      expect(documentRepository.updateDocument).toHaveBeenCalledWith(
        created.id,
        userId,
        { storedFileKey: 'user-1/doc-1/original.txt' },
      );
      expect(chunkingService.chunkText).toHaveBeenCalledWith(
        'Extracted lesson text.',
      );
      expect(result.hasFile).toBe(true);
      expect(result.title).toBe('Custom title');
    });
  });

  describe('replaceDocumentFile', () => {
    it('replaces file and re-indexes when content changes', async () => {
      documentRepository.findDocumentForUser.mockResolvedValue(pdfDocument);
      const updated = {
        ...pdfDocument,
        content: 'Extracted lesson text.',
      };
      documentRepository.updateDocument.mockResolvedValue(updated);

      const result = await service.replaceDocumentFile(
        userId,
        pdfDocument.id,
        uploadFile,
      );

      expect(fileStorageService.replace).toHaveBeenCalled();
      expect(embeddingService.deleteByDocumentId).toHaveBeenCalledWith(
        pdfDocument.id,
      );
      expect(chunkingService.chunkText).toHaveBeenCalledWith(
        'Extracted lesson text.',
      );
      expect(result).toEqual(toDocumentResponse(updated));
    });
  });
});
