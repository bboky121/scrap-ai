import {
  CanActivate,
  Controller,
  ExecutionContext,
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
import { AuthService } from './auth.service';
import { oauthRedirectDestination } from './domain/oauth-redirect';
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

/** Keeps the OAuth client in the session so web and mobile can use different callback destinations. */
export class GoogleStartGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    request.session.oauthClient = request.query.client === 'mobile' ? 'mobile' : 'web';
    return super.canActivate(context);
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('demo')
  async demo(@Req() req: Request) {
    if (process.env.DEMO_AUTH_ENABLED === 'false')
      throw new ServiceUnavailableException('데모 로그인이 비활성화되었습니다.');
    const result = await this.auth.demo();
    req.session.userId = result.user.id;
    return result;
  }

  @Post('logout')
  logout(@Req() req: Request) {
    return new Promise((resolve) => req.session.destroy(() => resolve({ ok: true })));
  }

  @Get('me')
  async me(@Req() req: Request) {
    if (!req.session.userId) return { user: null };
    return this.auth.me(req.session.userId);
  }

  @Get('providers')
  providers() {
    return { google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) };
  }

  @Get('google') @UseGuards(GoogleConfiguredGuard, GoogleStartGuard) google() {}
  @Get('kakao') @UseGuards(AuthGuard('kakao')) kakao() {}
  @Get('google/callback') @UseGuards(AuthGuard('google')) googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthCallback(req, res);
  }
  @Get('kakao/callback') @UseGuards(AuthGuard('kakao')) kakaoCallback(@Req() req: Request, @Res() res: Response) {
    return this.oauthCallback(req, res);
  }

  async oauthCallback(req: Request, res: Response) {
    const user = await this.auth.authenticateOAuth(req.user as OAuthIdentity);
    req.session.userId = user.id;
    const destination = oauthRedirectDestination(req.session.oauthClient);
    delete req.session.oauthClient;
    res.redirect(destination);
  }
}
