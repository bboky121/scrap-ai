# Web

Next.js 15 기반 사용자 화면입니다. 브리핑·뉴스·상세·멤버십·계정 화면을 제공하고 NestJS API를 호출합니다.

```bash
docker compose up -d --build web
# 또는
pnpm --filter @kis/web dev
```

UI를 빠르게 수정할 때는 Docker 웹 컨테이너를 내리고 Hot Reload 서버를 실행합니다.

```bash
docker compose stop web
pnpm --filter @kis/web exec next dev --hostname 0.0.0.0 --port 3100
```

`apps/web/.env.local`에는 로컬 API 주소를 설정합니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:4100
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
