import asyncio
from collections.abc import Callable
from unittest.mock import AsyncMock

import httpx
import pytest

from pipeline.kis import (
    MARKET_CAP_PATH,
    MARKET_CAP_TR_ID,
    NEWS_PATH,
    NEWS_TR_ID,
    VOLUME_RANK_PATH,
    VOLUME_RANK_TR_ID,
    KisClient,
    NewsQuery,
    normalize,
)


def client_for(handler: Callable[[httpx.Request], httpx.Response], monkeypatch: pytest.MonkeyPatch) -> KisClient:
    monkeypatch.setattr("pipeline.kis.log_exchange", lambda *_: None)
    client = KisClient(AsyncMock(), httpx.AsyncClient(base_url="https://kis.test", transport=httpx.MockTransport(handler)))
    client.cfg.kis_app_key = "test-key"
    client.cfg.kis_app_secret = "test-secret"
    client.token = AsyncMock(return_value="test-token")  # type: ignore[method-assign]
    return client


def test_domestic_news_contract() -> None:
    assert NEWS_PATH == "/uapi/domestic-stock/v1/quotations/news-title"
    assert NEWS_TR_ID == "FHKST01011800"
    assert set(NewsQuery().model_dump(by_alias=True)) == {
        "FID_NEWS_OFER_ENTP_CODE",
        "FID_COND_MRKT_CLS_CODE",
        "FID_INPUT_ISCD",
        "FID_TITL_CNTT",
        "FID_INPUT_DATE_1",
        "FID_INPUT_HOUR_1",
        "FID_RANK_SORT_CLS_CODE",
        "FID_INPUT_SRNO",
    }


def test_kis_time_is_kst_and_dorg_classifies_disclosure() -> None:
    item = normalize({"data_dt": "20260814", "data_tm": "163646", "dorg": "코스닥 공시", "hts_pbnt_titl_cntt": "반기보고서"})
    assert item["published_at"].isoformat() == "2026-08-14T07:36:46+00:00"
    assert item["kind"] == "DISCLOSURE"


def test_volume_ranking_api_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == VOLUME_RANK_PATH
        assert request.headers["tr_id"] == VOLUME_RANK_TR_ID
        assert request.headers["authorization"] == "Bearer test-token"
        assert dict(request.url.params) == {
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
        }
        return httpx.Response(200, json={"rt_cd": "0", "output": [{"stck_shrn_iscd": "005930"}, {"stck_shrn_iscd": "invalid"}, {"iscd1": "000660"}]})

    client = client_for(handler, monkeypatch)
    assert asyncio.run(client.top_trading_value_stocks(limit=2)) == ["005930", "000660"]
    asyncio.run(client.client.aclose())


def test_market_cap_ranking_api_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == MARKET_CAP_PATH
        assert request.headers["tr_id"] == MARKET_CAP_TR_ID
        assert dict(request.url.params) == {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_COND_SCR_DIV_CODE": "20174",
            "FID_INPUT_ISCD": "0000",
            "FID_DIV_CLS_CODE": "0",
            "FID_INPUT_PRICE_1": "",
            "FID_INPUT_PRICE_2": "",
            "FID_VOL_CNT": "",
            "FID_TRGT_CLS_CODE": "0",
            "FID_TRGT_EXLS_CLS_CODE": "0",
        }
        return httpx.Response(200, json={"rt_cd": "0", "output": [{"stck_shrn_iscd": "005930"}]})

    client = client_for(handler, monkeypatch)
    assert asyncio.run(client.top_market_cap_stocks()) == ["005930"]
    asyncio.run(client.client.aclose())


def test_top_stock_news_deduplicates_rankings_and_aggregates_per_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    requested_news: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == VOLUME_RANK_PATH:
            return httpx.Response(200, json={"rt_cd": "0", "output": [{"stck_shrn_iscd": "005930"}, {"stck_shrn_iscd": "000660"}]})
        if request.url.path == MARKET_CAP_PATH:
            return httpx.Response(200, json={"rt_cd": "0", "output": [{"stck_shrn_iscd": "005930"}, {"stck_shrn_iscd": "035420"}]})
        assert request.url.path == NEWS_PATH
        assert request.headers["tr_id"] == NEWS_TR_ID
        code = request.url.params["FID_INPUT_ISCD"]
        requested_news.append(code)
        return httpx.Response(200, json={"rt_cd": "0", "output": [{"iscd1": code, "news_srno": f"news-{code}"}]})

    client = client_for(handler, monkeypatch)
    envelope = asyncio.run(client.top_stock_news(limit=2))
    assert requested_news == ["005930", "000660", "035420"]
    assert [row["iscd1"] for row in envelope.output] == requested_news
    asyncio.run(client.client.aclose())


def test_top_stock_news_preserves_failing_stock_context(monkeypatch: pytest.MonkeyPatch) -> None:
    client = client_for(lambda _: httpx.Response(500), monkeypatch)
    client.top_trading_value_stocks = AsyncMock(return_value=["005930"])  # type: ignore[method-assign]
    client.top_market_cap_stocks = AsyncMock(return_value=[])  # type: ignore[method-assign]
    client.news = AsyncMock(side_effect=RuntimeError("KIS EGW00123: upstream unavailable"))  # type: ignore[method-assign]

    with pytest.raises(RuntimeError, match=r"stock 005930: KIS EGW00123: upstream unavailable") as caught:
        asyncio.run(client.top_stock_news())
    assert isinstance(caught.value.__cause__, RuntimeError)
    asyncio.run(client.client.aclose())
