from typing import Annotated

from celery.result import AsyncResult
from fastapi import Depends, FastAPI, Header, HTTPException
from sqlalchemy import text

from .db import session
from .settings import settings
from .tasks import celery, ingest

app = FastAPI(title="KIS Brief Pipeline", version="0.1.0")


def internal(x_internal_token: Annotated[str | None, Header()] = None) -> None:
    if x_internal_token != settings().internal_service_token:
        raise HTTPException(401, "invalid internal token")


@app.get("/health/live")
def live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
def ready() -> dict[str, str]:
    db = session()
    db.execute(text("SELECT 1"))
    db.close()
    return {"status": "ready"}


@app.post("/internal/ingestions", dependencies=[Depends(internal)], status_code=202)
def start() -> dict[str, str]:
    task = ingest.delay()
    return {"taskId": task.id, "status": "PENDING"}


@app.get("/internal/ingestions/{task_id}", dependencies=[Depends(internal)])
def status(task_id: str) -> dict[str, object]:
    task = AsyncResult(task_id, app=celery)
    return {"taskId": task_id, "status": task.status, "result": task.result if task.successful() else None}
