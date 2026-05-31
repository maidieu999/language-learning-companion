import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/database/prisma.types';
import { RolesGuard } from 'src/auth/roles.guard';
import { ROLES_KEY } from 'src/auth/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (user?: { role: Role }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(
      guard.canActivate(
        createContext({ id: '1', email: 'a@b.com', role: Role.ADMIN }),
      ),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() =>
      guard.canActivate(
        createContext({ id: '1', email: 'a@b.com', role: Role.LEARNER }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});
