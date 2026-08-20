import { Body, Controller, Delete, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PushService } from './push.service';

@Controller('devices')
export class PushController {
  constructor(private readonly push: PushService) {}
  @Post('push-token')
  register(@Req() req: Request, @Body() body: { token?: string; platform?: string; appVersion?: string }) {
    const token = body.token?.trim();
    if (!token) throw new UnauthorizedException('푸시 토큰이 필요합니다.');
    return this.push.register(req.session.userId, token, body.platform ?? 'unknown', body.appVersion);
  }
  @Delete('push-token')
  unregister(@Req() req: Request, @Body() body: { token?: string }) {
    if (!body.token) throw new UnauthorizedException('푸시 토큰이 필요합니다.');
    return this.push.unregister(req.session.userId, body.token);
  }
  @Post('internal/briefing')
  notify(
    @Headers('x-internal-service-token') token: string,
    @Body() body: { briefingId?: string; hour?: string; articleCount?: number },
  ) {
    if (token !== (process.env.INTERNAL_SERVICE_TOKEN ?? 'change-me')) throw new UnauthorizedException();
    if (!body.briefingId || !body.hour || !body.articleCount)
      throw new UnauthorizedException('브리핑 정보가 필요합니다.');
    return this.push.notifyBriefing(body.briefingId, body.hour, body.articleCount);
  }
}
