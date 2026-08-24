import { PushService } from './push.service';

function createDependencies() {
  const prisma = {
    pushDevice: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    briefingNotification: {
      upsert: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const discord = { error: jest.fn().mockResolvedValue(undefined) };
  const fcm = {
    isConfigured: jest.fn().mockReturnValue(true),
    initialize: jest.fn().mockResolvedValue(undefined),
    sendBriefing: jest.fn().mockResolvedValue(undefined),
  };
  return { prisma, discord, fcm };
}

describe('PushService', () => {
  it('registers a device and re-enables an existing token', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.pushDevice.upsert.mockResolvedValue({ id: 'd1', platform: 'ios', enabled: true });
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await service.register('u1', 'token', 'ios', '1.0.0');

    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where: { token: 'token' },
      create: {
        userId: 'u1',
        token: 'token',
        platform: 'ios',
        appVersion: '1.0.0',
        enabled: true,
        lastSeenAt: expect.any(Date),
      },
      update: {
        userId: 'u1',
        platform: 'ios',
        appVersion: '1.0.0',
        enabled: true,
        lastSeenAt: expect.any(Date),
      },
      select: { id: true, platform: true, enabled: true },
    });
  });

  it('scopes unregistering to the user when authenticated', async () => {
    const { prisma, discord, fcm } = createDependencies();
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await expect(service.unregister('u1', 'token')).resolves.toEqual({ ok: true });

    expect(prisma.pushDevice.updateMany).toHaveBeenCalledWith({
      where: { token: 'token', userId: 'u1' },
      data: { enabled: false },
    });
  });

  it('skips a briefing that was already sent', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.briefingNotification.upsert.mockResolvedValue({ status: 'SENT' });
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await expect(service.notifyBriefing('b1', '09', 3)).resolves.toEqual({ skipped: true });
    expect(prisma.pushDevice.findMany).not.toHaveBeenCalled();
    expect(fcm.sendBriefing).not.toHaveBeenCalled();
  });

  it('marks a notification skipped when FCM is not configured', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.briefingNotification.upsert.mockResolvedValue({ status: 'PENDING' });
    prisma.pushDevice.findMany.mockResolvedValue([{ id: 'd1', token: 'token' }]);
    fcm.isConfigured.mockReturnValue(false);
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await expect(service.notifyBriefing('b1', '09', 3)).resolves.toEqual({
      skipped: true,
      reason: 'FCM_NOT_CONFIGURED',
    });
    expect(prisma.briefingNotification.update).toHaveBeenCalledWith({
      where: { briefingId: 'b1' },
      data: { status: 'SKIPPED' },
    });
  });

  it('sends the briefing and marks the notification sent', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.briefingNotification.upsert.mockResolvedValue({ status: 'PENDING' });
    prisma.pushDevice.findMany.mockResolvedValue([{ id: 'd1', token: 'token' }]);
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await expect(service.notifyBriefing('b1', '09', 3)).resolves.toEqual({ sent: 1 });
    expect(fcm.sendBriefing).toHaveBeenCalledWith({
      token: 'token',
      title: '시그널브리프',
      body: '09시 브리핑 3건입니다.',
      briefingId: 'b1',
    });
    expect(prisma.briefingNotification.update).toHaveBeenCalledWith({
      where: { briefingId: 'b1' },
      data: { status: 'SENT', sentAt: expect.any(Date) },
    });
  });

  it('disables a device and reports its send failure', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.briefingNotification.upsert.mockResolvedValue({ status: 'PENDING' });
    prisma.pushDevice.findMany.mockResolvedValue([{ id: 'd1', token: 'bad-token' }]);
    fcm.sendBriefing.mockRejectedValue(new Error('invalid token'));
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await service.notifyBriefing('b1', '09', 3);

    expect(prisma.pushDevice.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { enabled: false },
    });
    expect(discord.error).toHaveBeenCalledWith('FCM 발송 실패', 'Error: invalid token', {
      briefingId: 'b1',
      deviceId: 'd1',
    });
  });

  it('reports and rethrows an FCM initialization failure', async () => {
    const { prisma, discord, fcm } = createDependencies();
    prisma.briefingNotification.upsert.mockResolvedValue({ status: 'PENDING' });
    prisma.pushDevice.findMany.mockResolvedValue([{ id: 'd1', token: 'token' }]);
    const error = new Error('invalid credentials');
    fcm.initialize.mockRejectedValue(error);
    const service = new PushService(prisma as any, discord as any, fcm as any);

    await expect(service.notifyBriefing('b1', '09', 3)).rejects.toBe(error);
    expect(discord.error).toHaveBeenCalledWith('FCM 초기화 실패', 'Error: invalid credentials', { briefingId: 'b1' });
    expect(fcm.sendBriefing).not.toHaveBeenCalled();
  });
});
