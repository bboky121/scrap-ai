import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DiscordService } from '../common/discord.service';
import { briefingNotification } from './domain/briefing-notification';
import { FcmService } from './fcm.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly discord: DiscordService,
    private readonly fcm: FcmService,
  ) {}

  async register(userId: string | undefined, token: string, platform: string, appVersion?: string) {
    return this.prisma.pushDevice.upsert({
      where: { token },
      create: { userId, token, platform, appVersion, enabled: true, lastSeenAt: new Date() },
      update: { userId, platform, appVersion, enabled: true, lastSeenAt: new Date() },
      select: { id: true, platform: true, enabled: true },
    });
  }

  async unregister(userId: string | undefined, token: string) {
    await this.prisma.pushDevice.updateMany({
      where: { token, ...(userId ? { userId } : {}) },
      data: { enabled: false },
    });
    return { ok: true };
  }

  async notifyBriefing(briefingId: string, hour: string, articleCount: number) {
    const existing = await this.prisma.briefingNotification.upsert({
      where: { briefingId },
      create: { briefingId, articleCount, status: 'PENDING' },
      update: {},
    });
    if (existing.status === 'SENT') return { skipped: true };
    const devices = await this.prisma.pushDevice.findMany({
      where: { enabled: true },
      select: { id: true, token: true },
    });
    const message = briefingNotification(hour, articleCount);
    if (!this.fcm.isConfigured()) {
      this.logger.log(`FCM is not configured; skipped ${devices.length} devices for ${briefingId}`);
      await this.prisma.briefingNotification.update({ where: { briefingId }, data: { status: 'SKIPPED' } });
      return { skipped: true, reason: 'FCM_NOT_CONFIGURED' };
    }
    try {
      await this.fcm.initialize();
      for (const device of devices) {
        try {
          await this.fcm.sendBriefing({
            token: device.token,
            ...message,
            briefingId,
          });
        } catch (error) {
          await this.prisma.pushDevice
            .update({ where: { id: device.id }, data: { enabled: false } })
            .catch(() => undefined);
          await this.discord.error('FCM 발송 실패', String(error), { briefingId, deviceId: device.id });
        }
      }
      await this.prisma.briefingNotification.update({
        where: { briefingId },
        data: { status: 'SENT', sentAt: new Date() },
      });
      return { sent: devices.length };
    } catch (error) {
      await this.discord.error('FCM 초기화 실패', String(error), { briefingId });
      throw error;
    }
  }
}
