import { Body, Controller, Delete, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PushService } from './push.service';
import { NotifyBriefingDto } from './dto/notify-briefing.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';

@Controller('devices')
export class PushController {
  constructor(private readonly push: PushService) {}
  @Post('push-token')
  register(@Req() req: Request, @Body() body: RegisterPushTokenDto) {
    if (!body?.token?.trim()) throw new UnauthorizedException('푸시 토큰이 필요합니다.');
    return this.push.register(req.session.userId, body.token.trim(), body.platform ?? 'unknown', body.appVersion);
  }
  @Delete('push-token')
  unregister(@Req() req: Request, @Body() body: UnregisterPushTokenDto) {
    if (!body?.token) throw new UnauthorizedException('푸시 토큰이 필요합니다.');
    return this.push.unregister(req.session.userId, body.token);
  }
  @Post('internal/briefing')
  notify(@Headers('x-internal-service-token') token: string, @Body() body: NotifyBriefingDto) {
    if (token !== (process.env.INTERNAL_SERVICE_TOKEN ?? 'change-me')) throw new UnauthorizedException();
    return this.push.notifyBriefing(body.briefingId, body.hour, body.articleCount);
  }
}
