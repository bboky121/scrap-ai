import {
  CanActivate,
  Controller,
  Get,
  Injectable,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { OAuthIdentity } from './oauth.strategies';

@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  canActivate() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new ServiceUnavailableException('Google 로그인이 설정되지 않았습니다.');
    }
    return true;
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('demo')
  async demo(@Req() req: Request) {
    if (process.env.DEMO_AUTH_ENABLED === 'false')
      throw new ServiceUnavailableException('데모 로그인이 비활성화되었습니다.');
    const user = await this.prisma.user.upsert({
      where: { email: 'demo@kisbrief.local' },
      update: {},
      create: { email: 'demo@kisbrief.local', name: '데모 투자자' },
    });
    req.session.userId = user.id;
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return new Promise((resolve) => req.session.destroy(() => resolve({ ok: true })));
  }

  @Get('me')
  async me(@Req() req: Request) {
    if (!req.session.userId) return { user: null };
    return {
      user: await this.prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, email: true, name: true, provider: true },
      }),
    };
  }

  @Get('providers')
  providers() {
    return { google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) };
  }

  @Get('google') @UseGuards(GoogleConfiguredGuard, AuthGuard('google')) google() {}
  @Get('kakao') @UseGuards(AuthGuard('kakao')) kakao() {}
  @Get('google/callback') @UseGuards(AuthGuard('google')) googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthCallback(req, res);
  }
  @Get('kakao/callback') @UseGuards(AuthGuard('kakao')) kakaoCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthCallback(req, res);
  }
  private async oauthCallback(req: Request, res: Response) {
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
    res.redirect(`${process.env.WEB_URL ?? 'http://localhost:3000'}/account`);
  }
}
