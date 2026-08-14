from __future__ import annotations

from typing import Any

import httpx

from .settings import settings


def notify_error(title: str, detail: str, context: dict[str, Any] | None = None) -> None:
    """Best-effort Discord alert; notification failures never fail the worker."""
    webhook = settings().discord_webhook_url
    if not webhook:
        return
    fields = [
        {"name": key, "value": str(value)[:1000], "inline": True}
        for key, value in (context or {}).items()
    ][:10]
    payload = {
        "username": "시그널브리프 알림",
        "embeds": [
            {
                "title": f"🚨 {title}",
                "description": detail[:3500],
                "color": 15143616,
                "fields": fields,
            }
        ],
    }
    try:
        response = httpx.post(webhook, json=payload, timeout=5)
        response.raise_for_status()
    except Exception:
        return
