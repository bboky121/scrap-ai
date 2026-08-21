# 시그널브리프

한국투자증권(KIS) 국내주식 뉴스·공시를 매시간 수집해 결정론적 AI 브리핑으로 제공하는 포트폴리오 프로젝트입니다. 실제 투자 조언이나 실결제는 포함하지 않으며, 결제는 시뮬레이션 비즈니스 로직으로만 동작합니다.

## 주요 기능

- KIS 국내 `종합 시황/공시(제목)` 뉴스 수집
- 거래대금 상위 20개와 시가총액 상위 20개 종목의 합집합만 수집
- 정시별 뉴스 정규화·중복 제거·제목 기반 요약·브리핑 생성
- 최근 72시간 무료 콘텐츠와 구독자 전용 과거 콘텐츠
- Google OAuth 및 데모 로그인
- 주·월·년 구독과 자동갱신 시뮬레이션
- FCM 시간별 브리핑 푸시 및 Discord 장애 알림
- Next.js 웹과 Expo React Native WebView 앱

## 화면 미리보기

실행 중인 로컬 서비스에서 캡처한 주요 화면입니다.

### 홈

<img src="apps/web/public/readme/home.png" alt="시그널브리프 홈" width="420">

### 국내 증권 뉴스

<img src="apps/web/public/readme/news.png" alt="국내 증권 뉴스 목록" width="420">

### 시간별 브리핑 상세

<img src="apps/web/public/readme/briefing.png" alt="시간별 브리핑 상세" width="420">

### 멤버십 요금제

<img src="apps/web/public/readme/pricing.png" alt="멤버십 요금제" width="420">

### 로그인

<img src="apps/web/public/readme/login.png" alt="로그인" width="420">

## 아키텍처

```text
KIS Open API → Python FastAPI/Celery → PostgreSQL
                         │                 │
                         └─ Valkey ────────┘
                                   ↓
                         NestJS API → Next.js Web
                                   ↓
                         Expo WebView + FCM
```

| 서비스          | 역할                                  | 로컬 주소                  |
| --------------- | ------------------------------------- | -------------------------- |
| `apps/web`      | Next.js 사용자 화면                   | http://localhost:3100      |
| `apps/api`      | NestJS 인증·콘텐츠·구독 API           | http://localhost:4100      |
| `apps/pipeline` | FastAPI, Celery Worker/Beat, KIS 연동 | http://localhost:8100/docs |
| PostgreSQL      | 공용 데이터베이스                     | Docker 내부 / 호스트 5433  |
| Valkey          | 세션·Celery·토큰 캐시·잠금            | Docker 내부                |

## 빠른 시작

요구사항: Docker Desktop, Node.js 22+, Corepack/pnpm 9+, (선택) Python 3.11+, Android Studio.

```bash
cp .env.example .env
corepack enable
pnpm install
docker compose up -d --build postgres valkey
docker compose up -d --build api web python-api celery-worker celery-beat
docker compose run --rm --entrypoint sh api -lc \
  'cd /app/apps/api && ./node_modules/.bin/prisma migrate deploy'
docker compose run --rm --entrypoint sh api -lc \
  'cd /app/apps/api && node ../../node_modules/.bin/tsx prisma/seed.ts'
```

웹: http://localhost:3100 · API health: http://localhost:4100/health/live · Pipeline docs: http://localhost:8100/docs

KIS 키가 비어 있으면 fixture로 동작합니다. 실제 연동은 `KIS_APP_KEY`, `KIS_APP_SECRET`을 설정해야 합니다. 비밀값이 포함된 `.env`는 커밋하지 마세요.

## 환경변수

`.env.example`을 기준으로 설정합니다.

- KIS: `KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`
- 데이터: `DATABASE_URL`, `VALKEY_URL`
- 인증: `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- 알림: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `DISCORD_WEBHOOK_URL`
- 모바일: `MOBILE_DEEP_LINK_SCHEME`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_API_URL`

Google OAuth callback은 로컬에서 `http://localhost:4100/auth/google/callback`을 사용합니다. 운영에서는 HTTPS 도메인으로 별도 등록해야 합니다.

## 수집과 로그

Celery Beat가 한국시간 기준 매시 정각에 수집을 실행합니다. 수동 실행:

```bash
curl -X POST http://localhost:8100/internal/ingestions -H 'x-internal-token: change-me'
tail -f logs/pipeline/kis-api.log
```

## 개발·검증

### 빠른 로컬 개발

개발 중에는 수정 대상 서비스만 Docker에서 중지하고 로컬 개발 서버로 실행하면 코드 변경이 즉시 반영됩니다. PostgreSQL·Valkey 같은 의존 서비스는 Docker로 유지합니다.

웹 UI 작업:

```bash
docker compose stop web
pnpm --filter @kis/web exec next dev --hostname 0.0.0.0 --port 3100
```

API 작업:

```bash
docker compose stop api
pnpm --filter @kis/api exec nest start --watch --port 4100
```

Pipeline 작업:

```bash
docker compose stop python-api celery-worker celery-beat
cd apps/pipeline
source .venv/bin/activate
uvicorn pipeline.main:app --reload --port 8100
celery -A pipeline.tasks.celery worker --loglevel=INFO --concurrency=1
celery -A pipeline.tasks.celery beat --loglevel=INFO
```

Docker 내부 서비스명(`postgres`, `valkey`, `api`)은 로컬 프로세스에서 `localhost`로 바꿔야 합니다. 호스트 포트는 PostgreSQL `5433`, Valkey `6379`, API `4100`입니다.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/kisbrief
VALKEY_URL=redis://localhost:6379/0
API_INTERNAL_URL=http://localhost:4100
NEXT_PUBLIC_API_URL=http://localhost:4100
```

작업을 마치고 Docker 서비스로 되돌리려면:

```bash
docker compose up -d --build web api python-api celery-worker celery-beat
```

```bash
pnpm lint
pnpm test
pnpm build
pnpm format:check
docker compose config
```

GitHub Actions는 Node/Python 검증 후 Docker 이미지를 GHCR에 게시하고 Trivy 검사를 수행합니다. 실제 서버 자동 배포는 포함하지 않습니다.

## 서비스별 문서

- [Web](apps/web/README.md)
- [API](apps/api/README.md)
- [Pipeline](apps/pipeline/README.md)
- [Mobile](apps/mobile/README.md)

## 주의

KIS API 이용약관과 원문 재배포 정책을 준수해야 합니다. 본 프로젝트의 브리핑은 포트폴리오 데모이며 투자 판단의 근거로 사용할 수 없습니다.
