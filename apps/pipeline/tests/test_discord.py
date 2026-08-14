from unittest.mock import Mock

from pipeline import discord


def test_notification_is_disabled_without_webhook(monkeypatch) -> None:
    post = Mock()
    monkeypatch.setattr(discord.httpx, "post", post)
    monkeypatch.setattr(discord.settings(), "discord_webhook_url", "")
    discord.notify_error("test", "detail")
    post.assert_not_called()


def test_notification_failure_is_swallowed(monkeypatch) -> None:
    monkeypatch.setattr(discord.settings(), "discord_webhook_url", "https://discord.invalid/webhook")
    monkeypatch.setattr(discord.httpx, "post", Mock(side_effect=RuntimeError("network")))
    discord.notify_error("test", "detail", {"task": "ingest"})
