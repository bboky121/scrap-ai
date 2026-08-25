type Environment = Record<string, unknown>;

function text(environment: Environment, name: string) {
  const value = environment[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireVariables(environment: Environment, names: string[]) {
  const missing = names.filter((name) => !text(environment, name));
  if (missing.length) throw new Error(`필수 환경변수가 없습니다: ${missing.join(', ')}`);
}

function validateGroup(environment: Environment, names: string[]) {
  const configured = names.filter((name) => text(environment, name));
  if (configured.length && configured.length !== names.length) {
    const missing = names.filter((name) => !text(environment, name));
    throw new Error(`환경변수는 함께 설정해야 합니다: ${names.join(', ')} (누락: ${missing.join(', ')})`);
  }
}

function validateUrl(environment: Environment, name: string) {
  const value = text(environment, name);
  if (!value) return;
  try {
    new URL(value);
  } catch {
    throw new Error(`${name}은 올바른 URL이어야 합니다.`);
  }
}

export function validateEnvironment(environment: Environment) {
  const production = environment.NODE_ENV === 'production';
  if (production) {
    requireVariables(environment, [
      'DATABASE_URL',
      'VALKEY_URL',
      'SESSION_SECRET',
      'INTERNAL_SERVICE_TOKEN',
      'WEB_URL',
      'API_PUBLIC_URL',
    ]);
    if (environment.SESSION_SECRET === 'development-session-secret-change-me') {
      throw new Error('운영 환경에서는 기본 SESSION_SECRET을 사용할 수 없습니다.');
    }
    if (environment.INTERNAL_SERVICE_TOKEN === 'change-me') {
      throw new Error('운영 환경에서는 기본 INTERNAL_SERVICE_TOKEN을 사용할 수 없습니다.');
    }
  }

  validateGroup(environment, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']);
  validateGroup(environment, ['FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY']);
  for (const name of ['DATABASE_URL', 'VALKEY_URL', 'WEB_URL', 'API_PUBLIC_URL', 'DISCORD_WEBHOOK_URL']) {
    validateUrl(environment, name);
  }

  const port = text(environment, 'API_PORT');
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535)) {
    throw new Error('API_PORT는 1부터 65535 사이의 정수여야 합니다.');
  }

  const demoAuth = text(environment, 'DEMO_AUTH_ENABLED');
  if (demoAuth && !['true', 'false'].includes(demoAuth)) {
    throw new Error('DEMO_AUTH_ENABLED는 true 또는 false여야 합니다.');
  }
  return environment;
}
