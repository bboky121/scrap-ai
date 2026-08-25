import { userId } from './session';

describe('userId', () => {
  it('returns the authenticated user and rejects an anonymous session', () => {
    expect(userId({ session: { userId: 'u1' } } as any)).toBe('u1');
    expect(() => userId({ session: {} } as any)).toThrow('로그인이 필요합니다.');
  });
});
