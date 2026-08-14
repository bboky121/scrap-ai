import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  async error(title: string, detail: string, context: Record<string, unknown> = {}): Promise<void> {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return;
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: '시그널브리프 알림',
          embeds: [{
            title: `🚨 ${title}`,
            description: detail.slice(0, 3500),
            color: 15_143_616,
            fields: Object.entries(context).slice(0, 10).map(([name, value]) => ({ name, value: String(value).slice(0, 1000), inline: true })),
            timestamp: new Date().toISOString(),
          }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) this.logger.warn(`Discord webhook returned ${response.status}`);
    } catch (error) {
      this.logger.warn(`Discord notification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
