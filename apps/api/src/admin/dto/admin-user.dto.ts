import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../database/prisma.types';

export class AdminUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  documentCount: number;
}
