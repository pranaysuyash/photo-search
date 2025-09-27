# Server Refactor – Unified Plan & Starter PRs

This is the merged, end‑to‑end plan plus drop‑in starter code for Phases 1–2. It fuses architectural refactors with safety, performance, and DX.

---

## North Star

- **Safe by default**: workspace jail, soft‑delete, atomic writes, request limits.
- **Modular**: routers per domain, services for logic, schemas for I/O, dependencies for wiring.
- **Deterministic & observable**: unified search engine, typed models, structured logs, metrics, tests.

---

## Target Project Structure (End State)

```
app/
  main.py                 # create_app(), mounts routers, middleware, static
  settings.py             # pydantic-settings for all env/config
  middleware.py           # access logs, request-id, size caps, TrustedHost
  security.py             # auth dep, rate limiting, HTTPS redirect
  paths.py                # WORKSPACE_ROOT jail, atomic writes, soft-delete, FS utils
  deps.py                 # FastAPI deps (embedder, store, directory, engine)
  errors.py               # global exception handlers, uniform error envelope
  schemas/
    core.py, files.py, search.py, share.py, index.py, faces.py, trips.py, ...
  services/
    search_engine.py, search_cache.py, query_expr.py,
    index_service.py, face_service.py, share_service.py, library_service.py
  routes/
    health.py, meta.py, files.py, search.py, index.py, fast.py,
    captions.py, faces.py, trips.py, share.py, library.py
  workers/
    executor.py           # single thread/process pool, job queue/backpressure
  static/

tests/
  unit/, api/, property/, golden/, stress/
```

---

## Phased Deliverables & Acceptance

### Phase 1 — Platform & Safety Net
**Deliver**
- `main.py` with `create_app()`.
- `settings.py` via pydantic‑settings.
- Middlewares: Request‑ID, structured access logs, GZip, request size cap, TrustedHost, HTTPS redirect, CORS allowlist.
- Global error handler returning `{code, message, details?}`.
- `/livez`, `/readyz`, root.

**Accept**
- Boots via `uvicorn app.main:create_app`.
- Logs include request_id, method, path, status, ms.
- `/docs` loads; unknown routes yield uniform error JSON.

### Phase 2 — Filesystem Hardening
**Deliver**
- `WORKSPACE_ROOT` jail with `safe_in_workspace`.
- Soft‑delete to `.trash/<ts>/…` instead of hard delete.
- Atomic writes (`*.tmp` + `Path.replace`).
- Free‑space guard before heavy ops.
- Media allowlist.

**Accept**
- Path fuzz tests can’t escape workspace.
- Deletes go to trash; crash during write never corrupts target.

### Phase 3 — Auth, Limits, Observability
**Deliver**
- `require_bearer` dep (constant‑time compare).
- Per‑route rate limits for expensive endpoints.
- `/metrics` (Prometheus), audit log JSONL for destructive ops.

**Accept**
- Protected routes 401 without token, 200 with.
- Metrics scrape returns counters/histograms.
- Audit entries recorded for destructive ops.

### Phase 4 — Routers & Schemas
**Deliver**
- Extract endpoints into `routes/*` under `/api/v1`.
- Typed Pydantic requests/responses in `schemas/*` (use `Enum` for backend selections).
- Delete `_from_body`, `_require`, `_as_*`.

**Accept**
- `server.py` empty or removed.
- `/docs` clean, typed models; no loose dicts.

### Phase 5 — Dependencies & Services
**Deliver**
- `deps.py` for directory, provider, `IndexStore`, `SearchEngine`.
- Move business logic into `services/*`; routers become thin.

**Accept**
- Unit tests cover services without TestClient.
- No business logic inside routers.

### Phase 6 — Unified Search Engine
**Deliver**
- `SearchEngine.search(req, store, emb)` single entrypoint.
- Shared filter pipeline (EXIF/OCR/captions/tags/favorites/people/date).
- `query_expr.py` for expression parsing, with tests.
- `search_cache.py` atomic TTL cache, invalidated by `(index_dir, epoch)`.

**Accept**
- `/search` and `/search/cached` share the engine.
- Golden tests on tiny corpus prove parity and prevent regressions.

### Phase 7 — Background Work & Backpressure
**Deliver**
- `workers/executor.py` with single bounded pool and queue.
- Long tasks offloaded; return job IDs; Idempotency‑Key support.
- Job status endpoint; minimal registry.

**Accept**
- Heavy calls return quickly with job id; status reflects progress.
- Duplicate Idempotency‑Key returns prior job.

### Phase 8 — Share API Hardening
**Deliver**
- Opaque `share_id`; never expose absolute paths.
- Signed, time‑boxed URLs (HMAC); constant‑time password checks.
- Per‑IP/token rate limits.

**Accept**
- Access without valid signature fails; expired tokens rejected.
- No filesystem paths in responses.

