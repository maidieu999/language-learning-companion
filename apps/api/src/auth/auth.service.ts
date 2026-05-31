import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Role } from '../database/prisma.types';
import type { UserModel } from '../database/prisma.types';
import { UsersRepository } from '../users/users.repository';
import { PasswordResetRepository } from './password-reset.repository';
import type {
  AuthResponse,
  AuthUser,
  JwtPayload,
} from './auth.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_ROUNDS = 12;

export interface ForgotPasswordResult {
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.createUser({
      email: dto.email,
      passwordHash,
      role: Role.LEARNER,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  getProfile(user: AuthUser): AuthUser {
    return user;
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResult> {
    const message =
      'If an account exists for this email, a reset token was created.';
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      return { message };
    }

    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date(
      Date.now() + this.getPasswordResetTtlMs(),
    );

    await this.passwordResetRepository.invalidateForUser(user.id);
    await this.passwordResetRepository.createToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      message,
      resetToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashResetToken(dto.token);
    const record =
      await this.passwordResetRepository.findByTokenHash(tokenHash);

    if (!record || record.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.updatePassword(record.userId, passwordHash);
    await this.passwordResetRepository.markUsed(record.id);

    return { message: 'Password updated successfully' };
  }

  private buildAuthResponse(user: UserModel): AuthResponse {
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: authUser,
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getPasswordResetTtlMs(): number {
    const raw = process.env.PASSWORD_RESET_EXPIRES_IN ?? '1h';
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) {
      return 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 60 * 60 * 1000);
  }
}
