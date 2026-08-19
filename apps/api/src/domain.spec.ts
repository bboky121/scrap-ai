import { planEndsAt } from './billing.controller';
import { isContentLocked } from './content.controller';
import { GoogleConfiguredGuard } from './auth.controller';

describe('content entitlement', () => {
  const now = new Date('2026-08-14T00:00:00.000Z');
  it('locks free content at exactly 72 hours', () => {
    expect(isContentLocked(new Date('2026-08-11T00:00:00.001Z'), false, now)).toBe(false);
    expect(isContentLocked(new Date('2026-08-11T00:00:00.000Z'), false, now)).toBe(true);
    expect(isContentLocked(new Date('2020-01-01T00:00:00.000Z'), true, now)).toBe(false);
  });
});

describe('subscription calendar duration', () => {
  it('adds each plan duration', () => {
    const start = new Date('2024-02-29T00:00:00.000Z');
    expect(planEndsAt('WEEK', start).toISOString()).toBe('2024-03-07T00:00:00.000Z');
    expect(planEndsAt('MONTH', start).toISOString()).toBe('2024-03-29T00:00:00.000Z');
    expect(planEndsAt('YEAR', start).toISOString()).toBe('2025-03-01T00:00:00.000Z');
  });
});

describe('Google login configuration', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  afterEach(() => {
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  });

  it('rejects Google OAuth before redirecting when credentials are absent', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => new GoogleConfiguredGuard().canActivate()).toThrow('Google 로그인이 설정되지 않았습니다.');
  });

  it('allows Google OAuth when both credentials are configured', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    expect(new GoogleConfiguredGuard().canActivate()).toBe(true);
  });
});