### Phase 9 — Library, Faces, Trips, Captions Cleanup
**Deliver**
- Slim routers calling services; typed responses; pagination clamps.
- LRU memo for meta JSON by `(index_dir, mtime)`.
- Deterministic ordering with stable tiebreaker.

**Accept**
- p95 latencies stable or improved on warm caches.
- No duplicate logic across routes.

### Phase 10 — Testing & CI Gate
**Deliver**
- Contract tests per endpoint.
- Property tests: path jail, expression parser.
- Golden search tests; light stress run in CI.
- Pre‑commit: ruff, black, mypy strict, coverage gates on `app/` and `services/`.

**Accept**
- CI green with coverage threshold met.
- Stress check shows no handler blocking/timeouts.

### Phase 11 — API Prune & Polish
**Deliver**
- Remove legacy endpoints or respond 410 with upgrade hints.
- ETag/If‑None‑Match on heavy GETs; ORJSON responses for large payloads.

**Accept**
- UI uses `/api/v1/*` exclusively.
- ETag saves bandwidth on repeated GETs.

---

## Non‑Negotiable Guardrails

- Always gate paths with `safe_in_workspace`.
- Delete via soft‑delete, sweep later.
- Atomic writes only.
- Never expose absolute paths in responses.
- Clamp `top_k`, `limit`, and request size.
- Typed models everywhere; request_id in all logs.

---

## PR #1 — Boot, Settings, Middlewares, Errors

### `app/settings.py`
```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]
    cors_origins: List[str] = []

    api_token: str | None = None
    dev_no_auth: bool = False
    request_max_bytes: int = 2_000_000

    workspace_root: str = "~/.myapp"
    free_space_min_gb: int = 2

    share_sign_secret: str = "change-me"

    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", extra="ignore")

settings = Settings()
```

### `app/middleware.py`
```python
import time, uuid, logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
logger = logging.getLogger("uvicorn.access")

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        request.state.request_id = rid
        return response

class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        t0 = time.time()
        resp: Response = await call_next(request)
        ms = int((time.time() - t0) * 1000)
        logger.info(
            f'{request.method} {request.url.path} {resp.status_code} {ms}ms rid={getattr(request.state,"request_id", "-")}'
        )
        return resp

class MaxBodyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int):
        super().__init__(app); self.max_bytes = max_bytes
    async def dispatch(self, request: Request, call_next):
        size = int(request.headers.get("content-length", "0") or 0)
        if size > self.max_bytes:
            from fastapi import HTTPException
            raise HTTPException(status_code=413, detail="Payload too large")
        return await call_next(request)
```

### `app/errors.py`
```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def install_exception_handlers(app):
    @app.exception_handler(StarletteHTTPException)
    async def http_exc(_, exc: StarletteHTTPException):
        return JSONResponse({"code": exc.status_code, "message": exc.detail}, status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def val_exc(_, exc: RequestValidationError):
        return JSONResponse({"code": 422, "message": "Validation failed", "details": exc.errors()}, status_code=422)

    @app.exception_handler(Exception)
    async def unhandled(req: Request, exc: Exception):
        return JSONResponse({"code": 500, "message": "Internal server error"}, status_code=500)
```

### `app/security.py`
```python
from fastapi import Header, HTTPException
from hmac import compare_digest
from .settings import settings

def require_bearer(authorization: str | None = Header(default=None)):
    if settings.dev_no_auth or not settings.api_token:
        return
    expected = f"Bearer {settings.api_token}"
    if not authorization or not compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")
```

### `app/routes/health.py`
```python
from fastapi import APIRouter
router = APIRouter(prefix="", tags=["health"])

@router.get("/livez")
def livez(): return {"ok": True}

@router.get("/readyz")
def readyz(): return {"ok": True}

@router.get("/")
def root(): return {"name": "your-app", "status": "ok"}
```

### `app/main.py`
```python
import logging
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

from .settings import settings
from .middleware import RequestIDMiddleware, AccessLogMiddleware, MaxBodyMiddleware
from .errors import install_exception_handlers
from .routes.health import router as health_router

def create_app() -> FastAPI:
    app = FastAPI(title="Your App", version="v1")

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(MaxBodyMiddleware, max_bytes=settings.request_max_bytes)
    if settings.allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    if not settings.debug:
        app.add_middleware(HTTPSRedirectMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or [],
        allow_methods=["GET","POST","PUT","DELETE","OPTIONS"],
        allow_headers=["*"],
        expose_headers=["x-request-id"],
    )

    install_exception_handlers(app)
    app.include_router(health_router, prefix="")
    return app
```

**Run**
```
uvicorn app.main:create_app --reload
```

**Acceptance for PR #1**
- Root, `/livez`, `/readyz` respond; logs have request_id; errors use `{code, message}`.

