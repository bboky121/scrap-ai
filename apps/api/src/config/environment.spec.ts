import { validateEnvironment } from './environment';

describe('environment validation', () => {
  it('allows development defaults and optional integrations', () => {
    expect(validateEnvironment({ NODE_ENV: 'development' })).toEqual({ NODE_ENV: 'development' });
  });

  it('requires operational settings in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      '필수 환경변수가 없습니다: DATABASE_URL, VALKEY_URL, SESSION_SECRET, INTERNAL_SERVICE_TOKEN, WEB_URL, API_PUBLIC_URL',
    );
  });

  it('rejects a partially configured integration', () => {
    expect(() => validateEnvironment({ GOOGLE_CLIENT_ID: 'client-id' })).toThrow(
      '환경변수는 함께 설정해야 합니다: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET',
    );
    expect(() => validateEnvironment({ FCM_PROJECT_ID: 'project' })).toThrow(
      '환경변수는 함께 설정해야 합니다: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY',
    );
  });

  it('rejects invalid URLs, ports and booleans', () => {
    expect(() => validateEnvironment({ WEB_URL: 'not-a-url' })).toThrow('WEB_URL은 올바른 URL이어야 합니다.');
    expect(() => validateEnvironment({ API_PORT: '70000' })).toThrow('API_PORT는 1부터 65535 사이의 정수여야 합니다.');
    expect(() => validateEnvironment({ DEMO_AUTH_ENABLED: 'yes' })).toThrow(
      'DEMO_AUTH_ENABLED는 true 또는 false여야 합니다.',
    );
  });

  it('rejects insecure production defaults', () => {
    const environment = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/database',
      VALKEY_URL: 'redis://localhost:6379',
      SESSION_SECRET: 'development-session-secret-change-me',
      INTERNAL_SERVICE_TOKEN: 'secret',
      WEB_URL: 'https://web.example.com',
      API_PUBLIC_URL: 'https://api.example.com',
    };
    expect(() => validateEnvironment(environment)).toThrow('운영 환경에서는 기본 SESSION_SECRET을 사용할 수 없습니다.');
  });
});
