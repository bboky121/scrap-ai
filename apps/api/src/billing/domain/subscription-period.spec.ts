import { planEndsAt } from './subscription-period';

describe('planEndsAt', () => {
  it('adds each plan duration', () => {
    const start = new Date('2024-02-29T00:00:00.000Z');
    expect(planEndsAt('WEEK', start).toISOString()).toBe('2024-03-07T00:00:00.000Z');
    expect(planEndsAt('MONTH', start).toISOString()).toBe('2024-03-29T00:00:00.000Z');
    expect(planEndsAt('YEAR', start).toISOString()).toBe('2025-03-01T00:00:00.000Z');
  });
});