---

## PR #2 — Filesystem Jail, Atomic Writes, Soft‑Delete, Free‑Space Guard

### `app/paths.py`
```python
import os, shutil
from pathlib import Path
from fastapi import HTTPException
import psutil
from .settings import settings

WORKSPACE_ROOT = Path(settings.workspace_root).expanduser().resolve()

def _ensure_workspace():
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
_ensure_workspace()

def safe_in_workspace(p: Path) -> Path:
    rp = p.expanduser().resolve()
    try:
        rp.relative_to(WORKSPACE_ROOT)
    except ValueError:
        raise HTTPException(400, "Path outside workspace")
    return rp

def enforce_free_space_gb(min_gb: int | None = None):
    min_gb = min_gb or settings.free_space_min_gb
    usage = psutil.disk_usage(str(WORKSPACE_ROOT))
    free_gb = usage.free / 1_073_741_824
    if free_gb < min_gb:
        raise HTTPException(507, f"Insufficient storage, free {free_gb:.2f} GB < required {min_gb} GB")

def atomic_write_bytes(dest: Path, data: bytes):
    dest = safe_in_workspace(dest)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    tmp.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_bytes(data)
    tmp.replace(dest)

def soft_delete(target: Path) -> Path:
    target = safe_in_workspace(target)
    if not target.exists():
        return target
    trash = WORKSPACE_ROOT / ".trash"
    trash.mkdir(exist_ok=True)
    tomb = trash / f"{int(os.times().elapsed)}_{target.name}"
    shutil.move(str(target), str(tomb))
    return tomb

MEDIA_EXTS = {".jpg",".jpeg",".png",".gif",".webp",".mp4",".mov",".mkv",".avi",".mp3",".wav",".m4a",".flac"}

def is_allowed_media(p: Path) -> bool:
    return p.suffix.lower() in MEDIA_EXTS
```

### Example guarded route pattern
```python
from pathlib import Path
from fastapi import APIRouter
from ..paths import safe_in_workspace, enforce_free_space_gb, soft_delete, is_allowed_media, WORKSPACE_ROOT

router = APIRouter(prefix="/api/v1/files", tags=["files"])

@router.delete("")
def delete_file(path: str):
    p = safe_in_workspace(Path(path))
    tomb = soft_delete(p)
    return {"deleted": True, "moved_to": str(tomb.relative_to(WORKSPACE_ROOT))}
```

### Property tests (safety)
`tests/property/test_path_safety.py`
```python
from pathlib import Path
import pytest
from app.paths import safe_in_workspace, WORKSPACE_ROOT
from fastapi import HTTPException

def test_workspace_accepts_inside(tmp_path, monkeypatch):
    monkeypatch.setattr("app.paths.WORKSPACE_ROOT", tmp_path.resolve())
    inside = tmp_path / "a" / "b"
    inside.mkdir(parents=True)
    assert safe_in_workspace(inside) == inside.resolve()

@pytest.mark.parametrize("bad", ["../../etc", "/etc/passwd", "../outside", "~/../.."])
def test_workspace_rejects_outside(tmp_path, monkeypatch, bad):
    monkeypatch.setattr("app.paths.WORKSPACE_ROOT", tmp_path.resolve())
    with pytest.raises(HTTPException):
        safe_in_workspace(Path(bad))
```

**Acceptance for PR #2**
- Escape attempts fail; deletes move to `.trash`; low disk returns 507; writes are atomic.

---

## Remaining PRs (Outline)

3) **Security & metrics:** bearer dep on mutating routes, `/metrics`, audit JSONL.

4) **Routers + schemas:** extract 2–3 domains from `server.py` into `routes/` and `schemas/`, preserve behavior.

5) **Deps + services:** `deps.py` for directory/provider/store; move logic out of routers.

6) **Search unification:** `SearchEngine`, `query_expr.py`, `search_cache.py`, golden tests.

7) **Jobs & backpressure:** executor with bounded queue, job ids, idempotency keys, status route.

8) **Share hardening:** share_id only, signed URLs, constant‑time password, per‑IP/token limits.

9) **Remaining domains:** faces, trips, captions, library; LRU meta; pagination clamps.

10) **Prune & polish:** remove legacy routes or 410, ETag/If‑None‑Match, ORJSON, OpenAPI summaries, CI gates.

---

## Done‑Done Checklist

- [/ ] `/api/v1/*` only; legacy routes removed/410.
- [/ ] Uniform error envelope everywhere.
- [/ ] Rate limits on heavy routes; job offload; idempotency enforced.
- [/ ] Workspace jail + soft‑delete + atomic writes verified by property tests.
- [/ ] Unified search, cached, golden‑tested.
- [/ ] Metrics & audit logs useful; ETag on heavy GETs.
- [/ ] CI blocks merges on style, types, coverage, stress smoke.

