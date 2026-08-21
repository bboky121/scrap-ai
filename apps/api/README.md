# API

NestJS와 Prisma로 구현한 인증·콘텐츠·구독·푸시 API입니다. PostgreSQL을 사용하고 Valkey에 세션을 저장합니다.

```bash
docker compose up -d --build api
docker compose run --rm --entrypoint sh api -lc \
  'cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy'
```

API를 수정할 때는 PostgreSQL·Valkey만 Docker로 유지하고 API를 로컬 watch 모드로 실행할 수 있습니다.

```bash
docker compose stop api
pnpm --filter @kis/api exec nest start --watch --port 4100
```

로컬 API는 `localhost:5433` PostgreSQL과 `localhost:6379` Valkey를 사용하도록 환경변수를 설정합니다.

주요 API: `/dashboard`, `/briefings`, `/articles`, `/auth/*`, `/plans`, `/payments/simulate`, `/subscriptions/me`, `/devices/push-token`.

종목명은 정시 수집 시 `Stock` 테이블에 저장되고 브리핑 응답에서 코드와 기업명으로 변환됩니다.

```bash
pnpm --filter @kis/api prisma:generate
pnpm --filter @kis/api lint
pnpm --filter @kis/api test
pnpm --filter @kis/api build
```
