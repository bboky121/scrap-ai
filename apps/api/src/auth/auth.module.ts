import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController, GoogleConfiguredGuard } from './auth.controller';
import { GoogleStrategy, KakaoStrategy } from './oauth.strategies';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [AuthController],
  providers: [GoogleStrategy, KakaoStrategy, GoogleConfiguredGuard, AuthService],
})
export class AuthModule {}
