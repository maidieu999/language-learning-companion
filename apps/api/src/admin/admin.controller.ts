import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../database/prisma.types';
import type { DocumentModel } from '../database/prisma.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { AdminUserDto } from './dto/admin-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiOkResponse({ type: [AdminUserDto] })
  listUsers(): Promise<AdminUserDto[]> {
    return this.adminService.listUsers();
  }

  @Get('users/:userId/documents')
  @ApiOperation({ summary: "List a user's documents (admin only)" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiOkResponse({ description: 'Documents ordered by newest first' })
  listUserDocuments(
    @Param('userId') userId: string,
  ): Promise<DocumentModel[]> {
    return this.adminService.listUserDocuments(userId);
  }
}
