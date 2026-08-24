const FREE_CONTENT_WINDOW_MS = 72 * 60 * 60 * 1000;

export function isContentLocked(publishedAt: Date, paid: boolean, now = new Date()) {
  return !paid && now.getTime() - publishedAt.getTime() >= FREE_CONTENT_WINDOW_MS;
}
