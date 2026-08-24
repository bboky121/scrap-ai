import { Body, Controller, Delete, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { PushService } from './push.service';
import { NotifyBriefingDto } from './dto/notify-briefing.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { InternalServiceGuard } from './internal-service.guard';

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
  @UseGuards(InternalServiceGuard)
  notify(@Body() body: NotifyBriefingDto) {
    return this.push.notifyBriefing(body.briefingId, body.hour, body.articleCount);
  }
}
