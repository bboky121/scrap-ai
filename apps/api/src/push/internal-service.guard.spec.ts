import { UnauthorizedException } from '@nestjs/common';
import { InternalServiceGuard } from './internal-service.guard';

describe('InternalServiceGuard', () => {
  const originalToken = process.env.INTERNAL_SERVICE_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.INTERNAL_SERVICE_TOKEN;
    else process.env.INTERNAL_SERVICE_TOKEN = originalToken;
  });

  function context(token?: string): any {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ header: () => token }),
      }),
    };
  }

  it('allows the configured internal token', () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'secret';
    expect(new InternalServiceGuard().canActivate(context('secret'))).toBe(true);
  });

  it('rejects a mismatched internal token', () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'secret';
    expect(() => new InternalServiceGuard().canActivate(context('wrong'))).toThrow(UnauthorizedException);
  });
});
