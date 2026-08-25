import { isContentLocked } from './content-access';

describe('isContentLocked', () => {
  const now = new Date('2026-08-14T00:00:00.000Z');

  it('locks free content at exactly 72 hours', () => {
    expect(isContentLocked(new Date('2026-08-11T00:00:00.001Z'), false, now)).toBe(false);
    expect(isContentLocked(new Date('2026-08-11T00:00:00.000Z'), false, now)).toBe(true);
    expect(isContentLocked(new Date('2020-01-01T00:00:00.000Z'), true, now)).toBe(false);
  });
});
