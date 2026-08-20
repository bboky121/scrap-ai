import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { AuthController, GoogleConfiguredGuard } from './auth.controller';
import { ContentController } from './content.controller';
import { BillingController } from './billing.controller';
import { HealthController } from './health.controller';
import { GoogleStrategy, KakaoStrategy } from './oauth.strategies';
import { DiscordService } from './discord.service';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PassportModule.register({ session: false })],
  controllers: [AuthController, ContentController, BillingController, HealthController, PushController],
  providers: [PrismaService, GoogleStrategy, KakaoStrategy, GoogleConfiguredGuard, DiscordService, PushService],
})
export class AppModule {}
