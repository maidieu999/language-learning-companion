import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from 'src/admin/admin.controller';
import { AdminService } from 'src/admin/admin.service';
import { Role } from 'src/database/prisma.types';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: {
    listUsers: jest.Mock;
    listUserDocuments: jest.Mock;
  };

  const adminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: Role.ADMIN,
    createdAt: new Date('2026-01-01'),
    documentCount: 0,
  };

  const document = {
    id: 'doc-1',
    title: 'Lesson',
    content: 'Text',
    userId: 'user-1',
    createdAt: new Date('2026-01-02'),
  };

  beforeEach(async () => {
    adminService = {
      listUsers: jest.fn().mockResolvedValue([adminUser]),
      listUserDocuments: jest.fn().mockResolvedValue([document]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('listUsers delegates to service', async () => {
    const result = await controller.listUsers();

    expect(result).toEqual([adminUser]);
    expect(adminService.listUsers).toHaveBeenCalled();
  });

  it('listUserDocuments delegates to service', async () => {
    const result = await controller.listUserDocuments('user-1');

    expect(result).toEqual([document]);
    expect(adminService.listUserDocuments).toHaveBeenCalledWith('user-1');
  });
});
