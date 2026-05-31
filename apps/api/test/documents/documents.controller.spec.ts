import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from 'src/documents/documents.controller';
import { DocumentsService } from 'src/documents/documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: {
            createDocument: jest.fn(),
            listDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
