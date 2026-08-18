from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from .settings import settings


def sync_url() -> str:
    return settings().database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://").replace("postgresql://", "postgresql+psycopg://")


engine = create_engine(sync_url(), pool_pre_ping=True)


def session() -> Session:
    return Session(engine)
