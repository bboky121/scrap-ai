import { oauthRedirectDestination } from './oauth-redirect';

describe('oauthRedirectDestination', () => {
  it('uses configured web and mobile destinations', () => {
    const webUrl = process.env.WEB_URL;
    const mobileScheme = process.env.MOBILE_DEEP_LINK_SCHEME;
    process.env.WEB_URL = 'https://web.example.com';
    process.env.MOBILE_DEEP_LINK_SCHEME = 'example';

    expect(oauthRedirectDestination('web')).toBe('https://web.example.com/account');
    expect(oauthRedirectDestination('mobile')).toBe('example://auth/callback');

    if (webUrl === undefined) delete process.env.WEB_URL;
    else process.env.WEB_URL = webUrl;
    if (mobileScheme === undefined) delete process.env.MOBILE_DEEP_LINK_SCHEME;
    else process.env.MOBILE_DEEP_LINK_SCHEME = mobileScheme;
  });
});
