import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OAuthIdentity } from './oauth.strategies';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async demo() {
    const user = await this.prisma.user.upsert({
      where: { email: 'demo@kisbrief.local' },
      update: {},
      create: { email: 'demo@kisbrief.local', name: '데모 투자자' },
    });
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async me(userId: string) {
    return {
      user: await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, provider: true },
      }),
    };
  }

  authenticateOAuth(identity: OAuthIdentity) {
    return this.prisma.user.upsert({
      where: { email: identity.email },
      update: { name: identity.name, provider: identity.provider, providerId: identity.providerId },
      create: {
        email: identity.email,
        name: identity.name,
        provider: identity.provider,
        providerId: identity.providerId,
      },
    });
  }
}
