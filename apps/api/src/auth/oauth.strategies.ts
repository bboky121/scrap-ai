import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as GoogleOAuth, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as KakaoOAuth } from 'passport-kakao';

export type OAuthIdentity = { provider: 'google' | 'kakao'; providerId: string; email: string; name: string };

@Injectable()
export class GoogleStrategy extends PassportStrategy(GoogleOAuth, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
      callbackURL: `${process.env.API_PUBLIC_URL ?? 'http://localhost:4000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }
  validate(_a: string, _r: string, profile: GoogleProfile): OAuthIdentity {
    return {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? `${profile.id}@google.local`,
      name: profile.displayName,
    };
  }
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(KakaoOAuth, 'kakao') {
  constructor() {
    super({
      clientID: process.env.KAKAO_CLIENT_ID || 'not-configured',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      callbackURL: `${process.env.API_PUBLIC_URL ?? 'http://localhost:4000'}/auth/kakao/callback`,
    });
  }
  validate(_a: string, _r: string, profile: any): OAuthIdentity {
    const email = profile._json?.kakao_account?.email ?? `${profile.id}@kakao.local`;
    return {
      provider: 'kakao',
      providerId: profile.id,
      email,
      name: profile.displayName || profile.username || '카카오 사용자',
    };
  }
}
