FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN useradd --create-home app
WORKDIR /app
COPY apps/pipeline/pyproject.toml ./
COPY --chown=app:app apps/pipeline/pipeline pipeline
RUN pip install --no-cache-dir .
USER app
EXPOSE 8000
CMD ["uvicorn","pipeline.api:app","--host","0.0.0.0","--port","8000"]
