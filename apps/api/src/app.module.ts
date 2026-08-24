import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ContentModule } from './content/content.module';
import { DatabaseModule } from './common/database.module';
import { DiscordModule } from './common/discord.module';
import { HealthModule } from './health/health.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DiscordModule,
    AuthModule,
    ContentModule,
    BillingModule,
    HealthModule,
    PushModule,
  ],
})
export class AppModule {}
