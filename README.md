# 시그널브리프

한국투자증권 Open API의 국내 `종합 시황/공시(제목)`을 매시간 수집하고, 비용 없는 결정론적 요약기로 브리핑을 만드는 포트폴리오 프로젝트입니다. 최근 72시간은 무료이며 이전 데이터는 가상 구독을 통해 열립니다. 실제 결제는 발생하지 않습니다.

## 구성

- `apps/web`: Next.js 15 사용자 화면
- `apps/api`: NestJS 인증·콘텐츠 권한·구독 API와 Prisma schema
- `apps/pipeline`: Python FastAPI + Celery KIS 수집·가공 파이프라인
- PostgreSQL: 영속 데이터, Valkey: 세션·Celery·KIS 토큰·잠금

## 실행

### Android 개발 환경 초기화

Android Studio로 SDK를 설치한 뒤 프로젝트 루트에서 아래 스크립트를 한 번 실행합니다. 설치 위치를 자동으로 찾아 `apps/mobile/android/local.properties`를 생성합니다. 이 파일은 PC별 경로이므로 Git에 커밋하지 않습니다.

```bash
./scripts/setup-android-sdk.sh
# 또는
pnpm mobile:android:setup
```

스크립트가 안내하는 `ANDROID_HOME`과 `ANDROID_SDK_ROOT`를 셸 설정 파일(`~/.zshrc` 또는 `~/.bashrc`)에도 추가하면 새 터미널에서도 자동으로 인식됩니다.

```bash
cp .env.example .env
docker compose up -d postgres valkey
docker compose run --rm --entrypoint sh api -lc 'cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy'
docker compose run --rm --entrypoint sh api -lc 'cd /app/apps/api && node ../../node_modules/.bin/tsx prisma/seed.ts'
docker compose up --build
```

KIS 키가 비어 있으면 공식 응답 모양의 fixture로 동작합니다. 실제 연동은 `.env`의 `KIS_APP_KEY`, `KIS_APP_SECRET`만 채우면 됩니다. Google/Kakao 키가 없을 때는 `/account`의 데모 로그인을 사용합니다.

`DISCORD_WEBHOOK_URL`을 입력하면 NestJS의 5xx 오류와 Python 뉴스 수집·구독 갱신 작업 실패가 Discord embed로 전송됩니다. 웹훅이 비어 있거나 알림 전송이 실패해도 서비스와 Celery 재시도에는 영향을 주지 않습니다.

수집을 즉시 실행하려면:

```bash
curl -X POST http://localhost:8100/internal/ingestions -H 'x-internal-token: change-me'
```

자동 수집은 Celery Beat가 `Asia/Seoul` 시간대를 기준으로 매시 정각(`00분`)에 실행합니다.

수집기는 KIS 국내주식 거래대금 순위와 시가총액 순위 API에서 각각 상위 `KIS_TOP_STOCK_COUNT`개(기본 20개) 종목을 조회한 뒤, 두 목록의 합집합 종목 코드를 뉴스 API에 전달합니다. 따라서 전체 시장 뉴스가 아니라 거래대금 또는 시가총액 상위 종목의 소식만 저장합니다. KIS 토큰·순위·뉴스 API의 요청/응답 전문은 인증값과 토큰을 마스킹한 JSON Lines 로그로 기록합니다. Docker 실행 시 호스트의 `./logs/pipeline/kis-api.log`에서 확인할 수 있습니다.

```bash
tail -f logs/pipeline/kis-api.log
```

호스트 서비스 포트: 웹 `3100`, Nest API `4100`, Python API/docs `8100/docs`. PostgreSQL과 Valkey는 Docker 내부 네트워크에서만 접근합니다.

## KIS 계약

- `GET /uapi/domestic-stock/v1/quotations/news-title`
- TR ID `FHKST01011800`
- 공식 포털 `[국내주식-141] 종합 시황/공시(제목)`과 공식 저장소 `llms.txt`의 인증 관례를 기준으로 구현했습니다.
- 제목 API이므로 응답에 URL이 있을 때만 원문을 조회하며, URL이나 비공개 HTS 경로를 만들어내지 않습니다.

## 검증과 이미지 게시

```bash
corepack pnpm install
corepack pnpm --filter @kis/api prisma:generate
corepack pnpm build
docker compose config
```

GitHub Actions는 Node/Python 검증 후 `main`에서 web, api, pipeline 이미지를 commit SHA와 `latest` 태그로 GHCR에 게시하고 Trivy 검사를 수행합니다.
