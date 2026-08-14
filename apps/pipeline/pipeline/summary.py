from __future__ import annotations

import re
from typing import Any

POSITIVE = ("상승", "호조", "증가", "성장", "수주", "최대", "개선")
NEGATIVE = ("하락", "감소", "부진", "적자", "우려", "제재", "급락")


def summarize(title: str, kind: str, stock_code: str | None, has_body: bool = False) -> dict[str, Any]:
    words = [w for w in re.findall(r"[가-힣A-Za-z0-9]+", title) if len(w) > 1][:5]
    score = sum(w in title for w in POSITIVE) - sum(w in title for w in NEGATIVE)
    sentiment = "POSITIVE" if score > 0 else "NEGATIVE" if score < 0 else "NEUTRAL"
    label = {"NEWS": "주요 뉴스", "DISCLOSURE": "기업 공시", "MARKET_COMMENTARY": "시장 시황"}.get(
        kind, "시장 소식"
    )
    return {
        "bullets": [
            f"{label}: {title}",
            "시장 참여자가 확인할 핵심 재료로 분류되었습니다.",
            "추가 공시와 가격 변동을 함께 확인하세요.",
        ],
        "keywords": words,
        "related_stocks": [stock_code] if stock_code else [],
        "sentiment": sentiment,
        "title_only": not has_body,
    }


def briefing(items: list[dict[str, Any]]) -> dict[str, Any]:
    headline = items[0]["title"] if items else "새로 수집된 국내 증권 뉴스가 없습니다"
    stocks = sorted({x["stock_code"] for x in items if x.get("stock_code")})[:5]
    return {
        "headline": headline,
        "key_issues": [x["title"] for x in items[:3]],
        "market_impact": f"이번 시간에는 {len(items)}건의 시황·공시가 집계됐습니다. 개별 종목 변동성을 확인하세요.",
        "watch_stocks": stocks,
    }
