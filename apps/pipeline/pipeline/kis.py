from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Literal
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, ConfigDict, Field
from redis.asyncio import Redis

from .settings import settings

TOKEN_PATH = "/oauth2/tokenP"
NEWS_PATH = "/uapi/domestic-stock/v1/quotations/news-title"
# KIS Developers: 종합 시황/공시(제목) [국내주식-141].
NEWS_TR_ID = "FHKST01011800"


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

    async def token(self, force: bool = False) -> str:
        if not force and (cached := await self.redis.get("kis:access_token")):
            return cached.decode() if isinstance(cached, bytes) else str(cached)
        async with self.redis.lock("kis:token:lock", timeout=30, blocking_timeout=10):
            if not force and (cached := await self.redis.get("kis:access_token")):
                return cached.decode() if isinstance(cached, bytes) else str(cached)
            response = await self.client.post(
                TOKEN_PATH,
                json={
                    "grant_type": "client_credentials",
                    "appkey": self.cfg.kis_app_key,
                    "appsecret": self.cfg.kis_app_secret,
                },
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
            if response.status_code == 401 and attempt == 0:
                await self.redis.delete("kis:access_token")
                refresh_token = True
                continue
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < 3:
                    await asyncio.sleep(0.3 * (2**attempt))
                    continue
            response.raise_for_status()
            envelope = KisEnvelope.model_validate(response.json())
            envelope.tr_cont = response.headers.get("tr_cont", "")
            if envelope.rt_cd != "0":
                raise RuntimeError(f"KIS {envelope.msg_cd}: {envelope.msg1}")
            return envelope
        raise RuntimeError("KIS request exhausted retries")


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
