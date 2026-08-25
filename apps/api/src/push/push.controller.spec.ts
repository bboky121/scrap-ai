import { UnauthorizedException } from '@nestjs/common';
import { PushController } from './push.controller';

describe('PushController', () => {
  it('normalizes and delegates device registration', () => {
    const push: any = { register: jest.fn() };
    const controller = new PushController(push);

    controller.register({ session: { userId: 'u1' } } as any, {
      token: ' token ',
      platform: 'ios',
      appVersion: '1.0.0',
    });

    expect(push.register).toHaveBeenCalledWith('u1', 'token', 'ios', '1.0.0');
  });

  it('rejects an empty push token', () => {
    const controller = new PushController({} as any);
    expect(() => controller.register({ session: {} } as any, { token: ' ' })).toThrow(UnauthorizedException);
  });

  it('delegates internal briefing notifications', () => {
    const push: any = { notifyBriefing: jest.fn() };
    const controller = new PushController(push);

    controller.notify({ briefingId: 'b1', hour: '09', articleCount: 3 });

    expect(push.notifyBriefing).toHaveBeenCalledWith('b1', '09', 3);
  });
});
