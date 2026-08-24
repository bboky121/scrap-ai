import { AuthService } from './auth.service';

function createPrisma() {
  return {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}

describe('AuthService', () => {
  it('creates or reuses the demo user and returns public fields', async () => {
    const prisma = createPrisma();
    prisma.user.upsert.mockResolvedValue({
      id: 'u1',
      email: 'demo@kisbrief.local',
      name: '데모 투자자',
      providerId: 'private',
    });
    const service = new AuthService(prisma as any);

    await expect(service.demo()).resolves.toEqual({
      user: { id: 'u1', email: 'demo@kisbrief.local', name: '데모 투자자' },
    });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'demo@kisbrief.local' },
      update: {},
      create: { email: 'demo@kisbrief.local', name: '데모 투자자' },
    });
  });

  it('loads only account fields for the current user', async () => {
    const prisma = createPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const service = new AuthService(prisma as any);

    await expect(service.me('u1')).resolves.toEqual({ user: { id: 'u1' } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { id: true, email: true, name: true, provider: true },
    });
  });

  it('upserts an OAuth identity', async () => {
    const prisma = createPrisma();
    prisma.user.upsert.mockResolvedValue({ id: 'u1' });
    const service = new AuthService(prisma as any);
    const identity = {
      email: 'user@example.com',
      name: '사용자',
      provider: 'google' as const,
      providerId: 'google-1',
    };

    await expect(service.authenticateOAuth(identity)).resolves.toEqual({ id: 'u1' });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: identity.email },
      update: { name: identity.name, provider: identity.provider, providerId: identity.providerId },
      create: identity,
    });
  });
});
