import { BillingService } from './billing.service';

function createPrisma() {
  return {
    plan: { findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    paymentAttempt: { create: jest.fn() },
    subscription: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('BillingService', () => {
  it('lists plans by ascending price', async () => {
    const prisma = createPrisma();
    prisma.plan.findMany.mockResolvedValue([]);
    const service = new BillingService(prisma as any);

    await service.plans();

    expect(prisma.plan.findMany).toHaveBeenCalledWith({ orderBy: { price: 'asc' } });
  });

  it('records a failed payment without changing subscriptions', async () => {
    const prisma = createPrisma();
    prisma.plan.findUniqueOrThrow.mockResolvedValue({ code: 'WEEK', price: 3900 });
    prisma.paymentAttempt.create.mockResolvedValue({ id: 'p1', status: 'FAILED' });
    const service = new BillingService(prisma as any);

    await expect(service.pay('u1', { planCode: 'WEEK', result: 'failure', cardLast4: '123456' })).resolves.toEqual({
      payment: { id: 'p1', status: 'FAILED' },
      subscription: null,
    });
    expect(prisma.paymentAttempt.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        planCode: 'WEEK',
        amount: 3900,
        status: 'FAILED',
        cardLast4: '3456',
        failureReason: 'SIMULATED_DECLINE',
      },
    });
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it('expires an existing subscription and activates the purchased plan', async () => {
    const prisma = createPrisma();
    prisma.plan.findUniqueOrThrow.mockResolvedValue({ code: 'WEEK', price: 3900 });
    prisma.paymentAttempt.create.mockResolvedValue({ id: 'p1', status: 'SUCCEEDED' });
    prisma.subscription.create.mockImplementation(({ data }) => Promise.resolve({ id: 's1', ...data }));
    const service = new BillingService(prisma as any);

    const result = await service.pay('u1', {
      planCode: 'WEEK',
      result: 'success',
      autoRenew: true,
    });

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'ACTIVE' },
      data: { status: 'EXPIRED', autoRenew: false },
    });
    const data = prisma.subscription.create.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.objectContaining({
        userId: 'u1',
        planCode: 'WEEK',
        status: 'ACTIVE',
        autoRenew: true,
        events: { create: { type: 'ACTIVATED', detail: { paymentId: 'p1' } } },
      }),
    );
    expect(data.endsAt.getTime() - data.startsAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(result.subscription).toEqual(expect.objectContaining({ id: 's1' }));
  });

  it('finds the latest active subscription with its plan', async () => {
    const prisma = createPrisma();
    prisma.subscription.findFirst.mockResolvedValue({ id: 's1' });
    const service = new BillingService(prisma as any);

    await expect(service.mine('u1')).resolves.toEqual({ subscription: { id: 's1' } });
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'ACTIVE', endsAt: { gt: expect.any(Date) } },
      include: { plan: true },
      orderBy: { endsAt: 'desc' },
    });
  });

  it('updates auto-renew and records an event', async () => {
    const prisma = createPrisma();
    prisma.subscription.findFirstOrThrow.mockResolvedValue({ id: 's1' });
    prisma.subscription.update.mockResolvedValue({ id: 's1', autoRenew: false });
    const service = new BillingService(prisma as any);

    await service.renew('u1', { autoRenew: false });

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        autoRenew: false,
        events: { create: { type: 'AUTO_RENEW_CHANGED', detail: { autoRenew: false } } },
      },
    });
  });

  it('cancels at period end and records the cancellation time', async () => {
    const prisma = createPrisma();
    prisma.subscription.findFirstOrThrow.mockResolvedValue({ id: 's1' });
    prisma.subscription.update.mockResolvedValue({ id: 's1', autoRenew: false });
    const service = new BillingService(prisma as any);

    await service.cancel('u1');

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        autoRenew: false,
        canceledAt: expect.any(Date),
        events: { create: { type: 'CANCELED_AT_PERIOD_END', detail: {} } },
      },
    });
  });
});
