import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from 'src/documents/documents.controller';
import { DocumentsService } from 'src/documents/documents.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let documentsService: {
    createDocument: jest.Mock;
    listDocuments: jest.Mock;
    getDocument: jest.Mock;
    updateDocument: jest.Mock;
    deleteDocument: jest.Mock;
  };

  const user = { id: 'user-1', email: 'a@b.com', role: 'LEARNER' as const };
  const document = {
    id: 'doc-1',
    title: 'Test',
    content: 'Hello',
    userId: user.id,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    documentsService = {
      createDocument: jest.fn().mockResolvedValue(document),
      listDocuments: jest.fn().mockResolvedValue([document]),
      getDocument: jest.fn().mockResolvedValue(document),
      updateDocument: jest.fn().mockResolvedValue(document),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: documentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listDocuments delegates to service', async () => {
    const result = await controller.listDocuments(user);

    expect(result).toEqual([document]);
    expect(documentsService.listDocuments).toHaveBeenCalledWith(user.id);
  });

  it('getDocument delegates to service', async () => {
    const result = await controller.getDocument(user, document.id);

    expect(result).toBe(document);
    expect(documentsService.getDocument).toHaveBeenCalledWith(
      user.id,
      document.id,
    );
  });

  it('createDocument delegates to service', async () => {
    const dto = { title: 'Test', content: 'Hello' };
    const result = await controller.createDocument(user, dto);

    expect(result).toBe(document);
    expect(documentsService.createDocument).toHaveBeenCalledWith(user.id, dto);
  });

  it('updateDocument delegates to service', async () => {
    const dto = { title: 'Updated' };
    const result = await controller.updateDocument(user, document.id, dto);

    expect(result).toBe(document);
    expect(documentsService.updateDocument).toHaveBeenCalledWith(
      user.id,
      document.id,
      dto,
    );
  });

  it('deleteDocument delegates to service', async () => {
    await controller.deleteDocument(user, document.id);

    expect(documentsService.deleteDocument).toHaveBeenCalledWith(
      user.id,
      document.id,
    );
  });
});
