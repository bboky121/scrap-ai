import { planEndsAt } from './billing.controller';
import { isContentLocked } from './content.controller';

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
