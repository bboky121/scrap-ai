import { ServiceUnavailableException } from '@nestjs/common';
import { AuthController, GoogleConfiguredGuard } from './auth.controller';

describe('AuthController', () => {
  const originalDemoAuth = process.env.DEMO_AUTH_ENABLED;
  const originalWebUrl = process.env.WEB_URL;
  const originalMobileScheme = process.env.MOBILE_DEEP_LINK_SCHEME;

  afterEach(() => {
    if (originalDemoAuth === undefined) delete process.env.DEMO_AUTH_ENABLED;
    else process.env.DEMO_AUTH_ENABLED = originalDemoAuth;
    if (originalWebUrl === undefined) delete process.env.WEB_URL;
    else process.env.WEB_URL = originalWebUrl;
    if (originalMobileScheme === undefined) delete process.env.MOBILE_DEEP_LINK_SCHEME;
    else process.env.MOBILE_DEEP_LINK_SCHEME = originalMobileScheme;
  });

  it('sets the demo user in the session', async () => {
    const auth: any = { demo: jest.fn().mockResolvedValue({ user: { id: 'u1' } }) };
    const controller = new AuthController(auth);
    const request: any = { session: {} };

    await expect(controller.demo(request)).resolves.toEqual({ user: { id: 'u1' } });
    expect(request.session.userId).toBe('u1');
  });

  it('rejects demo login when disabled', async () => {
    process.env.DEMO_AUTH_ENABLED = 'false';
    const controller = new AuthController({} as any);

    await expect(controller.demo({ session: {} } as any)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns an anonymous account without querying the service', async () => {
    const auth: any = { me: jest.fn() };
    const controller = new AuthController(auth);

    await expect(controller.me({ session: {} } as any)).resolves.toEqual({ user: null });
    expect(auth.me).not.toHaveBeenCalled();
  });

  it('stores the OAuth user and redirects each client', async () => {
    process.env.WEB_URL = 'https://web.example.com';
    process.env.MOBILE_DEEP_LINK_SCHEME = 'example';
    const auth: any = { authenticateOAuth: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const controller = new AuthController(auth);
    const response: any = { redirect: jest.fn() };
    const request: any = {
      user: { email: 'user@example.com', name: 'User', provider: 'google', providerId: 'g1' },
      session: { oauthClient: 'mobile' },
    };

    await controller.oauthCallback(request, response);

    expect(request.session).toEqual({ userId: 'u1' });
    expect(response.redirect).toHaveBeenCalledWith('example://auth/callback');
  });
});

describe('GoogleConfiguredGuard', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  afterEach(() => {
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  });

  it('requires both Google credentials', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => new GoogleConfiguredGuard().canActivate()).toThrow('Google 로그인이 설정되지 않았습니다.');

    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    expect(new GoogleConfiguredGuard().canActivate()).toBe(true);
  });
});
