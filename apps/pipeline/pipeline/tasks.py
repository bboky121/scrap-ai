from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from celery import Celery
from celery.schedules import crontab
from redis.asyncio import Redis
from sqlalchemy import text

from .db import session
from .discord import notify_error
from .kis import KisClient, KisEnvelope, is_stock_related, normalize
from .settings import settings
from .summary import briefing, summarize

cfg = settings()
celery = Celery("kisbrief", broker=cfg.valkey_url, backend=cfg.valkey_url)
celery.conf.beat_schedule = {
    "hourly-kis-news": {"task": "pipeline.ingest", "schedule": crontab(minute=0)},
    "renew-subscriptions": {"task": "pipeline.renew_subscriptions", "schedule": crontab(minute=0)},
}
celery.conf.timezone = "Asia/Seoul"


def fixture() -> KisEnvelope:
    return KisEnvelope.model_validate_json((Path(__file__).parent / "fixtures/kis_news.json").read_text())


async def fetch() -> tuple[KisEnvelope, str]:
    redis = Redis.from_url(cfg.valkey_url)
    client = KisClient(redis)
    try:
        if not client.configured:
            return fixture(), "DEMO_FIXTURE"
        return await client.news(), "KIS"
    except Exception:
        return fixture(), "DEMO_FIXTURE"
    finally:
        await redis.aclose()


@celery.task(name="pipeline.ingest", bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)  # type: ignore[untyped-decorator]
def ingest(self: Any) -> dict[str, Any]:
    run_id = self.request.id or str(uuid.uuid4())
    envelope, source = asyncio.run(fetch())
    db = session()
    saved: list[dict[str, Any]] = []
    try:
        db.execute(
            text('INSERT INTO "IngestionRun" (id,status,source,"startedAt") VALUES (:id,CAST(:status AS "IngestionStatus"),:source,now()) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status'),
            {"id": run_id, "status": "RUNNING", "source": source},
        )
        for raw in envelope.output:
            if not is_stock_related(raw):
                continue
            item = normalize(raw)
            basis = json.dumps(raw, ensure_ascii=False, sort_keys=True)
            external_id = str(raw.get("news_srno") or hashlib.sha256(basis.encode()).hexdigest())
            article_id = str(uuid.uuid4())
            summary = summarize(item["title"], item["kind"], item["stock_code"])
            result = db.execute(
                text('INSERT INTO "Article" (id,"externalId",kind,title,provider,"publishedAt","stockCode","sourceUrl",raw,"createdAt") VALUES (:id,:external,CAST(:kind AS "ArticleKind"),:title,:provider,:published,:stock,:url,CAST(:raw AS jsonb),now()) ON CONFLICT ("externalId") DO NOTHING RETURNING id'),
                {
                    "id": article_id,
                    "external": external_id,
                    "kind": item["kind"],
                    "title": item["title"],
                    "provider": item["provider"],
                    "published": item["published_at"],
                    "stock": item["stock_code"],
                    "url": item["source_url"],
                    "raw": json.dumps(raw, ensure_ascii=False),
                },
            )
            inserted = result.scalar_one_or_none()
            if inserted:
                db.execute(
                    text('INSERT INTO "ArticleSummary" (id,"articleId",bullets,keywords,"relatedStocks",sentiment,"titleOnly","createdAt") VALUES (:id,:article,CAST(:bullets AS jsonb),CAST(:keywords AS jsonb),CAST(:stocks AS jsonb),CAST(:sentiment AS "Sentiment"),:title_only,now())'),
                    {
                        "id": str(uuid.uuid4()),
                        "article": inserted,
                        "bullets": json.dumps(summary["bullets"], ensure_ascii=False),
                        "keywords": json.dumps(summary["keywords"], ensure_ascii=False),
                        "stocks": json.dumps(summary["related_stocks"]),
                        "sentiment": summary["sentiment"],
                        "title_only": summary["title_only"],
                    },
                )
                item["id"] = inserted
                saved.append(item)
        if saved:
            bucket = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
            brief = briefing(saved)
            bid = str(uuid.uuid4())
            briefing_result = db.execute(
                text('INSERT INTO "HourlyBriefing" (id,"bucketAt",headline,"keyIssues","marketImpact","watchStocks","createdAt") VALUES (:id,:bucket,:headline,CAST(:issues AS jsonb),:impact,CAST(:stocks AS jsonb),now()) ON CONFLICT ("bucketAt") DO UPDATE SET headline=EXCLUDED.headline,"keyIssues"=EXCLUDED."keyIssues","marketImpact"=EXCLUDED."marketImpact","watchStocks"=EXCLUDED."watchStocks" RETURNING id'),
                {
                    "id": bid,
                    "bucket": bucket,
                    "headline": brief["headline"],
                    "issues": json.dumps(brief["key_issues"], ensure_ascii=False),
                    "impact": brief["market_impact"],
                    "stocks": json.dumps(brief["watch_stocks"]),
                },
            )
            bid = str(briefing_result.scalar_one())
            for item in saved:
                db.execute(
                    text('INSERT INTO "BriefingArticle" ("briefingId","articleId") VALUES (:brief,:article) ON CONFLICT DO NOTHING'),
                    {"brief": bid, "article": item["id"]},
                )
        status = "DEMO_FIXTURE" if source == "DEMO_FIXTURE" else "SUCCEEDED"
        db.execute(
            text('UPDATE "IngestionRun" SET status=CAST(:status AS "IngestionStatus"),"fetchedCount"=:fetched,"savedCount"=:saved,"finishedAt"=now() WHERE id=:id'),
            {"status": status, "fetched": len(envelope.output), "saved": len(saved), "id": run_id},
        )
        db.commit()
        return {"id": run_id, "source": source, "fetched": len(envelope.output), "saved": len(saved)}
    except Exception as exc:
        db.rollback()
        notify_error("KIS 뉴스 수집 실패", str(exc), {"taskId": run_id, "source": source})
        raise exc
    finally:
        db.close()


@celery.task(name="pipeline.renew_subscriptions")  # type: ignore[untyped-decorator]
def renew_subscriptions() -> int:
    # Payment remains simulated. Expired auto-renew rows are extended by the selected calendar unit.
    db = session()
    try:
        result = db.execute(text('UPDATE "Subscription" SET "endsAt" = CASE WHEN "planCode"=\'WEEK\' THEN "endsAt" + interval \'7 days\' WHEN "planCode"=\'MONTH\' THEN "endsAt" + interval \'1 month\' ELSE "endsAt" + interval \'1 year\' END WHERE status=\'ACTIVE\' AND "autoRenew"=true AND "endsAt" <= now() RETURNING id'))
        count = len(result.fetchall())
        db.execute(text('UPDATE "Subscription" SET status=\'EXPIRED\' WHERE status=\'ACTIVE\' AND "autoRenew"=false AND "endsAt" <= now()'))
        db.commit()
        return count
    except Exception as exc:
        db.rollback()
        notify_error("구독 갱신 작업 실패", str(exc), {"task": "renew_subscriptions"})
        raise
    finally:
        db.close()
