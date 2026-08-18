import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}
export function userId(req: Request): string {
  if (!req.session.userId) throw new UnauthorizedException('로그인이 필요합니다.');
  return req.session.userId;
}
