# API Reference Overview

Photo Search exposes a FastAPI-based HTTP API. Interactive OpenAPI
documentation is available at `/docs` (Swagger UI) and `/redoc` once the
API server is running.

## Core Endpoints

- `POST /search` – Primary search endpoint with semantic, EXIF, OCR, and
  metadata filters.
- `POST /search/cached` – Cached search variant used for quick lookups.
- `POST /search_workspace` – Search within workspace assets.
- `POST /search_like` / `POST /search_like_plus` – Similar photo search
  and similar-with-text workflows.
- `POST /monitoring` / `POST /api/monitoring` – Accepts monitoring event
  payloads from the web and Electron clients.
- `GET /health` / `GET /api/health` – Lightweight health check returning
  uptime and optional index status when a `dir` query parameter is
  provided.
- `GET /docs` – Swagger UI generated from the OpenAPI schema.
- `GET /openapi.json` – OpenAPI document for programmatic clients.

## Monitoring and Logging

Enable structured request logging by setting `API_LOG_LEVEL=debug` (or
`info`). Each API request will be logged with method, path, status, and
latency to stdout.

Use the `/health` endpoint for infrastructure liveness probes. Pass a
`dir` parameter to verify that an index directory exists, for example:

```
curl "http://localhost:8000/health?dir=/path/to/library"
```

## Authentication

When `API_TOKEN` is set, mutating endpoints require a `Bearer` token via
`Authorization` headers. Set `DEV_NO_AUTH=1` during local development to
bypass authentication.

## Generating OpenAPI Artifacts

To export the OpenAPI document, run:

```
uvicorn photo-search-intent-first.api.server:app --reload
# then download http://localhost:8000/openapi.json
```

The generated schema can be used with tools such as Postman or
Insomnia for further documentation or client generation.
