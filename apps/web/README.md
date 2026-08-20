# Web

Next.js 15 기반 사용자 화면입니다. 브리핑·뉴스·상세·멤버십·계정 화면을 제공하고 NestJS API를 호출합니다.

```bash
docker compose up -d --build web
# 또는
pnpm --filter @kis/web dev
```

환경변수:

```env
NEXT_PUBLIC_API_URL=http://localhost:4100
```

주요 경로: `/`, `/news`, `/briefing/[id]`, `/pricing`, `/account`.

```bash
pnpm --filter @kis/web lint
pnpm --filter @kis/web build
```
