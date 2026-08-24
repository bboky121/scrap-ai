import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentService {
  isLocked(publishedAt: Date, paid: boolean, now = new Date()) {
    return !paid && now.getTime() - publishedAt.getTime() >= 72 * 3600_000;
  }
}

export function isContentLocked(publishedAt: Date, paid: boolean, now = new Date()) {
  return new ContentService().isLocked(publishedAt, paid, now);
}
