import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/database/prisma.types';
import { AdminService } from 'src/admin/admin.service';
import { DocumentRepository } from 'src/documents/documents.repository';
import { UsersRepository } from 'src/users/users.repository';

describe('AdminService', () => {
  let service: AdminService;
  let usersRepository: {
    listUsers: jest.Mock;
    findById: jest.Mock;
  };
  let documentRepository: { listDocuments: jest.Mock };

  const userRow = {
    id: 'user-1',
    email: 'learner@example.com',
    role: Role.LEARNER,
    createdAt: new Date('2026-01-01'),
    _count: { documents: 2 },
  };

  const document = {
    id: 'doc-1',
    title: 'Lesson 1',
    content: 'Hello',
    userId: 'user-1',
    createdAt: new Date('2026-01-02'),
  };

  beforeEach(async () => {
    usersRepository = {
      listUsers: jest.fn().mockResolvedValue([userRow]),
      findById: jest.fn().mockResolvedValue({
        id: userRow.id,
        email: userRow.email,
        role: userRow.role,
      }),
    };
    documentRepository = {
      listDocuments: jest.fn().mockResolvedValue([document]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: DocumentRepository, useValue: documentRepository },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('listUsers', () => {
    it('maps users with document counts', async () => {
      const result = await service.listUsers();

      expect(result).toEqual([
        {
          id: userRow.id,
          email: userRow.email,
          role: userRow.role,
          createdAt: userRow.createdAt,
          documentCount: 2,
        },
      ]);
      expect(usersRepository.listUsers).toHaveBeenCalled();
    });
  });

  describe('listUserDocuments', () => {
    it('returns documents when user exists', async () => {
      const result = await service.listUserDocuments(userRow.id);

      expect(result).toEqual([document]);
      expect(usersRepository.findById).toHaveBeenCalledWith(userRow.id);
      expect(documentRepository.listDocuments).toHaveBeenCalledWith(userRow.id);
    });

    it('throws NotFoundException when user is missing', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.listUserDocuments('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(documentRepository.listDocuments).not.toHaveBeenCalled();
    });
  });
});
