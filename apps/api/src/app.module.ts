import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { ContentController } from './content.controller';
import { BillingController } from './billing.controller';
import { HealthController } from './health.controller';
import { GoogleStrategy, KakaoStrategy } from './oauth.strategies';
import { DiscordService } from './discord.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PassportModule.register({ session: false })],
  controllers: [AuthController, ContentController, BillingController, HealthController],
  providers: [PrismaService, GoogleStrategy, KakaoStrategy, DiscordService],
})
export class AppModule {}
