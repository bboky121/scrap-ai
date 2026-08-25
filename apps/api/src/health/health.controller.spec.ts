import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('serves liveness and checks database readiness', async () => {
    const prisma: any = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma);

    expect(controller.live()).toEqual({ status: 'ok' });
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });
});
