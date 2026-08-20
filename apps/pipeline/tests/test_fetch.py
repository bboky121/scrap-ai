import asyncio
from unittest.mock import AsyncMock

import pytest

from pipeline import tasks


class FakeRedis:
    class Lock:
        async def acquire(self) -> bool:
            return True

        async def release(self) -> None:
            pass

    def lock(self, *_args: object, **_kwargs: object) -> Lock:
        return self.Lock()

    async def aclose(self) -> None:
        pass


def test_configured_kis_outage_is_not_replaced_with_demo_fixture(monkeypatch: pytest.MonkeyPatch) -> None:
    kis = AsyncMock()
    kis.configured = True
    kis.top_stock_news.side_effect = RuntimeError("KIS ranking unavailable")
    monkeypatch.setattr(tasks.Redis, "from_url", lambda _: FakeRedis())
    monkeypatch.setattr(tasks, "KisClient", lambda _: kis)
    monkeypatch.setattr(tasks, "fixture", lambda: pytest.fail("production failures must not load demo data"))

    with pytest.raises(RuntimeError, match="KIS ranking unavailable"):
        asyncio.run(tasks.fetch())


def test_unconfigured_kis_uses_demo_fixture(monkeypatch: pytest.MonkeyPatch) -> None:
    kis = AsyncMock()
    kis.configured = False
    demo = object()
    monkeypatch.setattr(tasks.Redis, "from_url", lambda _: FakeRedis())
    monkeypatch.setattr(tasks, "KisClient", lambda _: kis)
    monkeypatch.setattr(tasks, "fixture", lambda: demo)

    assert asyncio.run(tasks.fetch()) == (demo, "DEMO_FIXTURE")
    kis.top_stock_news.assert_not_awaited()
