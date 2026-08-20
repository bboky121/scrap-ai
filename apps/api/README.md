# API

NestJS와 Prisma로 구현한 인증·콘텐츠·구독·푸시 API입니다. PostgreSQL을 사용하고 Valkey에 세션을 저장합니다.

```bash
docker compose up -d --build api
docker compose run --rm --entrypoint sh api -lc \
  'cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy'
```

주요 API: `/dashboard`, `/briefings`, `/articles`, `/auth/*`, `/plans`, `/payments/simulate`, `/subscriptions/me`, `/devices/push-token`.

종목명은 정시 수집 시 `Stock` 테이블에 저장되고 브리핑 응답에서 코드와 기업명으로 변환됩니다.

```bash
pnpm --filter @kis/api prisma:generate
pnpm --filter @kis/api lint
pnpm --filter @kis/api test
pnpm --filter @kis/api build
```
