from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kisbrief"
    valkey_url: str = "redis://localhost:6379/0"
    internal_service_token: str = "change-me"
    api_internal_url: str = "http://api:4000"
    discord_webhook_url: str = ""
    kis_app_key: str = ""
    kis_app_secret: str = ""
    kis_base_url: str = "https://openapi.koreainvestment.com:9443"
    kis_log_dir: str = "/var/log/kis-brief"
    kis_log_max_bytes: int = 50 * 1024 * 1024
    kis_log_backup_count: int = 7
    kis_top_stock_count: int = 20
    kis_request_delay_seconds: float = 0.5
    kis_news_delay_seconds: float = 0.25
    kis_ingest_lock_ttl_seconds: int = 900
    kis_requests_per_second: int = 15


@lru_cache
def settings() -> Settings:
    return Settings()
