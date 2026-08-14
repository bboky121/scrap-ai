from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql://postgres:postgres@localhost:5432/kisbrief"
    valkey_url: str = "redis://localhost:6379/0"
    internal_service_token: str = "change-me"
    discord_webhook_url: str = ""
    kis_app_key: str = ""
    kis_app_secret: str = ""
    kis_base_url: str = "https://openapi.koreainvestment.com:9443"


@lru_cache
def settings() -> Settings:
    return Settings()
