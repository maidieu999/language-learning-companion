import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRepository } from 'src/documents/documents.repository';
import { DocumentsService } from 'src/documents/documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: DocumentRepository,
          useValue: {
            createDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
