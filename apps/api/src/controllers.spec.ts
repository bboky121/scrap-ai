import { AuthController, GoogleConfiguredGuard } from './auth.controller';
import { BillingController } from './billing.controller';
import { ContentController } from './content.controller';
import { HealthController } from './health.controller';
import { PushController } from './push.controller';
import { userId } from './session';

const request = (user?: string): any => ({ session: { userId: user } });

describe('API controllers', () => {
  it('serves health and readiness', async () => {
    const prisma: any = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const health = new HealthController(prisma);
    expect(health.live()).toEqual({ status: 'ok' });
    expect(await health.ready()).toEqual({ status: 'ready' });
  });

  it('handles authentication lifecycle', async () => {
    const user = { id: 'u1', email: 'demo@kisbrief.local', name: '데모 투자자' };
    const prisma: any = {
      user: {
        upsert: jest.fn().mockResolvedValue(user),
        findUnique: jest.fn().mockResolvedValue({ ...user, provider: null }),
      },
    };
    const controller = new AuthController(prisma);
    const req: any = { session: { destroy: (cb: Function) => cb(), userId: undefined } };
    process.env.DEMO_AUTH_ENABLED = 'true';
    expect(await controller.demo(req)).toEqual({ user });
    expect(req.session.userId).toBe('u1');
    expect(await controller.me({ session: {} } as any)).toEqual({ user: null });
    expect(await controller.me({ session: { userId: 'u1' } } as any)).toEqual({ user: { ...user, provider: null } });
    expect(await controller.logout(req)).toEqual({ ok: true });
    delete process.env.DEMO_AUTH_ENABLED;
    expect(controller.providers()).toEqual({ google: false });
  });

  it('handles billing success, failure and subscription controls', async () => {
    const plan = { code: 'WEEK', price: 3900 };
    const prisma: any = {
      plan: { findMany: jest.fn().mockResolvedValue([plan]), findUniqueOrThrow: jest.fn().mockResolvedValue(plan) },
      paymentAttempt: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 's1' }),
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 's1' }),
        update: jest.fn().mockResolvedValue({ id: 's1', autoRenew: false }),
      },
    };
    const controller = new BillingController(prisma);
    const req = request('u1');
    expect(await controller.plans()).toEqual([plan]);
    expect(
      (await controller.pay(req, { planCode: 'WEEK', result: 'failure', cardLast4: '123456' })).subscription,
    ).toBeNull();
    expect(prisma.paymentAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'FAILED', failureReason: 'SIMULATED_DECLINE', cardLast4: '3456' }),
    });
    expect((await controller.pay(req, { planCode: 'WEEK', result: 'success', autoRenew: true })).subscription).toEqual({
      id: 's1',
    });
    expect((await controller.mine(req)).subscription).toEqual({ id: 's1' });
    expect((await controller.renew(req, { autoRenew: false })).autoRenew).toBe(false);
    expect((await controller.cancel(req)).autoRenew).toBe(false);
  });

  it('serves locked and unlocked content', async () => {
    const old = new Date('2020-01-01');
    const fresh = new Date();
    const article = {
      id: 'a1',
      publishedAt: old,
      bodyExcerpt: 'body',
      summary: { bullets: [] },
      raw: { secret: true },
    };
    const briefing = {
      id: 'b1',
      bucketAt: old,
      headline: 'old',
      marketImpact: 'impact',
      watchStocks: ['005930'],
      articles: [],
    };
    const prisma: any = {
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      article: { findMany: jest.fn().mockResolvedValue([article]), findUnique: jest.fn().mockResolvedValue(article) },
      hourlyBriefing: {
        findMany: jest.fn().mockResolvedValue([{ ...briefing, _count: { articles: 0 } }]),
        findUnique: jest.fn().mockResolvedValue(briefing),
      },
      stock: { findMany: jest.fn().mockResolvedValue([{ code: '005930', name: '삼성전자' }]) },
    };
    const controller = new ContentController(prisma);
    expect((await controller.articles(request())).items[0].locked).toBe(true);
    expect((await controller.article(request(), 'a1')).summary).toBeNull();
    expect((await controller.briefings(request())).items[0].locked).toBe(true);
    expect((await controller.briefing(request(), 'b1')).locked).toBe(true);
    prisma.hourlyBriefing.findMany.mockResolvedValue([
      { ...briefing, bucketAt: fresh, articles: [], _count: { articles: 0 } },
    ]);
    prisma.hourlyBriefing.findUnique.mockResolvedValue({ ...briefing, bucketAt: fresh });
    expect((await controller.dashboard(request())).latest.locked).toBe(false);
    expect(((await controller.briefing(request(), 'b1')) as any).watchStocks[0]).toEqual({
      code: '005930',
      name: '삼성전자',
    });
    prisma.subscription.findFirst.mockResolvedValue({ id: 's1' });
    prisma.article.findUnique.mockResolvedValue({ ...article, publishedAt: fresh });
    expect((await controller.article(request('u1'), 'a1')).locked).toBe(false);
  });

  it('redirects OAuth callbacks for web and mobile clients', async () => {
    const prisma: any = { user: { upsert: jest.fn().mockResolvedValue({ id: 'u1' }) } };
    const controller = new AuthController(prisma) as any;
    const response = { redirect: jest.fn() };
    process.env.WEB_URL = 'http://localhost:3100';
    process.env.MOBILE_DEEP_LINK_SCHEME = 'kisbrief';
    await controller.oauthCallback(
      { user: { email: 'a@b.com', name: 'A', provider: 'google', providerId: 'g1' }, session: { oauthClient: 'web' } },
      response,
    );
    expect(response.redirect).toHaveBeenLastCalledWith('http://localhost:3100/account');
    await controller.oauthCallback(
      {
        user: { email: 'a@b.com', name: 'A', provider: 'google', providerId: 'g1' },
        session: { oauthClient: 'mobile' },
      },
      response,
    );
    expect(response.redirect).toHaveBeenLastCalledWith('kisbrief://auth/callback');
  });

  it('requires valid push token and authenticated session helper', () => {
    expect(() => userId(request())).toThrow('로그인이 필요합니다.');
    expect(userId(request('u1'))).toBe('u1');
    expect(() => new GoogleConfiguredGuard().canActivate()).toThrow();
    const push: any = { register: jest.fn(), unregister: jest.fn(), notifyBriefing: jest.fn() };
    const controller = new PushController(push);
    expect(controller.register(request('u1'), { token: ' t ' })).toBe(push.register.mock.results[0]?.value);
    expect(controller.unregister(request(), { token: 't' })).toBe(push.unregister.mock.results[0]?.value);
  });
});
