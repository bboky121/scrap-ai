import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../common/prisma.service';
import { OAuthIdentity } from './oauth.strategies';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async demo(req: Request) {
    const user = await this.prisma.user.upsert({
      where: { email: 'demo@kisbrief.local' },
      update: {},
      create: { email: 'demo@kisbrief.local', name: '데모 투자자' },
    });
    req.session.userId = user.id;
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async me(req: Request) {
    if (!req.session.userId) return { user: null };
    return {
      user: await this.prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, email: true, name: true, provider: true },
      }),
    };
  }

  async oauthCallback(req: Request, res: Response) {
    const identity = req.user as OAuthIdentity;
    const user = await this.prisma.user.upsert({
      where: { email: identity.email },
      update: { name: identity.name, provider: identity.provider, providerId: identity.providerId },
      create: {
        email: identity.email,
        name: identity.name,
        provider: identity.provider,
        providerId: identity.providerId,
      },
    });
    req.session.userId = user.id;
    const destination =
      req.session.oauthClient === 'mobile'
        ? (process.env.MOBILE_DEEP_LINK_SCHEME ?? 'kisbrief') + '://auth/callback'
        : `${process.env.WEB_URL ?? 'http://localhost:3000'}/account`;
    delete req.session.oauthClient;
    res.redirect(destination);
  }
}
