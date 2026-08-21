# Pipeline

Python 3.11 기반 KIS 뉴스 수집·정제·요약 파이프라인입니다. FastAPI는 수동 수집과 상태 확인을 제공하고 Celery Worker/Beat가 작업을 실행·예약합니다.

```bash
docker compose up -d --build python-api celery-worker celery-beat
```

파이프라인을 수정할 때는 세 컨테이너를 중지하고 로컬에서 FastAPI·Worker·Beat를 실행하면 됩니다.

```bash
docker compose stop python-api celery-worker celery-beat
cd apps/pipeline
source .venv/bin/activate
uvicorn pipeline.main:app --reload --port 8100
celery -A pipeline.tasks.celery worker --loglevel=INFO --concurrency=1
celery -A pipeline.tasks.celery beat --loglevel=INFO
```

로컬 프로세스에서는 Docker 서비스명 대신 다음 주소를 사용합니다: `DATABASE_URL`의 `localhost:5433`, `VALKEY_URL`의 `localhost:6379`, `API_INTERNAL_URL`의 `localhost:4100`.

문서: http://localhost:8100/docs

수집 흐름은 KIS 토큰 캐시 → 거래대금·시가총액 상위 종목 조회 → 뉴스 수집 → 정규화·중복 제거 → 요약·브리핑 생성 → 종목명 DB 저장 → 푸시 요청 순서입니다. 매시 정각(`Asia/Seoul`)에 실행됩니다.

```bash
curl -X POST http://localhost:8100/internal/ingestions -H 'x-internal-token: {x-internal-token}'
tail -f ../../logs/pipeline/kis-api.log
```

429·5xx backoff, Valkey 분산 잠금, 마스킹된 요청·응답 로그, Discord 장애 알림을 지원합니다.

```bash
ruff check .
ruff format --check .
mypy pipeline
pytest
```
