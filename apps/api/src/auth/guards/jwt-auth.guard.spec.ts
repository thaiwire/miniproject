import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

function createMockContext(): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn(() => ({
      getRequest: vi.fn(() => ({})),
    })),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should bypass authentication when the route is marked @Public()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should defer to the parent passport guard when the route is not @Public()', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext();
    const superCanActivateSpy = vi
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    // route ที่ไม่ public ต้องไม่ short-circuit คืน true เอง -> ต้องเรียก parent (AuthGuard('jwt')) จริง
    expect(superCanActivateSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(true);

    superCanActivateSpy.mockRestore();
  });
});
