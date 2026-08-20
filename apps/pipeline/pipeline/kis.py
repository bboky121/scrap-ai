from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, ConfigDict, Field
from redis.asyncio import Redis

from .settings import settings

TOKEN_PATH = "/oauth2/tokenP"
NEWS_PATH = "/uapi/domestic-stock/v1/quotations/news-title"
VOLUME_RANK_PATH = "/uapi/domestic-stock/v1/quotations/volume-rank"
MARKET_CAP_PATH = "/uapi/domestic-stock/v1/ranking/market-cap"
# KIS Developers: 종합 시황/공시(제목) [국내주식-141].
NEWS_TR_ID = "FHKST01011800"
VOLUME_RANK_TR_ID = "FHPST01710000"
MARKET_CAP_TR_ID = "FHPST01740000"
_EXCHANGE_LOGGER = logging.getLogger("kis.exchange")
_EXCHANGE_LOGGER.setLevel(logging.INFO)
_EXCHANGE_LOGGER.propagate = False


def _exchange_logger() -> logging.Logger:
    if not _EXCHANGE_LOGGER.handlers:
        log_dir = Path(settings().kis_log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(log_dir / "kis-api.log", encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(message)s"))
        _EXCHANGE_LOGGER.addHandler(handler)
    return _EXCHANGE_LOGGER


def _mask(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: ("***REDACTED***" if key.lower() in {"appkey", "appsecret", "authorization"} else _mask(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [_mask(item) for item in value]
    return value


def _safe_body(raw: str) -> Any:
    try:
        return _mask(json.loads(raw))
    except json.JSONDecodeError:
        return raw


def log_exchange(request: dict[str, Any], response: dict[str, Any]) -> None:
    _exchange_logger().info(json.dumps({"request": _mask(request), "response": _mask(response)}, ensure_ascii=False, default=str))


class NewsQuery(BaseModel):
    """Official field names and casing from the KIS domestic news contract."""

    model_config = ConfigDict(populate_by_name=True)
    news_provider_code: str = Field(default="", alias="FID_NEWS_OFER_ENTP_CODE")
    market_class_code: str = Field(default="", alias="FID_COND_MRKT_CLS_CODE")
    stock_code: str = Field(default="", alias="FID_INPUT_ISCD")
    title_content: str = Field(default="", alias="FID_TITL_CNTT")
    input_date: str = Field(default="", alias="FID_INPUT_DATE_1")
    input_hour: str = Field(default="", alias="FID_INPUT_HOUR_1")
    rank_sort_code: str = Field(default="", alias="FID_RANK_SORT_CLS_CODE")
    input_serial: str = Field(default="", alias="FID_INPUT_SRNO")


class KisEnvelope(BaseModel):
    rt_cd: str
    msg_cd: str = ""
    msg1: str = ""
    output: list[dict[str, Any]] = []
    tr_cont: str = Field(default="", exclude=True)


class KisClient:
    def __init__(self, redis: Redis, client: httpx.AsyncClient | None = None):
        self.redis = redis
        self.cfg = settings()
        self.client = client or httpx.AsyncClient(base_url=self.cfg.kis_base_url, timeout=10)

    @property
    def configured(self) -> bool:
        return bool(self.cfg.kis_app_key and self.cfg.kis_app_secret)

    async def _wait_for_rate_limit(self) -> None:
        """Enforce a shared fixed-window request limit across all workers."""
        limit = max(1, self.cfg.kis_requests_per_second)
        while True:
            window = int(time.time())
            key = f"kis:rate:{window}"
            count = int(await self.redis.incr(key))
            if count == 1:
                await self.redis.expire(key, 2)
            if count <= limit:
                return
            await self.redis.decr(key)
            wait = max(0.05, window + 1 - time.time()) + random.uniform(0.01, 0.05)
            await asyncio.sleep(wait)

    async def token(self, force: bool = False) -> str:
        if not force and (cached := await self.redis.get("kis:access_token")):
            return cached.decode() if isinstance(cached, bytes) else str(cached)
        async with self.redis.lock("kis:token:lock", timeout=30, blocking_timeout=10):
            if not force and (cached := await self.redis.get("kis:access_token")):
                return cached.decode() if isinstance(cached, bytes) else str(cached)
            await self._wait_for_rate_limit()
            response = await self.client.post(
                TOKEN_PATH,
                json={
                    "grant_type": "client_credentials",
                    "appkey": self.cfg.kis_app_key,
                    "appsecret": self.cfg.kis_app_secret,
                },
            )
            log_exchange(
                {"method": "POST", "path": TOKEN_PATH, "json": {"grant_type": "client_credentials", "appkey": self.cfg.kis_app_key, "appsecret": self.cfg.kis_app_secret}},
                {"status_code": response.status_code, "headers": dict(response.headers), "body": _safe_body(response.text)},
            )
            response.raise_for_status()
            payload = response.json()
            token = str(payload["access_token"])
            ttl = max(60, int(payload.get("expires_in", 86400)) - 300)
            await self.redis.set("kis:access_token", token, ex=ttl)
            return token

    async def news(self, query: NewsQuery | None = None, tr_cont: str = "") -> KisEnvelope:
        params = (query or NewsQuery()).model_dump(by_alias=True)
        refresh_token = False
        for attempt in range(4):
            token = await self.token(force=refresh_token)
            refresh_token = False
            await self._wait_for_rate_limit()
            response = await self.client.get(
                NEWS_PATH,
                params=params,
                headers={
                    "authorization": f"Bearer {token}",
                    "appkey": self.cfg.kis_app_key,
                    "appsecret": self.cfg.kis_app_secret,
                    "tr_id": NEWS_TR_ID,
                    "tr_cont": tr_cont,
                    "custtype": "P",
                    "content-type": "application/json; charset=utf-8",
                },
            )
            log_exchange(
                {"method": "GET", "path": NEWS_PATH, "params": params, "headers": dict(response.request.headers)},
                {"status_code": response.status_code, "headers": dict(response.headers), "body": _safe_body(response.text)},
            )
            if response.status_code == 401 and attempt == 0:
                await self.redis.delete("kis:access_token")
                refresh_token = True
                continue
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 3:
                    await asyncio.sleep(max(1.1, 0.5 * (2**attempt)))
                    continue
            response.raise_for_status()
            envelope = KisEnvelope.model_validate(response.json())
            envelope.tr_cont = response.headers.get("tr_cont", "")
            if envelope.rt_cd != "0":
                raise RuntimeError(f"KIS {envelope.msg_cd}: {envelope.msg1}")
            return envelope
        raise RuntimeError("KIS request exhausted retries")

    async def _ranking_details(self, path: str, tr_id: str, params: dict[str, str], limit: int) -> list[dict[str, str]]:
        for attempt in range(4):
            token = await self.token()
            await self._wait_for_rate_limit()
            response = await self.client.get(
                path,
                params=params,
                headers={
                    "authorization": f"Bearer {token}",
                    "appkey": self.cfg.kis_app_key,
                    "appsecret": self.cfg.kis_app_secret,
                    "tr_id": tr_id,
                    "custtype": "P",
                    "content-type": "application/json; charset=utf-8",
                },
            )
            log_exchange(
                {"method": "GET", "path": path, "params": params, "headers": dict(response.request.headers)},
                {"status_code": response.status_code, "headers": dict(response.headers), "body": _safe_body(response.text)},
            )
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 3:
                    await asyncio.sleep(max(1.1, 0.5 * (2**attempt)))
                    continue
            response.raise_for_status()
            envelope = KisEnvelope.model_validate(response.json())
            if envelope.rt_cd != "0":
                raise RuntimeError(f"KIS {envelope.msg_cd}: {envelope.msg1}")
            records = []
            for row in envelope.output:
                code = str(row.get("mksc_shrn_iscd") or row.get("stck_shrn_iscd") or row.get("iscd1") or "")
                if re.fullmatch(r"\d{6}", code):
                    records.append({"code": code, "name": str(row.get("hts_kor_isnm") or row.get("prdt_name") or "")})
            return records[:limit]
        raise RuntimeError(f"KIS ranking request exhausted retries: {path}")

    async def _ranking(self, path: str, tr_id: str, params: dict[str, str], limit: int) -> list[str]:
        return [item["code"] for item in await self._ranking_details(path, tr_id, params, limit)]

    async def top_trading_value_stocks(self, limit: int = 20) -> list[str]:
        """Return KRX stocks ordered by trading value from the volume-rank API."""
        return await self._ranking(
            VOLUME_RANK_PATH,
            VOLUME_RANK_TR_ID,
            {
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_COND_SCR_DIV_CODE": "20171",
                "FID_INPUT_ISCD": "0000",
                "FID_DIV_CLS_CODE": "0",
                "FID_BLNG_CLS_CODE": "3",
                "FID_TRGT_CLS_CODE": "111111111",
                "FID_TRGT_EXLS_CLS_CODE": "0000000000",
                "FID_RANK_SORT_CLS_CODE": "0",
                "FID_INPUT_PRICE_1": "",
                "FID_INPUT_PRICE_2": "",
                "FID_VOL_CNT": "",
            },
            limit,
        )

    async def top_market_cap_stocks(self, limit: int = 20) -> list[str]:
        """Return KRX stocks ordered by market capitalization."""
        return await self._ranking(
            MARKET_CAP_PATH,
            MARKET_CAP_TR_ID,
            {
                "FID_COND_MRKT_DIV_CODE": "J",
                "FID_COND_SCR_DIV_CODE": "20174",
                "FID_INPUT_ISCD": "0000",
                "FID_DIV_CLS_CODE": "0",
                "FID_INPUT_PRICE_1": "",
                "FID_INPUT_PRICE_2": "",
                "FID_VOL_CNT": "",
                "FID_TRGT_CLS_CODE": "0",
                "FID_TRGT_EXLS_CLS_CODE": "0",
            },
            limit,
        )

    async def top_stock_news(self, limit: int = 20) -> KisEnvelope:
        trading_records = await self._ranking_details(VOLUME_RANK_PATH, VOLUME_RANK_TR_ID, {
            "FID_COND_MRKT_DIV_CODE": "J", "FID_COND_SCR_DIV_CODE": "20171", "FID_INPUT_ISCD": "0000", "FID_DIV_CLS_CODE": "0", "FID_BLNG_CLS_CODE": "3", "FID_TRGT_CLS_CODE": "111111111", "FID_TRGT_EXLS_CLS_CODE": "0000000000", "FID_RANK_SORT_CLS_CODE": "0", "FID_INPUT_PRICE_1": "", "FID_INPUT_PRICE_2": "", "FID_VOL_CNT": ""
        }, limit)
        await asyncio.sleep(self.cfg.kis_request_delay_seconds)
        market_records = await self._ranking_details(MARKET_CAP_PATH, MARKET_CAP_TR_ID, {
            "FID_COND_MRKT_DIV_CODE": "J", "FID_COND_SCR_DIV_CODE": "20174", "FID_INPUT_ISCD": "0000", "FID_DIV_CLS_CODE": "0", "FID_INPUT_PRICE_1": "", "FID_INPUT_PRICE_2": "", "FID_VOL_CNT": "", "FID_TRGT_CLS_CODE": "0", "FID_TRGT_EXLS_CLS_CODE": "0"
        }, limit)
        records = {item["code"]: item for item in [*trading_records, *market_records]}
        codes = list(records)
        if not codes:
            raise RuntimeError("KIS ranking APIs returned no stock codes")

        output: list[dict[str, Any]] = []
        for index, code in enumerate(codes):
            if index:
                await asyncio.sleep(self.cfg.kis_news_delay_seconds)
            try:
                envelope = await self.news(NewsQuery(stock_code=code))
                envelope.output = [{**row, "stock_code": code, "stock_name": records[code]["name"]} for row in envelope.output]
            except Exception as exc:
                raise RuntimeError(f"KIS news collection failed for stock {code}: {exc}") from exc
            output.extend(envelope.output)
        return KisEnvelope(rt_cd="0", output=output)


def normalize(row: dict[str, Any]) -> dict[str, Any]:
    title = str(row.get("hts_pbnt_titl_cntt") or row.get("news_titl") or row.get("title") or "제목 없음").strip()
    date = str(row.get("data_dt") or row.get("date") or datetime.now().strftime("%Y%m%d"))
    hour = str(row.get("data_tm") or row.get("time") or "000000").ljust(6, "0")
    try:
        published = datetime.strptime(date + hour[:6], "%Y%m%d%H%M%S").replace(tzinfo=ZoneInfo("Asia/Seoul")).astimezone(ZoneInfo("UTC"))
    except ValueError:
        published = datetime.now()
    category: Literal["NEWS", "DISCLOSURE", "MARKET_COMMENTARY"] = "NEWS"
    organization = str(row.get("dorg") or "")
    if "공시" in organization or "공시" in title:
        category = "DISCLOSURE"
    elif "시황" in organization or "시황" in title:
        category = "MARKET_COMMENTARY"
    return {
        "title": title,
        "published_at": published,
        "kind": category,
        "provider": str(row.get("news_ofer_entp_name") or row.get("provider") or "한국투자증권"),
        "stock_code": row.get("iscd1") or row.get("stock_code"),
        "source_url": row.get("url"),
        "raw": row,
    }


def is_stock_related(row: dict[str, Any]) -> bool:
    """Keep only rows tied to a listed stock or an explicitly stock-market title."""
    code = str(row.get("iscd1") or row.get("stock_code") or row.get("stck_shrn_iscd") or "")
    if re.fullmatch(r"\d{6}", code):
        return True
    title = str(row.get("hts_pbnt_titl_cntt") or row.get("news_titl") or row.get("title") or "")
    return any(keyword in title for keyword in ("코스피", "코스닥", "상장", "주가", "종목", "증권", "공시", "배당", "자사주"))
