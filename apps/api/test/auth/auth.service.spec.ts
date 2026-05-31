import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from 'src/database/prisma.types';
import { AuthService } from 'src/auth/auth.service';
import { PasswordResetRepository } from 'src/auth/password-reset.repository';
import { UsersRepository } from 'src/users/users.repository';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'plain-reset-token',
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: () => 'token-hash',
  })),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmail: jest.Mock;
    createUser: jest.Mock;
    updatePassword: jest.Mock;
  };
  let passwordResetRepository: {
    invalidateForUser: jest.Mock;
    createToken: jest.Mock;
    findByTokenHash: jest.Mock;
    markUsed: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const user = {
    id: 'user-1',
    email: 'learner@example.com',
    passwordHash: 'hashed-password',
    role: Role.LEARNER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
      createUser: jest.fn().mockResolvedValue(user),
      updatePassword: jest.fn().mockResolvedValue(user),
    };
    passwordResetRepository = {
      invalidateForUser: jest.fn().mockResolvedValue(undefined),
      createToken: jest.fn().mockResolvedValue({
        id: 'token-1',
        userId: user.id,
        tokenHash: 'token-hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      }),
      findByTokenHash: jest.fn(),
      markUsed: jest.fn().mockResolvedValue({}),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        {
          provide: PasswordResetRepository,
          useValue: passwordResetRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a learner and returns a token', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.register({
        email: user.email,
        password: 'password123',
      });

      expect(usersRepository.createUser).toHaveBeenCalledWith({
        email: user.email,
        passwordHash: 'hashed-password',
        role: Role.LEARNER,
      });
      expect(result.accessToken).toBe('jwt-token');
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        role: Role.LEARNER,
      });
    });

    it('throws when email is taken', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);

      await expect(
        service.register({ email: user.email, password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token when credentials are valid', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: user.email,
        password: 'password123',
      });

      expect(result.accessToken).toBe('jwt-token');
    });

    it('throws when password is wrong', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: user.email, password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('returns a dev reset token when the user exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(user);

      const result = await service.forgotPassword({ email: user.email });

      expect(result.resetToken).toBe('plain-reset-token');
      expect(passwordResetRepository.createToken).toHaveBeenCalled();
    });

    it('returns only a message when the user is missing', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'missing@example.com' });

      expect(result.resetToken).toBeUndefined();
      expect(passwordResetRepository.createToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates the password for a valid token', async () => {
      passwordResetRepository.findByTokenHash.mockResolvedValue({
        id: 'token-1',
        userId: user.id,
        tokenHash: 'token-hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      const result = await service.resetPassword({
        token: 'plain-reset-token',
        newPassword: 'newpassword123',
      });

      expect(usersRepository.updatePassword).toHaveBeenCalledWith(
        user.id,
        'hashed-password',
      );
      expect(passwordResetRepository.markUsed).toHaveBeenCalledWith('token-1');
      expect(result.message).toContain('success');
    });
  });
});
