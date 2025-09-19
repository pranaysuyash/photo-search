from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, TypeVar

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel

from adapters.provider_factory import get_provider
from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from infra.index_store import IndexStore
from infra.collections import load_collections, save_collections, load_smart_collections, save_smart_collections
from infra.tags import load_tags, save_tags, all_tags
from usecases.manage_saved import load_saved, save_saved
from usecases.manage_presets import load_presets, save_presets
from infra.analytics import log_search, log_feedback
from infra.dupes import find_lookalikes, load_resolved, save_resolved, _group_id  # type: ignore
from infra.thumbs import get_or_create_thumb, get_or_create_face_thumb
from infra.faces import build_faces as _build_faces, list_clusters as _face_list, set_cluster_name as _face_name, photos_for_person as _face_photos, load_faces as _faces_load
from infra.trips import build_trips as _build_trips, load_trips as _load_trips
from infra.edits import apply_ops as _edit_apply_ops, upscale as _edit_upscale, EditOps as _EditOps
from adapters.vlm_caption_hf import VlmCaptionHF
# Optional video support (OpenCV). Endpoints will guard if unavailable.
try:
    from adapters.video_scanner import list_videos  # type: ignore
    from adapters.video_processor import extract_video_thumbnail, get_video_metadata  # type: ignore
    from infra.video_index_store import VideoIndexStore  # type: ignore
    _VIDEO_OK = True
except Exception:
    _VIDEO_OK = False
from infra.analytics import _analytics_file
from infra.shares import (
    create_share as _share_create,
    load_share as _share_load,
    list_shares as _share_list,
    revoke_share as _share_revoke,
    is_expired as _share_expired,
)
import shutil, os, platform
import json
import time
import logging

from PIL import Image, ExifTags
from infra.watcher import WatchManager
from domain.models import SUPPORTED_EXTS


app = FastAPI(title="Photo Search – Intent-First API")
_START_TIME = time.time()

# CORS / Origin policy – prefer explicit local origins when possible
_allowed_origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://0.0.0.0:8000",  # Add this for when backend runs on 0.0.0.0
    "app://local",  # Electron packaged build origin when using the custom protocol
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _write_event(index_dir: Path, event: Dict[str, Any]) -> None:
    try:
        f = _analytics_file(index_dir)
        f.parent.mkdir(parents=True, exist_ok=True)
        with open(f, 'a', encoding='utf-8') as fh:
            fh.write(json.dumps(event) + "\n")
    except Exception:
        pass


T = TypeVar("T")


def _from_body(
    body: Optional[Mapping[str, Any]],
    current: Optional[T],
    key: str,
    *,
    default: Optional[T] = None,
    cast: Optional[Callable[[Any], T]] = None,
) -> Optional[T]:
    """Prefer query parameters, but fall back to JSON body/defaults."""

    if current is not None:
        return current
    if body is not None and key in body:
        value = body[key]
        if value is None:
            return default
        if cast is not None:
            try:
                return cast(value)
            except Exception:
                return default
        return value  # type: ignore[return-value]
    return default


def _require(value: Optional[T], name: str) -> T:
    if value is None:
        raise HTTPException(status_code=422, detail=f"Missing required field: {name}")
    return value


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        val = value.strip().lower()
        if val in {"1", "true", "yes", "y", "on"}:
            return True
        if val in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _as_str_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if value is None:
        return []
    return [str(value)]

# Static frontend serving
# Prefer the built React app (webapp/dist) when present; otherwise fall back to api/web demo.
_root = Path(__file__).resolve().parent
_candidates = [
    _root.parent / "webapp" / "dist",
    _root / "web",
]
_static = next((p for p in _candidates if p.exists()), None)
if _static is not None:
    # Mount UI under /app to avoid shadowing API routes like /workspace, /tags, etc.
    app.mount("/app", StaticFiles(directory=str(_static), html=True), name="static")
    # Also mount assets at /assets because Vite production build references absolute "/assets/..." URLs
    assets_dir = _static / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir), html=False), name="assets")

    # Redirect root to /app for convenience
    from fastapi.responses import RedirectResponse

    @app.get("/")
    def _root_redirect():
        return RedirectResponse(url="/app/")
else:
    # When frontend build is missing, serve a minimal helper page at root
    @app.get("/", response_class=HTMLResponse)
    def _root_fallback() -> HTMLResponse:
        html = """
<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Photo Search API</title>
    <style> body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; line-height: 1.5; } code, pre { background:#f5f5f7; padding: 2px 4px; border-radius: 4px; } .tip{color:#555} </style>
  </head>
  <body>
    <h1>Photo Search – API</h1>
    <p>The frontend build was not found. You can still use the API and docs.</p>
    <ul>
      <li>Open API docs: <a href=\"/docs\">/docs</a></li>
      <li>Build the web app: <pre>cd photo-search-intent-first/webapp\nnpm i\nnpm run build</pre></li>
      <li>Then reload this page to serve the UI from <code>/app/</code>.</li>
    </ul>
    <p class=\"tip\">Tip: Configure auth with <code>API_TOKEN</code>. The web UI reads <code>VITE_API_TOKEN</code> or <code>localStorage.api_token</code>.</p>
  </body>
 </html>
        """
        return HTMLResponse(content=html)


# Health check for webapp offline/online detection
@app.get("/api/ping")
def api_ping() -> Dict[str, Any]:
    return {"ok": True}


@app.post("/monitoring")
@app.post("/api/monitoring")
async def api_monitoring(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Accept monitoring payloads from the Electron/web client.

    The current implementation just acknowledges receipt so the frontend
    background flushes don't surface 404 noise in the console when running
    offline. In the future we can persist or forward these reports.
    """
    # TODO: Persist metrics/events once a storage backend is in place.
    return {"ok": True, "received": bool(payload)}


@app.get("/monitoring")
@app.get("/api/monitoring")
def api_monitoring_get() -> Dict[str, Any]:
    """Lightweight monitoring health check endpoint for connection testing."""
    return {"ok": True, "uptime_seconds": round(max(0.0, time.time() - _START_TIME), 3)}


@app.get("/health")
@app.get("/api/health")
def api_health(dir: Optional[str] = None) -> Dict[str, Any]:
    """Lightweight health endpoint for monitoring integrations."""

    info: Dict[str, Any] = {
        "ok": True,
        "uptime_seconds": round(max(0.0, time.time() - _START_TIME), 3),
    }

    if dir:
        try:
            folder = Path(dir)
            store = IndexStore(folder)
            index_dir = store.index_dir
            info["index_dir"] = str(index_dir)
            info["index_exists"] = index_dir.exists()
        except Exception:
            info["index_exists"] = False

    return info

# Demo directory locator (for onboarding/empty states)
@app.get("/demo/dir")
def api_demo_dir() -> Dict[str, Any]:
    """Return a local demo photos directory if available.

    Tries common locations within the repo: photo-search-intent-first/demo_photos and e2e_data.
    """
    try:
        here = Path(__file__).resolve()
        repo_root = here.parents[2]
        candidates = [
            repo_root / "photo-search-intent-first" / "demo_photos",
            repo_root / "e2e_data",
        ]
        for p in candidates:
            if p.exists() and p.is_dir():
                # Return absolute path string for the client to use
                return {"ok": True, "dir": str(p.resolve())}
        return {"ok": False}
    except Exception:
        return {"ok": False}



def _normcase_path(path: str) -> str:
    """Normalize a path string for deduplication across platforms."""
    try:
        expanded = os.path.expanduser(path)
    except Exception:
        expanded = path
    try:
        resolved = Path(expanded).resolve()
        target = str(resolved)
    except Exception:
        try:
            target = os.path.abspath(expanded)
        except Exception:
            target = expanded
    return os.path.normcase(target)


def _scan_media_counts(paths: List[str], include_videos: bool = True) -> Dict[str, Any]:
    """Calculate media counts for a list of filesystem paths."""
    import os as _os
    from pathlib import Path as _P

    img_exts = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".tif",
        ".tiff",
        ".bmp",
        ".heic",
        ".heif",
        ".avif",
    }
    vid_exts = {".mp4", ".mov", ".mkv", ".avi", ".webm"}
    valid_exts = set(img_exts) | (set(vid_exts) if include_videos else set())
    items: List[Dict[str, Any]] = []
    total_files = 0
    total_bytes = 0
    for raw in paths or []:
        try:
            expanded = _os.path.expanduser(raw)
            p = _P(expanded).resolve()
        except Exception:
            items.append({"path": raw, "exists": False, "files": 0, "bytes": 0})
            continue
        if not p.exists():
            items.append({"path": str(p), "exists": False, "files": 0, "bytes": 0})
            continue
        count = 0
        size = 0
        try:
            for root, dirs, files in _os.walk(p):
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                for name in files:
                    ext = _P(name).suffix.lower()
                    if ext in valid_exts:
                        count += 1
                        try:
                            size += (_P(root) / name).stat().st_size
                        except Exception:
                            pass
                if count >= 50000:
                    break
        except Exception:
            count = count
            size = size
        items.append({"path": str(p), "exists": True, "files": count, "bytes": size})
        total_files += count
        total_bytes += size
    return {"items": items, "total_files": total_files, "total_bytes": total_bytes}


def _default_photo_dir_candidates() -> List[Dict[str, str]]:
    """Discover common photo directories for the current platform."""
    home = Path.home()
    sysname = platform.system().lower()
    candidates: List[Dict[str, str]] = []

    def _add(path: Path, label: str, source: str) -> None:
        try:
            if not path:
                return
            candidates.append(
                {"path": str(path.expanduser()), "label": label, "source": source}
            )
        except Exception:
            pass

    core_dirs = [
        home / "Pictures",
        home / "Photos",
        home / "DCIM",
        home / "Downloads",
        home / "Desktop",
        home / "Documents" / "Screenshots",
    ]
    core_labels = {
        "Pictures": "Pictures",
        "Photos": "Photos",
        "DCIM": "Camera Uploads",
        "Downloads": "Downloads",
        "Desktop": "Desktop",
        "Screenshots": "Screenshots",
    }
    for path in core_dirs:
        label = core_labels.get(path.name, path.name)
        _add(path, label, "home")

    if "windows" in sysname:
        pictures = home / "Pictures"
        _add(pictures / "Saved Pictures", "Saved Pictures", "windows")
        _add(pictures / "Camera Roll", "Camera Roll", "windows")
        one_drive_env = os.environ.get("OneDrive")
        if one_drive_env:
            _add(Path(one_drive_env) / "Pictures", "OneDrive Pictures", "onedrive")
        try:
            for entry in home.glob("OneDrive*"):
                if entry.is_dir():
                    _add(entry / "Pictures", f"{entry.name} Pictures", "onedrive")
        except Exception:
            pass
        public_dir = os.environ.get("PUBLIC")
        if public_dir:
            _add(Path(public_dir) / "Pictures", "Public Pictures", "windows")

    if "darwin" in sysname:
        icloud_docs = home / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
        _add(icloud_docs / "Photos", "iCloud Drive Photos", "icloud")
        _add(icloud_docs / "Pictures", "iCloud Drive Pictures", "icloud")
        _add(
            home / "Library" / "CloudStorage" / "iCloud Drive" / "Photos",
            "iCloud Photos",
            "icloud",
        )

    if "linux" in sysname:
        user_dirs = home / ".config" / "user-dirs.dirs"
        try:
            text = user_dirs.read_text(encoding="utf-8")
            for line in text.splitlines():
                if line.startswith("XDG_PICTURES_DIR") or line.startswith("XDG_DOWNLOAD_DIR"):
                    parts = line.split("=")
                    if len(parts) == 2:
                        raw = parts[1].strip().strip('"')
                        resolved = raw.replace("$HOME", str(home))
                        label = "Pictures" if "PICTURES" in parts[0] else "Downloads"
                        _add(Path(resolved), label, "xdg")
        except Exception:
            pass

    seen: set[str] = set()
    unique: List[Dict[str, str]] = []
    for item in candidates:
        key = _normcase_path(item["path"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


@app.get("/library/defaults")
def api_library_defaults(include_videos: bool = True) -> Dict[str, Any]:
    """Return likely local photo folders with media counts."""
    candidates = _default_photo_dir_candidates()
    if not candidates:
        return {"items": [], "total_files": 0, "total_bytes": 0}

    counts = _scan_media_counts([c["path"] for c in candidates], include_videos)
    label_map = {}
    for item in candidates:
        key = _normcase_path(item["path"])
        label_map.setdefault(key, item)

    enriched = []
    for entry in counts.get("items", []):
        info = label_map.get(_normcase_path(entry.get("path", "")))
        data = dict(entry)
        if info:
            data["label"] = info.get("label")
            data["source"] = info.get("source")
        enriched.append(data)

    counts["items"] = enriched
    return counts


# Auth status (dev helper)
@app.get("/auth/status")
def api_auth_status() -> Dict[str, Any]:
    """Return whether the API currently requires an auth token.

    Note: Does not reveal the token. Useful for diagnosing 401s in dev.
    """
    return {"auth_required": (not _DEV_NO_AUTH) and bool(_API_TOKEN)}

@app.post("/auth/check")
def api_auth_check() -> Dict[str, Any]:
    """POST endpoint that succeeds only if Authorization is accepted.

    Useful for quickly verifying client token configuration in development.
    """
    return {"ok": True}

# Watchers (optional)
_WATCH = WatchManager()

@app.get("/watch/status")
def api_watch_status() -> Dict[str, Any]:
    return {"available": _WATCH.available()}


# Sharing APIs
@app.post("/share")
def api_share(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    paths: Optional[List[str]] = None,
    expiry_hours: Optional[int] = None,
    password: Optional[str] = None,
    view_only: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    expiry_value = _from_body(body, expiry_hours, "expiry_hours", default=24, cast=lambda v: int(v))
    password_value = _from_body(body, password, "password")
    view_only_value = _from_body(body, view_only, "view_only", default=True, cast=_as_bool)

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    try:
        rec = _share_create(
            str(folder),
            provider_value or "local",
            [str(p) for p in paths_value],
            expiry_hours=expiry_value,
            password=password_value,
            view_only=bool(view_only_value),
        )
        url = f"/share/{rec.token}/view"
        return {"ok": True, "token": rec.token, "url": url, "expires": rec.expires}
    except Exception as e:
        raise HTTPException(500, f"Create share failed: {e}")


@app.get("/share")
def api_share_list(dir: Optional[str] = None) -> Dict[str, Any]:
    try:
        items = _share_list(dir_filter=dir)
        out: List[Dict[str, Any]] = []
        for it in items:
            out.append({
                "token": it.token,
                "created": it.created,
                "expires": it.expires,
                "dir": it.dir,
                "provider": it.provider,
                "count": len(it.paths or []),
                "view_only": bool(it.view_only),
                "expired": _share_expired(it),
            })
        return {"shares": out}
    except Exception:
        return {"shares": []}


@app.post("/share/revoke")
def api_share_revoke(
    token: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    token_value = _require(_from_body(body, token, "token"), "token")
    ok = False
    try:
        ok = _share_revoke(str(token_value))
    except Exception:
        ok = False
    return {"ok": bool(ok)}


@app.get("/share/detail")
def api_share_detail(token: str, password: Optional[str] = None) -> Dict[str, Any]:
    """Return share record details; if password protected, require matching password."""
    try:
        rec = _share_load(str(token))
        if rec is None:
            raise HTTPException(404, "Share not found")
        if _share_expired(rec):
            return {"ok": False, "error": "expired"}
        # Password validation
        from infra.shares import validate_password as _share_validate
        if not _share_validate(rec, password):
            return {"ok": False, "error": "password_required"}
        return {
            "ok": True,
            "token": rec.token,
            "created": rec.created,
            "expires": rec.expires,
            "dir": rec.dir,
            "provider": rec.provider,
            "paths": rec.paths,
            "view_only": bool(rec.view_only),
            "has_password": bool(rec.pass_hash),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Share detail failed: {e}")


@app.get("/share/{token}/view", response_class=HTMLResponse)
def api_share_view(token: str) -> HTMLResponse:
    """Minimal share viewer page. Client fetches /share/detail and renders thumbs."""
    # Simple HTML with inline script
    html = f"""
<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Shared Photos</title>
    <style>
      body {{ font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b0c; color: #e5e7eb; }}
      header {{ padding: 12px 16px; border-bottom: 1px solid #1f2937; display: flex; align-items: center; justify-content: space-between; }}
      .container {{ padding: 16px; }}
      .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }}
      .card {{ position: relative; border: 1px solid #1f2937; border-radius: 8px; overflow: hidden; background: #111827; }}
      .card img {{ width: 100%; height: 140px; object-fit: cover; display: block; }}
      .pill {{ font-size: 12px; padding: 2px 6px; border-radius: 999px; background: #1f2937; color: #9ca3af; margin-left: 8px; }}
      input, button {{ font: inherit; }}
      .row {{ display: flex; align-items: center; gap: 8px; }}
      .row > * {{ margin-right: 8px; }}
    </style>
  </head>
  <body>
    <header>
      <div class=\"row\">
        <div>Shared Photos</div>
        <span id=\"meta\" class=\"pill\"></span>
      </div>
      <div class=\"row\">
        <input id=\"pw\" type=\"password\" placeholder=\"Password (if required)\" style=\"background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:6px;padding:6px 8px;\" />
        <button id=\"openBtn\" style=\"background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;\">Open</button>
      </div>
    </header>
    <div class=\"container\">
      <div id=\"err\" style=\"color:#fca5a5;display:none;margin:8px 0;\"></div>
      <div id=\"grid\" class=\"grid\"></div>
    </div>
    <script>
      const token = {token!r};
      const meta = document.getElementById('meta');
      const grid = document.getElementById('grid');
      const err = document.getElementById('err');
      const pw = document.getElementById('pw');
      const openBtn = document.getElementById('openBtn');

      async function load() {{
        err.style.display = 'none';
        const qs = new URLSearchParams({{ token: token }});
        const xpw = pw.value.trim();
        if (xpw) qs.set('password', xpw);
        const r = await fetch(`/share/detail?${{qs}}`);
        if (!r.ok) {{ err.textContent = 'Failed to load share'; err.style.display='block'; return; }}
        const data = await r.json();
        if (!data.ok) {{
          if (data.error === 'password_required') {{ err.textContent = 'Password required or incorrect'; err.style.display='block'; return; }}
          if (data.error === 'expired') {{ err.textContent = 'This link has expired'; err.style.display='block'; return; }}
          err.textContent = 'Unable to open share'; err.style.display='block'; return;
        }}
        meta.textContent = `${{data.paths.length}} items${{data.expires ? ' • expires ' + new Date(data.expires).toLocaleString() : ''}}`;
        grid.innerHTML = '';
        const dir = data.dir;
        const viewOnly = !!data.view_only;
        for (const p of data.paths) {{
          const url = `/thumb?dir=${{encodeURIComponent(dir)}}&path=${{encodeURIComponent(p)}}&size=256`;
          const card = document.createElement('div');
          card.className = 'card';
          const img = document.createElement('img');
          img.src = url; img.alt = 'photo';
          card.appendChild(img);
          if (!viewOnly) {{
            img.style.cursor = 'pointer';
            img.title = 'Open';
            img.addEventListener('click', ()=> window.open(url, '_blank'));
          }}
          grid.appendChild(card);
        }}
      }}
      openBtn.addEventListener('click', load);
      // Auto-load if no password
      load();
    </script>
  </body>
</html>
    """
    return HTMLResponse(content=html)


# Load .env file (if present) so OPENAI_API_KEY/HF_API_TOKEN are available when not passed explicitly
def _load_env_file() -> None:
    try:
        repo_root = Path(__file__).resolve().parents[2]
        env_path = repo_root / ".env"
        if not env_path.exists():
            return
        for raw in env_path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            key = k.strip()
            val = v.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except Exception:
        # Non-fatal; continue without .env values
        pass

_load_env_file()

# Optional ephemeral auth token – when set, enforce on write endpoints
_API_TOKEN = os.environ.get("API_TOKEN", "").strip() or None
# Development bypass: when enabled, skip auth even if API_TOKEN is set
_DEV_NO_AUTH = (os.environ.get("DEV_NO_AUTH", "").strip() == "1") or (
    os.environ.get("ENV", "").strip().lower() in ("dev", "development")
)

_API_LOG_LEVEL = os.environ.get("API_LOG_LEVEL", "").strip().lower()
_LOG_HTTP = _API_LOG_LEVEL in {"debug", "info"}
_http_logger: Optional[logging.Logger] = None
if _LOG_HTTP:
    _http_logger = logging.getLogger("photo_search.api")
    if not _http_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        _http_logger.addHandler(handler)
    _http_logger.setLevel(logging.DEBUG if _API_LOG_LEVEL == "debug" else logging.INFO)

@app.middleware("http")
async def _auth_middleware(request, call_next):
    path = str(request.url.path or "")
    loggable = not path.startswith(("/assets", "/app"))
    start_ns = time.perf_counter_ns() if _LOG_HTTP and loggable else None
    response: Optional[Response] = None
    try:
        # Skip in development or if no token configured
        if _DEV_NO_AUTH or not _API_TOKEN:
            response = await call_next(request)
            return response
        # Allow static assets and share viewer endpoints without auth
        if (
            path.startswith("/app")
            or path.startswith("/assets")
            or path.startswith("/share/")
            or path in {"/api/ping", "/scan_count", "/monitoring", "/api/monitoring"}
        ):
            response = await call_next(request)
            return response
        # Enforce Authorization for mutating methods
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            auth = request.headers.get("authorization") or request.headers.get("Authorization")
            if not auth or auth != f"Bearer {_API_TOKEN}":
                response = JSONResponse(status_code=401, content={"detail": "Unauthorized"})
                return response
        response = await call_next(request)
        return response
    except Exception:
        # Fail open (but log) if middleware raises unexpectedly
        try:
            response = await call_next(request)
            return response
        except Exception:
            response = JSONResponse(status_code=500, content={"detail": "Server error"})
            return response
    finally:
        if _LOG_HTTP and loggable and start_ns is not None and _http_logger is not None:
            duration_ms = (time.perf_counter_ns() - start_ns) / 1_000_000
            status = getattr(response, "status_code", "error")
            _http_logger.info(
                "%s %s -> %s %.2fms",
                request.method,
                path,
                status,
                duration_ms,
            )

# Exclude patterns per directory (privacy filters)
@app.get("/settings/excludes")
def api_get_excludes(dir: str) -> Dict[str, Any]:
    folder = Path(dir)
    cfg = folder / ".photo_index" / "excludes.json"
    try:
        if cfg.exists():
            data = json.loads(cfg.read_text(encoding='utf-8'))
            pats = data.get('patterns') or []
            return {"patterns": [str(p) for p in pats]}
    except Exception:
        pass
    return {"patterns": []}


class ExcludeReq(BaseModel):
    dir: str
    patterns: list[str] = []


@app.post("/settings/excludes")
def api_set_excludes(req: ExcludeReq) -> Dict[str, Any]:
    folder = Path(req.dir)
    try:
        p = folder / ".photo_index"
        p.mkdir(parents=True, exist_ok=True)
        cfg = p / "excludes.json"
        cfg.write_text(json.dumps({"patterns": req.patterns}, indent=2), encoding='utf-8')
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save excludes: {e}")

# Config settings (for env vars like PHOTOVAULT_MODEL_DIR)
class ConfigSetReq(BaseModel):
    key: str
    value: str


@app.post("/config/set")
def api_config_set(req: ConfigSetReq) -> Dict[str, Any]:
    try:
        # Set in process environment for immediate effect
        os.environ[req.key] = req.value
        return {"ok": True, "key": req.key, "value": req.value}
    except Exception as e:
        raise HTTPException(500, f"Failed to set config: {e}")


# Removed deprecated developer-only TODO endpoint


def _emb(provider: str, hf_token: Optional[str], openai_key: Optional[str], st_model: Optional[str] = None,
         tf_model: Optional[str] = None, hf_model: Optional[str] = None) -> Any:
    return get_provider(provider, hf_token=hf_token, openai_api_key=openai_key, st_model=st_model, tf_model=tf_model, hf_model=hf_model)


class IndexRequest(BaseModel):
    dir: str
    provider: str = "local"
    batch_size: int = 32
    hf_token: Optional[str] = None
    openai_key: Optional[str] = None

@app.post("/index")
def api_index(req: IndexRequest) -> Dict[str, Any]:
    folder = Path(req.dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(req.provider, req.hf_token, req.openai_key)
    new_c, upd_c, total = index_photos(folder, batch_size=req.batch_size, embedder=emb)
    try:
        _write_event(IndexStore(folder, index_key=getattr(emb,'index_id',None)).index_dir, {
            'type': 'index',
            'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'new': int(new_c), 'updated': int(upd_c), 'total': int(total)
        })
    except Exception:
        pass
    return {"new": new_c, "updated": upd_c, "total": total}


class WatchReq(BaseModel):
    dir: str
    provider: str = "local"
    debounce_ms: int = 1500
    batch_size: int = 12


@app.post("/watch/start")
def api_watch_start(req: WatchReq) -> Dict[str, Any]:
    if not _WATCH.available():
        raise HTTPException(400, "watchdog not available")
    folder = Path(req.dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(req.provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))

    def on_batch(paths: set[str]) -> None:
        try:
            wanted = [p for p in paths if str(p).lower().endswith(tuple(SUPPORTED_EXTS))]
            if not wanted:
                return
            store.upsert_paths(emb, wanted, batch_size=max(1, int(req.batch_size)))
        except Exception:
            pass

    ok = _WATCH.start(folder, on_batch, exts=set(SUPPORTED_EXTS), debounce_ms=max(500, int(req.debounce_ms)))
    if not ok:
        raise HTTPException(500, "Failed to start watcher")
    return {"ok": True}


@app.post("/watch/stop")
def api_watch_stop(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    folder = Path(dir_value)
    _WATCH.stop(folder)
    return {"ok": True}


# Model management (minimal)
@app.get("/models/capabilities")
def api_models_capabilities() -> Dict[str, Any]:
    caps: Dict[str, Any] = {"transformers": False, "torch": False, "cuda": False, "mps": False}
    try:
        import torch  # type: ignore
        caps["torch"] = True
        caps["cuda"] = bool(getattr(torch, "cuda", None) and torch.cuda.is_available())
        mps = getattr(getattr(torch, "backends", None), "mps", None)
        caps["mps"] = bool(mps and mps.is_available())
    except Exception:
        pass
    try:
        import transformers  # type: ignore
        caps["transformers"] = True
    except Exception:
        pass
    return {"ok": True, "capabilities": caps}


class ModelDownloadReq(BaseModel):
    model: str = "openai/clip-vit-base-patch32"


@app.post("/models/download")
def api_models_download(req: ModelDownloadReq) -> Dict[str, Any]:
    try:
        from transformers import AutoProcessor, CLIPModel  # type: ignore
        _ = AutoProcessor.from_pretrained(req.model)
        _ = CLIPModel.from_pretrained(req.model)
        return {"ok": True, "model": req.model}
    except Exception as e:
        raise HTTPException(500, f"Model download failed: {e}")


class ModelValidateReq(BaseModel):
    dir: str


@app.post("/models/validate")
def api_models_validate(req: ModelValidateReq) -> Dict[str, Any]:
    """Validate CLIP models in a directory for offline use."""
    try:
        model_dir = Path(req.dir)
        if not model_dir.exists():
            return {"ok": False, "error": "Directory not found"}

        # Check for CLIP model components
        required_files = [
            "config.json",
            "pytorch_model.bin",  # or model.safetensors
            "preprocessor_config.json"
        ]

        optional_files = [
            "model.safetensors",
            "tokenizer.json",
            "vocab.json",
            "merges.txt",
            "special_tokens_map.json",
            "tokenizer_config.json"
        ]

        found_required = []
        found_optional = []
        missing_required = []

        # Check required files
        for filename in required_files:
            if (model_dir / filename).exists():
                found_required.append(filename)
            else:
                missing_required.append(filename)

        # Check for alternative model file
        if "pytorch_model.bin" not in found_required:
            if (model_dir / "model.safetensors").exists():
                found_required.append("model.safetensors")
            else:
                if "pytorch_model.bin" not in missing_required:
                    missing_required.append("pytorch_model.bin")

        # Check optional files
        for filename in optional_files:
            if (model_dir / filename).exists():
                found_optional.append(filename)

        # Determine if model is valid
        is_valid = len(missing_required) == 0

        # Try to extract model info from config
        model_info = {}
        config_path = model_dir / "config.json"
        if config_path.exists():
            try:
                import json
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    model_info = {
                        "model_type": config.get("model_type", "unknown"),
                        "hidden_size": config.get("hidden_size"),
                        "num_attention_heads": config.get("num_attention_heads"),
                        "num_hidden_layers": config.get("num_hidden_layers"),
                        "vocab_size": config.get("vocab_size")
                    }
            except Exception:
                pass

        return {
            "ok": True,
            "valid": is_valid,
            "model_dir": str(model_dir),
            "model_info": model_info,
            "found_required": found_required,
            "found_optional": found_optional,
            "missing_required": missing_required,
            "message": "Model validation complete"
        }

    except Exception as e:
        return {"ok": False, "error": f"Validation failed: {str(e)}"}


@app.post("/data/nuke")
def api_data_nuke(
    dir: Optional[str] = None,
    all: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    try:
        wipe_all = _from_body(body, all, "all", default=False, cast=_as_bool) or False
        if wipe_all:
            base = os.environ.get("PS_APPDATA_DIR", "").strip()
            if base:
                bp = Path(base).expanduser().resolve()
                if bp.exists() and bp.is_dir() and str(bp) not in ("/", str(Path.home())):
                    shutil.rmtree(bp)
                    return {"ok": True, "cleared": str(bp)}
                else:
                    raise HTTPException(400, "Unsafe app data path")
            else:
                raise HTTPException(400, "PS_APPDATA_DIR not set")
        dir_value = _from_body(body, dir, "dir")
        if not dir_value:
            raise HTTPException(400, "dir required unless all=1")
        folder = Path(dir_value)
        emb = _emb("local", None, None)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        idx = store.index_dir
        if idx.exists() and idx.is_dir():
            shutil.rmtree(idx)
        return {"ok": True, "cleared": str(idx)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to clear data: {e}")


@app.get("/index/status")
def api_index_status(dir: str, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    status_file = store.index_dir / 'index_status.json'
    ctrl_file = store.index_dir / 'index_control.json'
    if not status_file.exists():
        # Provide a minimal snapshot from diagnostics as fallback
        try:
            store.load()
            return {
                'state': 'idle',
                'total': len(store.state.paths or []),
            }
        except Exception:
            return { 'state': 'idle' }
    try:
        data = json.loads(status_file.read_text(encoding='utf-8'))
        # Enrich with index health
        try:
            store.load()
            indexed = len(store.state.paths or [])
            data['indexed'] = int(indexed)
            tgt = int(data.get('target') or 0)
            if tgt > 0:
                cov = max(0.0, min(1.0, float(indexed) / float(tgt)))
                data['coverage'] = cov
                data['drift'] = max(0, int(tgt - indexed))
            # last index time from analytics log
            try:
                p = _analytics_file(store.index_dir)
                if p.exists():
                    for ln in reversed(p.read_text(encoding='utf-8').splitlines()):
                        try:
                            ev = json.loads(ln)
                            if ev.get('type') == 'index' and ev.get('time'):
                                data['last_index_time'] = ev.get('time')
                                break
                        except Exception:
                            continue
            except Exception:
                pass
        except Exception:
            pass
        if ctrl_file.exists():
            try:
                cfg = json.loads(ctrl_file.read_text(encoding='utf-8'))
                if bool(cfg.get('pause')):
                    data['state'] = 'paused'
                    data['paused'] = True
            except Exception:
                pass
        return data
    except Exception:
        return { 'state': 'unknown' }


@app.post("/index/pause")
def api_index_pause(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    store = IndexStore(Path(dir_value))
    p = store.index_dir / 'index_control.json'
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(json.dumps({ 'pause': True }))
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f"Pause failed: {e}")


@app.post("/index/resume")
def api_index_resume(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    store = IndexStore(Path(dir_value))
    p = store.index_dir / 'index_control.json'
    try:
        if p.exists():
            p.unlink()
        return { 'ok': True }
    except Exception as e:
        raise HTTPException(500, f"Resume failed: {e}")


@app.post("/search/cached")
def api_search_cached(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    cache_key: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    use_fast: Optional[bool] = None,
    fast_kind: Optional[str] = None,
    use_captions: Optional[bool] = None,
    use_ocr: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Cached search that reuses previous results when possible."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    cache_key_value = _from_body(body, cache_key, "cache_key")
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")
    use_fast_value = _from_body(body, use_fast, "use_fast", default=False, cast=_as_bool) or False
    fast_kind_value = _from_body(body, fast_kind, "fast_kind")
    use_captions_value = _from_body(body, use_captions, "use_captions", default=False, cast=_as_bool) or False
    use_ocr_value = _from_body(body, use_ocr, "use_ocr", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Generate cache key if not provided
    cache_key = cache_key_value
    if not cache_key:
        import hashlib
        cache_key = hashlib.md5(
            f"{query_value}:{top_k_value}:{provider_value}:{use_fast_value}:{fast_kind_value}:{use_captions_value}:{use_ocr_value}".encode()
        ).hexdigest()

    store = IndexStore(folder, index_key=None)
    cache_file = store.index_dir / f"search_cache_{cache_key}.json"

    # Try to load from cache first
    if cache_file.exists():
        try:
            cache_data = json.loads(cache_file.read_text())
            cache_time = cache_data.get('timestamp', 0)
            # Cache valid for 1 hour
            if time.time() - cache_time < 3600:
                cached_result = cache_data['results']
                cached_result['cached'] = True
                return cached_result
        except Exception:
            pass  # Fall through to fresh search

    # Perform fresh search using the main search logic
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    if use_fast_value:
        try:
            if fast_kind_value and fast_kind_value.lower() == 'faiss' and store.faiss_status().get('exists'):
                results = store.search_faiss(emb, query_value, top_k=top_k_value)
            elif fast_kind_value and fast_kind_value.lower() == 'hnsw' and store.hnsw_status().get('exists'):
                results = store.search_hnsw(emb, query_value, top_k=top_k_value)
            elif fast_kind_value and fast_kind_value.lower() == 'annoy' and store.ann_status().get('exists'):
                results = store.search_annoy(emb, query_value, top_k=top_k_value)
            else:
                if store.faiss_status().get('exists'):
                    results = store.search_faiss(emb, query_value, top_k=top_k_value)
                elif store.hnsw_status().get('exists'):
                    results = store.search_hnsw(emb, query_value, top_k=top_k_value)
                elif store.ann_status().get('exists'):
                    results = store.search_annoy(emb, query_value, top_k=top_k_value)
                else:
                    results = store.search(emb, query_value, top_k=top_k_value)
        except Exception:
            results = store.search(emb, query_value, top_k=top_k_value)
    else:
        if use_captions_value and store.captions_available():
            results = store.search_with_captions(emb, query_value, top_k=top_k_value)
        elif use_ocr_value and store.ocr_available():
            results = store.search_with_ocr(emb, query_value, top_k=top_k_value)
        else:
            results = store.search(emb, query_value, top_k=top_k_value)

    out = results
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query_value, [(str(r.path), float(r.score)) for r in out])

    result_data = {
        "search_id": sid,
        "results": [{"path": str(r.path), "score": float(r.score)} for r in out],
        "cached": False,
        "cache_key": cache_key
    }

    # Cache the results
    try:
        cache_data = {
            "timestamp": time.time(),
            "query": query,
            "results": result_data
        }
        cache_file.write_text(json.dumps(cache_data), encoding='utf-8')
    except Exception:
        pass  # Don't fail if caching fails

    return result_data


@app.post("/search")
def api_search(
	dir: Optional[str] = None,
	query: Optional[str] = None,
	top_k: Optional[int] = None,
	provider: Optional[str] = None,
	hf_token: Optional[str] = None,
	openai_key: Optional[str] = None,
	use_fast: Optional[bool] = None,
	fast_kind: Optional[str] = None,
	use_captions: Optional[bool] = None,
	use_ocr: Optional[bool] = None,
	favorites_only: Optional[bool] = None,
	tags: Optional[List[str]] = None,
	date_from: Optional[float] = None,
	date_to: Optional[float] = None,
	camera: Optional[str] = None,
	iso_min: Optional[int] = None,
	iso_max: Optional[int] = None,
	f_min: Optional[float] = None,
	f_max: Optional[float] = None,
	flash: Optional[str] = None,
	wb: Optional[str] = None,
	metering: Optional[str] = None,
	alt_min: Optional[float] = None,
	alt_max: Optional[float] = None,
	heading_min: Optional[float] = None,
	heading_max: Optional[float] = None,
	place: Optional[str] = None,
	has_text: Optional[bool] = None,
	person: Optional[str] = None,
	persons: Optional[List[str]] = None,
	sharp_only: Optional[bool] = None,
	exclude_underexp: Optional[bool] = None,
	exclude_overexp: Optional[bool] = None,
	body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
	dir_value = _require(_from_body(body, dir, "dir"), "dir")
	query_value = _require(_from_body(body, query, "query"), "query")
	top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
	provider_value = _from_body(body, provider, "provider", default="local") or "local"
	hf_token_value = _from_body(body, hf_token, "hf_token")
	openai_key_value = _from_body(body, openai_key, "openai_key")
	use_fast_value = _from_body(body, use_fast, "use_fast", default=False, cast=_as_bool) or False
	fast_kind_value = _from_body(body, fast_kind, "fast_kind")
	use_captions_value = _from_body(body, use_captions, "use_captions", default=False, cast=_as_bool) or False
	use_ocr_value = _from_body(body, use_ocr, "use_ocr", default=False, cast=_as_bool) or False
	favorites_only_value = _from_body(body, favorites_only, "favorites_only", default=False, cast=_as_bool) or False
	tags_value = _from_body(body, tags, "tags")
	tags_list = _as_str_list(tags_value)
	date_from_value = _from_body(body, date_from, "date_from", cast=lambda v: float(v))
	date_to_value = _from_body(body, date_to, "date_to", cast=lambda v: float(v))
	camera_value = _from_body(body, camera, "camera")
	iso_min_value = _from_body(body, iso_min, "iso_min", cast=lambda v: int(v))
	iso_max_value = _from_body(body, iso_max, "iso_max", cast=lambda v: int(v))
	f_min_value = _from_body(body, f_min, "f_min", cast=lambda v: float(v))
	f_max_value = _from_body(body, f_max, "f_max", cast=lambda v: float(v))
	flash_value = _from_body(body, flash, "flash")
	wb_value = _from_body(body, wb, "wb")
	metering_value = _from_body(body, metering, "metering")
	alt_min_value = _from_body(body, alt_min, "alt_min", cast=lambda v: float(v))
	alt_max_value = _from_body(body, alt_max, "alt_max", cast=lambda v: float(v))
	heading_min_value = _from_body(body, heading_min, "heading_min", cast=lambda v: float(v))
	heading_max_value = _from_body(body, heading_max, "heading_max", cast=lambda v: float(v))
	place_value = _from_body(body, place, "place")
	has_text_value = _from_body(body, has_text, "has_text", default=False, cast=_as_bool) or False
	person_value = _from_body(body, person, "person")
	persons_value = _from_body(body, persons, "persons")
	persons_list = _as_str_list(persons_value) if persons_value is not None else []
	sharp_only_value = _from_body(body, sharp_only, "sharp_only", default=False, cast=_as_bool) or False
	exclude_under_value = _from_body(body, exclude_underexp, "exclude_underexp", default=False, cast=_as_bool) or False
	exclude_over_value = _from_body(body, exclude_overexp, "exclude_overexp", default=False, cast=_as_bool) or False

	# Alias variables to reuse existing filtering logic
	dir = dir_value
	query = query_value
	top_k = top_k_value
	provider = provider_value
	hf_token = hf_token_value
	openai_key = openai_key_value
	use_fast = use_fast_value
	fast_kind = fast_kind_value
	use_captions = use_captions_value
	use_ocr = use_ocr_value
	favorites_only = favorites_only_value
	tags = tags_list
	date_from = date_from_value
	date_to = date_to_value
	camera = camera_value
	iso_min = iso_min_value
	iso_max = iso_max_value
	f_min = f_min_value
	f_max = f_max_value
	flash = flash_value
	wb = wb_value
	metering = metering_value
	alt_min = alt_min_value
	alt_max = alt_max_value
	heading_min = heading_min_value
	heading_max = heading_max_value
	place = place_value
	has_text = has_text_value
	person = person_value
	persons = persons_list
	sharp_only = sharp_only_value
	exclude_under = exclude_under_value
	exclude_over = exclude_over_value

	cam_map: Dict[str, str] = {}
	place_map: Dict[str, str] = {}
	iso_map: Dict[str, Optional[int]] = {}
	f_map: Dict[str, Optional[float]] = {}
	flash_map: Dict[str, Optional[int]] = {}
	wb_map: Dict[str, Optional[int]] = {}
	met_map: Dict[str, Optional[int]] = {}
	alt_map: Dict[str, Optional[float]] = {}
	head_map: Dict[str, Optional[float]] = {}
	sharp_map: Dict[str, Optional[float]] = {}
	bright_map: Dict[str, Optional[float]] = {}
	tags_map: Dict[str, List[str]] = {}
	texts_map: Dict[str, str] = {}

	folder = Path(dir)
	if not folder.exists():
		raise HTTPException(400, "Folder not found")
	emb = _emb(provider, hf_token, openai_key)
	store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
	store.load()
	if use_fast:
		try:
			if fast_kind and fast_kind.lower() == 'faiss' and store.faiss_status().get('exists'):
				results = store.search_faiss(emb, query, top_k=top_k)
			elif fast_kind and fast_kind.lower() == 'hnsw' and store.hnsw_status().get('exists'):
				results = store.search_hnsw(emb, query, top_k=top_k)
			elif fast_kind and fast_kind.lower() == 'annoy' and store.ann_status().get('exists'):
				results = store.search_annoy(emb, query, top_k=top_k)
			else:
				if store.faiss_status().get('exists'):
					results = store.search_faiss(emb, query, top_k=top_k)
				elif store.hnsw_status().get('exists'):
					results = store.search_hnsw(emb, query, top_k=top_k)
				elif store.ann_status().get('exists'):
					results = store.search_annoy(emb, query, top_k=top_k)
				else:
					results = store.search(emb, query, top_k=top_k)
		except Exception:
			results = store.search(emb, query, top_k=top_k)
	else:
		if use_captions and store.captions_available():
			results = store.search_with_captions(emb, query, top_k=top_k)
		elif use_ocr and store.ocr_available():
			results = store.search_with_ocr(emb, query, top_k=top_k)
		else:
			results = store.search(emb, query, top_k=top_k)
	out = results
	if favorites_only:
		try:
			coll = load_collections(store.index_dir)
			favs = set(coll.get('Favorites', []))
			out = [r for r in out if str(r.path) in favs]
		except Exception:
			pass
	if tags:
		try:
			tmap = load_tags(store.index_dir)
			req = set(tags)
			out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]
		except Exception:
			pass
	try:
		if persons and isinstance(persons, list) and len(persons) > 0:
			sets: List[set] = []
			for nm in persons:
				try:
					sets.append(set(_face_photos(store.index_dir, str(nm))))
				except Exception:
					sets.append(set())
			if sets:
				inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
				out = [r for r in out if str(r.path) in inter]
		elif person:
			ppl = set(_face_photos(store.index_dir, str(person)))
			out = [r for r in out if str(r.path) in ppl]
	except Exception:
		pass
	if date_from is not None and date_to is not None:
		try:
			mmap = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
			out = [r for r in out if date_from <= mmap.get(str(r.path), 0.0) <= date_to]
		except Exception:
			pass
	try:
		meta_p = store.index_dir / 'exif_index.json'
		if meta_p.exists() and any([
			camera,
			iso_min is not None, iso_max is not None,
			f_min is not None, f_max is not None,
			place,
			flash, wb, metering,
			alt_min is not None, alt_max is not None,
			heading_min is not None, heading_max is not None,
		]):
			m = json.loads(meta_p.read_text())
			cam_map = {p: (c or '') for p, c in zip(m.get('paths',[]), m.get('camera',[]))}
			iso_map = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
			f_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
			place_map = {p: (s or '') for p, s in zip(m.get('paths',[]), m.get('place',[]))}
			flash_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('flash',[]))}
			wb_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('white_balance',[]))}
			met_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('metering',[]))}
			alt_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('gps_altitude',[]))}
			head_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('gps_heading',[]))}
			sharp_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
			bright_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
			def _matches_meta(p: str) -> bool:
				if camera and camera.strip():
					if camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
						return False
				if iso_min is not None:
					v = iso_map.get(p)
					if v is None or v < int(iso_min):
						return False
				if iso_max is not None:
					v = iso_map.get(p)
					if v is None or v > int(iso_max):
						return False
				if f_min is not None:
					v = f_map.get(p)
					if v is None or v < float(f_min):
						return False
				if f_max is not None:
					v = f_map.get(p)
					if v is None or v > float(f_max):
						return False
				if place and place.strip():
					if place.strip().lower() not in (place_map.get(p,'') or '').lower():
						return False
				if flash:
					fv = flash_map.get(p)
					if fv is None:
						return False
					fired = 1 if fv & 1 else 0
					if flash == 'fired' and fired != 1:
						return False
					if flash in ('no','noflash') and fired != 0:
						return False
				if wb:
					wv = wb_map.get(p)
					if wv is None:
						return False
					if wb == 'auto' and wv != 0:
						return False
					if wb == 'manual' and wv != 1:
						return False
				if metering:
					mv = met_map.get(p)
					if mv is None:
						return False
					name = str(metering).lower()
					mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
					label = mm.get(int(mv), 'other')
					if name not in (label, 'any'):
						if not (name == 'matrix' and label == 'pattern'):
							return False
				if alt_min is not None or alt_max is not None:
					av = alt_map.get(p)
					if av is None:
						return False
					if alt_min is not None and av < float(alt_min):
						return False
					if alt_max is not None and av > float(alt_max):
						return False
				if heading_min is not None or heading_max is not None:
					hv = head_map.get(p)
					if hv is None:
						return False
					try:
						hh = float(hv) % 360.0
					except Exception:
						hh = hv
					if heading_min is not None and hh < float(heading_min):
						return False
					if heading_max is not None and hh > float(heading_max):
						return False
				if sharp_only:
					sv = sharp_map.get(p)
					if sv is None or sv < 60.0:
						return False
				if exclude_under:
					bv = bright_map.get(p)
					if bv is not None and bv < 50.0:
						return False
				if exclude_over:
					bv = bright_map.get(p)
					if bv is not None and bv > 205.0:
						return False
				return True
			out = [r for r in out if _matches_meta(str(r.path))]
	except Exception:
		pass
	try:
		texts_map: Dict[str, str] = {}
		if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
			d = json.loads(store.ocr_texts_file.read_text())
			texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
		if has_text:
			out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
		import re as _re
		d_parts = _re.findall(r'"([^"]+)"', query)
		s_parts = _re.findall(r"'([^']+)'", query)
		req = (d_parts or []) + (s_parts or [])
		if req:
			low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
			def _has_all(pth: str) -> bool:
				s = low.get(pth, '')
				return all(x.lower() in s for x in req)
			out = [r for r in out if _has_all(str(r.path))]
	except Exception:
		pass
	try:
		cap_map: Dict[str, str] = {}
		if store.captions_available() and store.captions_file.exists():
			cd = json.loads(store.captions_file.read_text())
			cap_map = {p: (t or '') for p, t in zip(cd.get('paths', []), cd.get('texts', []))}
		if cap_map:
			import shlex
			tokens = shlex.split(query)
			if tokens:
				out_q: List[str] = []
				op_set = {'AND','OR','NOT'}
				for tok in tokens:
					tu = tok.upper()
					if tu in op_set:
						out_q.append(tu)
					elif tok in ('(', ')'):
						out_q.append(tok)
					else:
						out_q.append(tok)
				precedence = {'NOT': 3, 'AND': 2, 'OR': 1}
				output: List[str] = []
				stack: List[str] = []
				for tok in out_q:
					tu = tok.upper()
					if tu in op_set:
						while stack and stack[-1] != '(' and precedence.get(stack[-1], 0) >= precedence[tu]:
							output.append(stack.pop())
						stack.append(tu)
					elif tok == '(':
						stack.append(tok)
					elif tok == ')':
						while stack and stack[-1] != '(':
							output.append(stack.pop())
						if stack and stack[-1] == '(':
							stack.pop()
					else:
						output.append(tok)
				while stack:
					output.append(stack.pop())
				out_q = output
				tags_map: Dict[str, List[str]] = {}
				try:
					tags_map = load_tags(store.index_dir)
				except Exception:
					pass
				person_cache: Dict[str, set] = {}
				cap_texts = cap_map
				texts_map_local = {}
				try:
					d = json.loads(store.ocr_texts_file.read_text()) if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists() else {}
					texts_map_local = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
				except Exception:
					pass
				meta_maps: Dict[str, Dict[str, Optional[float]]] = {}
				mt_map: Dict[str, float] = {p: float(mt) for p, mt in zip(store.state.paths or [], store.state.mtimes or [])}
				iso_map_local: Dict[str, Optional[int]] = {}
				f_map_local: Dict[str, Optional[float]] = {}
				w_map: Dict[str, Optional[int]] = {}
				h_map: Dict[str, Optional[int]] = {}
				bright_map_local: Dict[str, Optional[float]] = {}
				sharp_map_local: Dict[str, Optional[float]] = {}
				exp_map: Dict[str, Optional[float]] = {}
				focal_map: Dict[str, Optional[float]] = {}
				try:
					meta_p = store.index_dir / 'exif_index.json'
					if meta_p.exists():
						m = json.loads(meta_p.read_text())
						iso_map_local = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
						f_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
						w_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('width',[]))}
						h_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('height',[]))}
						bright_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
						sharp_map_local = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
						def _cv(v):
							try:
								if isinstance(v, (list, tuple)) and len(v) == 2:
									a, b = v
									return float(a) / float(b) if b else None
								if isinstance(v, str) and '/' in v:
									a, b = v.split('/', 1)
									return float(a) / float(b)
								return float(v) if isinstance(v, (int, float)) else None
							except Exception:
								return None
						exp_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('exposure',[]))}
						focal_map = {p: _cv(x) for p, x in zip(m.get('paths',[]), m.get('focal',[]))}
				except Exception:
					pass
				def doc_text(pth: str) -> str:
					name = Path(pth).name
					return f"{cap_texts.get(pth,'')}\n{texts_map_local.get(pth,'')}\n{name}".lower()
				def eval_field(tok: str, pth: str) -> bool:
					if ':' not in tok:
						return tok.lower() in doc_text(pth)
					try:
						field, val = tok.split(':', 1)
						fv = (val or '').strip().strip('"').strip("'")
						field = field.lower()
						lp = pth
						def parse_num_op(s: str):
							opers = ['>=','<=','>','<','=']
							for op in opers:
								if s.startswith(op):
									rest = s[len(op):].strip()
									try:
										return op, float(rest)
									except Exception:
										return op, None
							try:
								return '=', float(s)
							except Exception:
								return None, None
						if field == 'camera':
							return fv.lower() in (cam_map.get(lp,'') or '').lower()
						if field == 'place':
							return fv.lower() in (place_map.get(lp,'') or '').lower()
						if field == 'tag':
							return fv in (tags_map.get(lp, []) or [])
						if field == 'rating':
							return f"rating:{fv}" in (tags_map.get(lp, []) or [])
						if field == 'person':
							key = fv
							if key not in person_cache:
								try:
									person_cache[key] = set(_face_photos(store.index_dir, key))
								except Exception:
									person_cache[key] = set()
							return lp in person_cache.get(key, set())
						if field == 'has_text':
							if fv == '' or fv.lower() in ('1','true','yes','y'):
								return (texts_map_local.get(lp,'').strip() != '')
							return (texts_map_local.get(lp,'').strip() == '')
						if field in ('iso','fnumber','width','height','mtime','brightness','sharpness','exposure','focal','duration'):
							op, num = parse_num_op(fv)
							if num is None or op is None:
								return False
							cur = None
							if field == 'iso':
								cur = iso_map_local.get(lp)
							elif field == 'fnumber':
								cur = f_map_local.get(lp)
							elif field == 'width':
								cur = w_map.get(lp)
							elif field == 'height':
								cur = h_map.get(lp)
							elif field == 'mtime':
								cur = mt_map.get(lp)
							elif field == 'brightness':
								cur = bright_map_local.get(lp)
							elif field == 'sharpness':
								cur = sharp_map_local.get(lp)
							elif field == 'exposure':
								cur = exp_map.get(lp)
							elif field == 'focal':
								cur = focal_map.get(lp)
							elif field == 'duration':
								ext = str(Path(lp).suffix or '').lower()
								if ext in ('.mp4','.mov','.mkv','.avi','.webm'):
									try:
										from adapters.video_processor import get_video_metadata as _gvm
										info = _gvm(Path(lp)) or {}
										cur = float(info.get('duration') or 0.0)
									except Exception:
										cur = None
								else:
									cur = None
							try:
								if cur is None:
									return False
								cv = float(cur)
								if op == '>=':
									return cv >= num
								if op == '<=':
									return cv <= num
								if op == '>':
									return cv > num
								if op == '<':
									return cv < num
								if op == '=':
									return abs(cv - num) < 1e-6
								return False
							except Exception:
								return False
						if field == 'filetype':
							ext = (Path(lp).suffix or '').lower().lstrip('.')
							return ext == fv.lower()
						return fv.lower() in doc_text(pth)
					except Exception:
						return False
				def eval_rpn(pth: str) -> bool:
					stack: List[bool] = []
					for tok in out_q:
						tu = tok.upper()
						if tu == 'NOT':
							v = stack.pop() if stack else False
							stack.append(not v)
						elif tu in ('AND','OR'):
							b = stack.pop() if stack else False
							a = stack.pop() if stack else False
							stack.append((a and b) if tu == 'AND' else (a or b))
						else:
							stack.append(eval_field(tok, pth))
					return bool(stack[-1]) if stack else True
				out = [r for r in out if eval_rpn(str(r.path))]
	except Exception:
		pass

	sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query, [(str(r.path), float(r.score)) for r in out])
	return {
		"search_id": sid,
		"results": [{"path": str(r.path), "score": float(r.score)} for r in out],
		"cached": False,
	}


@app.post("/captions/build")
def api_build_captions(
    dir: Optional[str] = None,
    vlm_model: Optional[str] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    model_value = _from_body(body, vlm_model, "vlm_model", default="Qwen/Qwen2-VL-2B-Instruct") or "Qwen/Qwen2-VL-2B-Instruct"
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    vlm = VlmCaptionHF(model=model_value, hf_token=hf_token_value)
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_captions(vlm, emb)
    _write_event(store.index_dir, { 'type': 'captions_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'updated': updated, 'model': model_value })
    return {"updated": updated}


# Faces (People & Pets)
@app.post("/faces/build")
def api_build_faces(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = _build_faces(store.index_dir, store.state.paths or [])
    return out


@app.get("/faces/clusters")
def api_faces_clusters(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    items = _face_list(store.index_dir)
    return {"clusters": items}


@app.post("/faces/name")
def api_faces_name(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    name_value = _require(_from_body(body, name, "name"), "name")
    store = IndexStore(Path(dir_value))
    return _face_name(store.index_dir, cluster_value, name_value)


# Trips & Events
@app.post("/trips/build")
def api_trips_build(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    res = _build_trips(store.index_dir, store.state.paths or [], store.state.mtimes or [])
    try:
        _write_event(store.index_dir, { 'type': 'trips_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'trips': len(res.get('trips', [])) })
    except Exception:
        pass
    return res


@app.get("/trips")
def api_trips_list(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"trips": _load_trips(store.index_dir)}


@app.post("/search_workspace")
def api_search_workspace(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    favorites_only: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    date_from: Optional[float] = None,
    date_to: Optional[float] = None,
    place: Optional[str] = None,
    has_text: Optional[bool] = None,
    person: Optional[str] = None,
    persons: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")
    favorites_value = _from_body(body, favorites_only, "favorites_only", default=False, cast=_as_bool) or False
    tags_value = _from_body(body, tags, "tags", default=[], cast=_as_str_list) or []
    date_from_value = _from_body(body, date_from, "date_from")
    date_to_value = _from_body(body, date_to, "date_to")
    place_value = _from_body(body, place, "place")
    has_text_value = _from_body(body, has_text, "has_text", default=False, cast=_as_bool) or False
    person_value = _from_body(body, person, "person")
    persons_value = _from_body(body, persons, "persons", default=[], cast=_as_str_list) or []

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    primary = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    primary.load()
    from infra.workspace import load_workspace
    stores: List[IndexStore] = [primary]
    for f in load_workspace():
        p = Path(f)
        if p.exists() and str(p.resolve()) != str(folder.resolve()):
            s = IndexStore(p, index_key=getattr(emb, 'index_id', None))
            s.load()
            stores.append(s)
    try:
        qv = emb.embed_text(query_value)
    except Exception:
        raise HTTPException(500, "Embedding failed")
    import numpy as np
    E_list = []
    paths: List[str] = []
    for s in stores:
        if s.state.embeddings is not None and len(s.state.embeddings) > 0:
            E_list.append(s.state.embeddings)
            paths.extend(s.state.paths)
    if not E_list:
        return {"search_id": None, "results": []}
    E = np.vstack(E_list).astype('float32')
    sims = (E @ qv).astype(float)
    k = max(1, min(top_k_value, len(sims)))
    idx = np.argpartition(-sims, k - 1)[:k]
    idx = idx[np.argsort(-sims[idx])]
    out_pairs = [(paths[i], float(sims[i])) for i in idx]

    if favorites_value:
        favset = set()
        for s in stores:
            coll = load_collections(s.index_dir)
            favset.update(coll.get('Favorites', []))
        out_pairs = [(p, s) for (p, s) in out_pairs if p in favset]
    if tags_value:
        req = set(tags_value)
        tmap: Dict[str, List[str]] = {}
        for s in stores:
            for k, v in load_tags(s.index_dir).items():
                tmap[k] = v
        out_pairs = [(p, s) for (p, s) in out_pairs if req.issubset(set(tmap.get(p, [])))]
    if date_from_value is not None and date_to_value is not None:
        mmap: Dict[str, float] = {}
        for s in stores:
            mmap.update({sp: float(mt) for sp, mt in zip(s.state.paths or [], s.state.mtimes or [])})
        out_pairs = [(p, s) for (p, s) in out_pairs if date_from_value <= mmap.get(p, 0.0) <= date_to_value]
    try:
        if persons_value:
            sets: List[set] = []
            for nm in persons_value:
                pp = set()
                for s in stores:
                    try:
                        pp.update(set(_face_photos(s.index_dir, str(nm))))
                    except Exception:
                        continue
                sets.append(pp)
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out_pairs = [(p, sc) for (p, sc) in out_pairs if p in inter]
        elif person_value:
            ppl = set()
            for s in stores:
                try:
                    ppl.update(set(_face_photos(s.index_dir, str(person_value))))
                except Exception:
                    continue
            out_pairs = [(p, sc) for (p, sc) in out_pairs if p in ppl]
    except Exception:
        pass
    if place_value and str(place_value).strip():
        place_map: Dict[str, str] = {}
        for s in stores:
            try:
                meta_p = s.index_dir / 'exif_index.json'
                if meta_p.exists():
                    m = json.loads(meta_p.read_text())
                    place_map.update({p: (str(v or '')) for p, v in zip(m.get('paths', []), m.get('place', []))})
            except Exception:
                continue
        pl = str(place_value).strip().lower()
        out_pairs = [(p, sc) for (p, sc) in out_pairs if pl in (place_map.get(p, '') or '').lower()]
    if has_text_value:
        texts_map: Dict[str, str] = {}
        for s in stores:
            try:
                if hasattr(s, 'ocr_texts_file') and s.ocr_texts_file.exists():
                    d = json.loads(s.ocr_texts_file.read_text())
                    texts_map.update({p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))})
            except Exception:
                continue
        out_pairs = [(p, sc) for (p, sc) in out_pairs if texts_map.get(p, '').strip()]

    sid = log_search(primary.index_dir, getattr(emb, 'index_id', 'default'), query_value, out_pairs)
    return {"search_id": sid, "results": [{"path": p, "score": sc} for (p, sc) in out_pairs]}


@app.get("/favorites")
def api_get_favorites(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    return {"favorites": coll.get('Favorites', [])}


@app.post("/favorites")
def api_set_favorite(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    favorite: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    favorite_value = _from_body(body, favorite, "favorite", default=True, cast=_as_bool)

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    fav = coll.get('Favorites', [])
    if favorite_value:
        if path_value not in fav:
            fav.append(path_value)
    else:
        fav = [p for p in fav if p != path_value]
    coll['Favorites'] = fav
    save_collections(store.index_dir, coll)
    return {"ok": True, "favorites": fav}


@app.get("/tags")
def api_get_tags(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"tags": load_tags(store.index_dir), "all": all_tags(store.index_dir)}


@app.post("/tags")
def api_set_tags(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    tags: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    tags_value = _from_body(body, tags, "tags", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    t = load_tags(store.index_dir)
    t[path_value] = sorted({s.strip() for s in tags_value if s.strip()})
    save_tags(store.index_dir, t)
    return {"ok": True, "tags": t[path_value]}


@app.get("/saved")
def api_get_saved(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"saved": load_saved(store.index_dir)}


@app.post("/saved")
def api_add_saved(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12

    store = IndexStore(Path(dir_value))
    saved = load_saved(store.index_dir)
    saved.append({"name": name_value, "query": query_value, "top_k": int(top_k_value)})
    save_saved(store.index_dir, saved)
    return {"ok": True, "saved": saved}


@app.post("/saved/delete")
def api_delete_saved(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    saved = load_saved(store.index_dir)
    before = len(saved)
    saved = [s for s in saved if str(s.get("name")) != name_value]
    save_saved(store.index_dir, saved)
    return {"ok": True, "deleted": before - len(saved), "saved": saved}


# Presets (boolean query templates)
@app.get("/presets")
def api_get_presets(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"presets": load_presets(store.index_dir)}


@app.post("/presets")
def api_add_preset(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    query: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    query_value = _require(_from_body(body, query, "query"), "query")

    store = IndexStore(Path(dir_value))
    items = load_presets(store.index_dir)
    # Upsert by name
    found = False
    for it in items:
        if str(it.get('name')) == name_value:
            it['query'] = query_value
            found = True
            break
    if not found:
        items.append({"name": name_value, "query": query_value})
    save_presets(store.index_dir, items)
    _write_event(store.index_dir, { 'type': 'preset_save', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'name': name_value })
    return {"ok": True, "presets": items}


@app.post("/presets/delete")
def api_delete_preset(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    items = load_presets(store.index_dir)
    before = len(items)
    items = [it for it in items if str(it.get('name')) != name_value]
    save_presets(store.index_dir, items)
    return {"ok": True, "deleted": before - len(items), "presets": items}


# Collections CRUD
@app.get("/collections")
def api_get_collections(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"collections": load_collections(store.index_dir)}

@app.post("/collections")
def api_set_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    coll[name_value] = sorted(set(paths_value))
    save_collections(store.index_dir, coll)
    return {"ok": True, "collections": coll}

@app.post("/collections/delete")
def api_delete_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    coll = load_collections(store.index_dir)
    if name_value in coll:
        del coll[name_value]
        save_collections(store.index_dir, coll)
        return {"ok": True, "deleted": name_value}
    return {"ok": False, "deleted": None}


# Smart Collections CRUD + resolve
@app.get("/smart_collections")
def api_get_smart_collections(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"smart": load_smart_collections(store.index_dir)}


@app.post("/smart_collections")
def api_set_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    rules: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    rules_value = _from_body(body, rules, "rules", default={}) or {}

    store = IndexStore(Path(dir_value))
    data = load_smart_collections(store.index_dir)
    data[name_value] = rules_value
    save_smart_collections(store.index_dir, data)
    return {"ok": True, "smart": data}


@app.post("/smart_collections/delete")
def api_delete_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    data = load_smart_collections(store.index_dir)
    if name_value in data:
        del data[name_value]
        save_smart_collections(store.index_dir, data)
        return {"ok": True, "deleted": name_value}
    return {"ok": False, "deleted": None}


@app.post("/smart_collections/resolve")
def api_resolve_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    provider: Optional[str] = None,
    top_k: Optional[int] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    top_k_value = _from_body(body, top_k, "top_k", default=24, cast=lambda v: int(v)) or 24
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    data = load_smart_collections(store.index_dir)
    rules = data.get(name_value)
    if not isinstance(rules, dict):
        return {"search_id": None, "results": []}
    # Extract rules with safe defaults
    query = str(rules.get('query') or '').strip()
    fav_only = bool(rules.get('favoritesOnly'))
    tags = rules.get('tags') or []
    date_from = rules.get('dateFrom'); date_to = rules.get('dateTo')
    use_captions = bool(rules.get('useCaptions'))
    use_ocr = bool(rules.get('useOcr'))
    place = rules.get('place'); person = rules.get('person'); persons = rules.get('persons') or None; has_text = bool(rules.get('hasText'))
    camera = rules.get('camera'); iso_min = rules.get('isoMin'); iso_max = rules.get('isoMax')
    f_min = rules.get('fMin'); f_max = rules.get('fMax')
    flash = rules.get('flash'); wb = rules.get('wb'); metering = rules.get('metering')
    alt_min = rules.get('altMin'); alt_max = rules.get('altMax')
    heading_min = rules.get('headingMin'); heading_max = rules.get('headingMax')
    sharp_only = bool(rules.get('sharpOnly')); exclude_underexp = bool(rules.get('excludeUnder')); exclude_overexp = bool(rules.get('excludeOver'))
    # Run same pathway as api_search (simplified: no fast indexes switch here)
    if use_captions and store.captions_available():
        results = store.search_with_captions(emb, query or '', top_k=top_k_value)
    elif use_ocr and store.ocr_available():
        results = store.search_with_ocr(emb, query or '', top_k=top_k_value)
    else:
        results = store.search(emb, query or '', top_k=top_k_value)
    out = results
    # Favorites filter
    if fav_only:
        coll = load_collections(store.index_dir)
        favs = set(coll.get('Favorites', []))
        out = [r for r in out if str(r.path) in favs]
    # Tags filter
    if tags:
        tmap = load_tags(store.index_dir)
        req = set(tags)
        out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]
    # Person filters
    try:
        if persons and isinstance(persons, list) and len(persons) > 0:
            sets: List[set] = []
            for nm in persons:
                try:
                    sets.append(set(_face_photos(store.index_dir, str(nm))))
                except Exception:
                    sets.append(set())
            if sets:
                inter = set.intersection(*sets) if len(sets) > 1 else sets[0]
                out = [r for r in out if str(r.path) in inter]
        elif person:
            ppl = set(_face_photos(store.index_dir, str(person)))
            out = [r for r in out if str(r.path) in ppl]
    except Exception:
        out = out
    # Date filter
    if date_from is not None and date_to is not None:
        mmap = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        out = [r for r in out if float(date_from) <= mmap.get(str(r.path), 0.0) <= float(date_to)]
    # EXIF filters
    try:
        meta_p = store.index_dir / 'exif_index.json'
        if meta_p.exists() and any([
            camera, iso_min is not None, iso_max is not None, f_min is not None, f_max is not None,
            flash, wb, metering, alt_min is not None, alt_max is not None, heading_min is not None, heading_max is not None,
            sharp_only, exclude_underexp, exclude_overexp, place,
        ]):
            m = json.loads(meta_p.read_text())
            cam_map = {p: (c or '') for p, c in zip(m.get('paths',[]), m.get('camera',[]))}
            iso_map = {p: (i if isinstance(i,int) else None) for p, i in zip(m.get('paths',[]), m.get('iso',[]))}
            f_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('fnumber',[]))}
            place_map = {p: (s or '') for p, s in zip(m.get('paths',[]), m.get('place',[]))}
            flash_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('flash',[]))}
            wb_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('white_balance',[]))}
            met_map = {p: (int(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('metering',[]))}
            alt_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('gps_altitude',[]))}
            head_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('gps_heading',[]))}
            sharp_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('sharpness',[]))}
            bright_map = {p: (float(x) if isinstance(x,(int,float)) else None) for p, x in zip(m.get('paths',[]), m.get('brightness',[]))}
            def ok(p: str) -> bool:
                if camera and camera.strip():
                    if camera.strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min is not None:
                    v = iso_map.get(p)
                    if v is None or v < int(iso_min):
                        return False
                if iso_max is not None:
                    v = iso_map.get(p)
                    if v is None or v > int(iso_max):
                        return False
                if f_min is not None:
                    v = f_map.get(p)
                    if v is None or v < float(f_min):
                        return False
                if f_max is not None:
                    v = f_map.get(p)
                    if v is None or v > float(f_max):
                        return False
                if flash:
                    fv = flash_map.get(p)
                    if fv is None:
                        return False
                    fired = 1 if fv & 1 else 0
                    if flash == 'fired' and fired != 1:
                        return False
                    if flash in ('no','noflash') and fired != 0:
                        return False
                if wb is not None:
                    wv = wb_map.get(p)
                    if wv is None:
                        return False
                    if wb == 'auto' and wv != 0:
                        return False
                    if wb == 'manual' and wv != 1:
                        return False
                if metering:
                    mv = met_map.get(p)
                    if mv is None:
                        return False
                    name = str(metering).lower()
                    mm = {0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'}
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any') and not (name=='matrix' and label=='pattern'):
                        return False
                if alt_min is not None or alt_max is not None:
                    av = alt_map.get(p)
                    if av is None:
                        return False
                    if alt_min is not None and av < float(alt_min):
                        return False
                    if alt_max is not None and av > float(alt_max):
                        return False
                if heading_min is not None or heading_max is not None:
                    hv = head_map.get(p)
                    if hv is None:
                        return False
                    hh = float(hv) % 360.0
                    if heading_min is not None and hh < float(heading_min):
                        return False
                    if heading_max is not None and hh > float(heading_max):
                        return False
                if sharp_only:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 60.0:
                        return False
                if exclude_underexp:
                    bv = bright_map.get(p)
                    if bv is not None and bv < 50.0:
                        return False
                if exclude_overexp:
                    bv = bright_map.get(p)
                    if bv is not None and bv > 205.0:
                        return False
                if place and str(place).strip():
                    if str(place).strip().lower() not in (place_map.get(p,'') or '').lower():
                        return False
                return True
            out = [r for r in out if ok(str(r.path))]
        else:
            out = out
    except Exception:
        out = out
    
    # OCR filters
    try:
        texts_map = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        if has_text:
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        import re as _re
        d_parts = _re.findall(r'"([^"]+)"', query or '')
        s_parts = _re.findall(r"'([^']+)'", query or '')
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if has_all(str(r.path))]
    except Exception:
        pass
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), f"smart:{name}:{query}", [(str(r.path), float(r.score)) for r in out])
    return {"search_id": sid, "results": [{"path": str(r.path), "score": float(r.score)} for r in out]}


@app.post("/feedback")
def api_feedback(
    dir: Optional[str] = None,
    search_id: Optional[str] = None,
    query: Optional[str] = None,
    positives: Optional[List[str]] = None,
    note: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    search_id_value = _require(_from_body(body, search_id, "search_id"), "search_id")
    query_value = _require(_from_body(body, query, "query"), "query")
    positives_value = _from_body(body, positives, "positives", default=[], cast=_as_str_list) or []
    note_value = _from_body(body, note, "note", default="") or ""

    store = IndexStore(Path(dir_value))
    log_feedback(store.index_dir, search_id_value, query_value, positives_value, note_value)
    return {"ok": True}


@app.get("/lookalikes")
def api_lookalikes(dir: str, max_distance: int = 5) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    groups = find_lookalikes(store.index_dir, max_distance=max_distance)
    resolved = set(load_resolved(store.index_dir))
    items = []
    for g in groups:
        gid = _group_id(g)
        items.append({"id": gid, "paths": g, "resolved": gid in resolved})
    return {"groups": items}


@app.post("/lookalikes/resolve")
def api_resolve_lookalike(
    dir: Optional[str] = None,
    group_paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    group_paths_value = _from_body(body, group_paths, "group_paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    gid = _group_id(group_paths_value)
    ids = load_resolved(store.index_dir)
    if gid not in ids:
        ids.append(gid)
    save_resolved(store.index_dir, ids)
    return {"ok": True, "id": gid}


# Extras now that we have a proper frontend
@app.post("/ocr/build")
def api_build_ocr(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    languages: Optional[List[str]] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    languages_value = _from_body(body, languages, "languages")
    if languages_value is not None and not isinstance(languages_value, list):
        languages_value = _as_str_list(languages_value)
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_ocr(emb, languages=languages_value)
    _write_event(store.index_dir, { 'type': 'ocr_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'updated': updated, 'langs': languages_value or [] })
    return {"updated": updated}


@app.post("/fast/build")
def api_build_fast(
    dir: Optional[str] = None,
    kind: Optional[str] = None,
    trees: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    kind_value = (_from_body(body, kind, "kind", default="faiss") or "faiss").lower()
    trees_value = _from_body(body, trees, "trees", default=50, cast=lambda v: int(v)) or 50
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    # Write fast status (best-effort, no incremental progress available)
    status_path = store.index_dir / 'fast_status.json'
    try:
        status_path.write_text(json.dumps({ 'state': 'running', 'kind': kind_value, 'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()) }), encoding='utf-8')
    except Exception:
        pass
    ok = False
    if kind_value.lower() == 'faiss':
        ok = store.build_faiss()
    elif kind_value.lower() == 'hnsw':
        ok = store.build_hnsw()
    else:
        ok = store.build_annoy(trees=trees_value)
    _write_event(store.index_dir, { 'type': 'fast_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'ok': ok, 'kind': kind_value })
    try:
        status_path.write_text(json.dumps({ 'state': 'complete', 'kind': kind_value, 'end': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'ok': bool(ok) }), encoding='utf-8')
    except Exception:
        pass
    return {"ok": ok, "kind": kind_value}


@app.post("/thumbs")
def api_build_thumbs(
    dir: Optional[str] = None,
    size: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    size_value = _from_body(body, size, "size", default=512, cast=lambda v: int(v)) or 512
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    made = 0
    for sp, mt in zip(store.state.paths or [], store.state.mtimes or []):
        tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=size_value)
        if tp is not None:
            made += 1
    out = {"made": made}
    _write_event(store.index_dir, { 'type': 'thumbs_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'made': made, 'size': size_value })
    return out

@app.get("/status/{operation}")
def api_operation_status(dir: str, operation: str) -> Dict[str, Any]:
    """Get status of long-running operations like indexing, caption building, etc."""
    store = IndexStore(Path(dir))

    status_files = {
        'index': 'index_status.json',
        'captions': 'captions_status.json',
        'ocr': 'ocr_status.json',
        'metadata': 'metadata_status.json',
        'fast_index': 'fast_status.json'
    }

    status_file = status_files.get(operation)
    if not status_file:
        return {"error": f"Unknown operation: {operation}"}

    status_path = store.index_dir / status_file
    if not status_path.exists():
        return {"state": "idle"}

    try:
        status = json.loads(status_path.read_text(encoding='utf-8'))
        return status
    except Exception:
        return {"state": "error", "error": "Could not read status file"}


@app.get("/map")
def api_map(dir: str, limit: int = 1000) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    pts: List[Dict[str, float]] = []
    store = IndexStore(folder)
    store.load()
    def to_deg(val):
        try:
            d,m,s = val
            def cv(x):
                return float(x[0])/float(x[1]) if isinstance(x, tuple) else float(x)
            return cv(d)+cv(m)/60.0+cv(s)/3600.0
        except Exception:
            return None
    for sp in (store.state.paths or [])[:limit]:
        try:
            img = Image.open(sp)
            ex = img._getexif() or {}
            gps = ex.get(inv.get('GPSInfo', -1)) or {}
            lat = gps.get(2); lat_ref = gps.get(1)
            lon = gps.get(4); lon_ref = gps.get(3)
            if lat and lon and lat_ref and lon_ref:
                latd = to_deg(lat); lond = to_deg(lon)
                if latd is not None and lond is not None:
                    if str(lat_ref).upper().startswith('S'):
                        latd = -latd
                    if str(lon_ref).upper().startswith('W'):
                        lond = -lond
                    pts.append({"lat": latd, "lon": lond})
        except Exception:
            continue
    return {"points": pts}


@app.post("/thumb/batch")
def api_thumb_batch(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    size: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Generate thumbnails for multiple images in batch to reduce API calls."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    size_value = _from_body(body, size, "size", default=256, cast=lambda v: int(v)) or 256
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    results = {}
    for path in paths_value:
        try:
            idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
            mtime = idx_map.get(path, 0.0)
            tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size_value)
            if tp is None or not tp.exists():
                results[path] = {"error": "Thumb not found"}
            else:
                # Return base64 encoded thumbnail for batch response
                with open(tp, 'rb') as f:
                    import base64
                    results[path] = {
                        "data": f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}",
                        "size": size_value
                    }
        except Exception as e:
            results[path] = {"error": str(e)}

    return {"results": results}


@app.get("/thumb_face")
def api_thumb_face(dir: str, path: str, emb: int, provider: str = "local", size: int = 256, hf_token: Optional[str] = None, openai_key: Optional[str] = None):
    from fastapi.responses import FileResponse
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    embd = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(embd, 'index_id', None))
    store.load()
    try:
        idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        mtime = idx_map.get(path, 0.0)
        data = _faces_load(store.index_dir)
        bbox = None
        for it in data.get('photos', {}).get(path, []) or []:
            try:
                if int(it.get('emb')) == int(emb):
                    bb = it.get('bbox')
                    if isinstance(bb, list) and len(bb) == 4:
                        bbox = (int(bb[0]), int(bb[1]), int(bb[2]), int(bb[3]))
                        break
            except Exception:
                continue
        if bbox is None:
            # fallback to generic thumb
            tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size)
            if tp is None or not tp.exists():
                raise HTTPException(404, "Thumb not found")
            return FileResponse(str(tp))
        fp = get_or_create_face_thumb(store.index_dir, Path(path), float(mtime), bbox, size=size)
        if fp is None or not fp.exists():
            raise HTTPException(404, "Face thumb not found")
        return FileResponse(str(fp))
    except Exception:
        raise HTTPException(404, "Face thumb not found")




@app.post("/search_like")
def api_search_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = store.search_like(path_value, top_k=top_k_value)
    return {"results": [{"path": str(r.path), "score": float(r.score)} for r in out]}


@app.post("/search_like_plus")
def api_search_like_plus(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    text: Optional[str] = None,
    weight: Optional[float] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    text_value = _from_body(body, text, "text")
    weight_value = _from_body(body, weight, "weight", default=0.5, cast=lambda v: float(v)) or 0.5
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if store.state.embeddings is None or not store.state.paths:
        return {"results": []}
    try:
        i = store.state.paths.index(path_value)
    except ValueError:
        return {"results": []}
    import numpy as np
    q_img = store.state.embeddings[i].astype('float32')
    if text_value and text_value.strip():
        try:
            q_txt = emb.embed_text(text_value).astype('float32')
        except Exception:
            q_txt = np.zeros_like(q_img)
    else:
        q_txt = np.zeros_like(q_img)
    w = max(0.0, min(1.0, float(weight_value)))
    q = ((1.0 - w) * q_img + w * q_txt).astype('float32')
    # Normalize if possible
    norm = float(np.linalg.norm(q))
    if norm > 0:
        q = q / norm
    E = store.state.embeddings.astype('float32')
    sims = (E @ q).astype(float)
    k = max(1, min(top_k_value, len(sims)))
    idx = np.argpartition(-sims, k - 1)[:k]
    idx = idx[np.argsort(-sims[idx])]
    return {"results": [{"path": str(store.state.paths[i]), "score": float(sims[i])} for i in idx]}


@app.post("/ocr/snippets")
def api_ocr_snippets(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    limit: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    limit_value = _from_body(body, limit, "limit", default=160, cast=lambda v: int(v)) or 160

    store = IndexStore(Path(dir_value))
    texts: Dict[str, str] = {}
    try:
        if not store.ocr_texts_file.exists():
            return {"snippets": {}}
        d = json.loads(store.ocr_texts_file.read_text())
        base = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        def mk_snip(s: str) -> str:
            try:
                s = ' '.join(s.split())
                return s[: max(0, limit_value)].strip()
            except Exception:
                return s[: max(0, limit_value)] if s else ''
        for p in paths_value or []:
            t = base.get(p, '')
            if t:
                texts[p] = mk_snip(t)
    except Exception:
        texts = {}
    return {"snippets": texts}

@app.get("/ocr/status")
def api_ocr_status(dir: str) -> Dict[str, Any]:
    """Return whether OCR texts have been built for this index."""
    store = IndexStore(Path(dir))
    try:
        # If an OCR status file exists, surface its data (parity with index status)
        status_file = store.index_dir / 'ocr_status.json'
        if status_file.exists():
            try:
                data = json.loads(status_file.read_text(encoding='utf-8'))
                # Enrich with current count when possible
                count = 0
                if store.ocr_texts_file.exists():
                    try:
                        d = json.loads(store.ocr_texts_file.read_text())
                        arr = d.get('texts', []) or []
                        count = len([t for t in arr if isinstance(t, str) and t.strip()])
                    except Exception:
                        count = 0
                data['count'] = int(count)
                # Provide a ready flag when completed
                if str(data.get('state')) == 'complete':
                    data['ready'] = True
                return data
            except Exception:
                # Fall through to simple ready/count
                pass
        ready = store.ocr_texts_file.exists()
        count = 0
        if ready:
            try:
                d = json.loads(store.ocr_texts_file.read_text())
                arr = d.get('texts', []) or []
                count = len([t for t in arr if isinstance(t, str) and t.strip()])
            except Exception:
                count = 0
        return { 'ready': bool(ready), 'count': int(count) }
    except Exception:
        return { 'ready': False }
@app.post("/open")
def api_open(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    p = Path(path_value)
    if not p.exists():
        raise HTTPException(404, "File not found")
    import os as _os, platform as _pf
    try:
        sysname = _pf.system()
        if sysname == 'Darwin':
            _os.system(f"open -R '{p}'")
        elif sysname == 'Windows':
            _os.system(f"explorer /select, {str(p)}")
        else:
            _os.system(f"xdg-open '{p.parent}'")
    except Exception:
        pass
    return {"ok": True}


@app.post("/scan_count")
def api_scan_count(
    paths: Optional[List[str]] = None,
    include_videos: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Best-effort count of media files under given paths. Privacy-friendly preview."""
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    include_videos_value = _from_body(body, include_videos, "include_videos", default=True, cast=_as_bool)
    return _scan_media_counts(paths_value, bool(include_videos_value))


@app.post("/edit/ops")
def api_edit_ops(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    rotate: Optional[int] = None,
    flip: Optional[str] = None,
    crop: Optional[Dict[str, int]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    rotate_value = _from_body(body, rotate, "rotate", default=0, cast=lambda v: int(v)) or 0
    flip_value = _from_body(body, flip, "flip")
    crop_value = _from_body(body, crop, "crop")

    folder = Path(dir_value)
    p = Path(path_value)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    ops = _EditOps(rotate=int(rotate_value or 0), flip=flip_value, crop=crop_value)
    out = _edit_apply_ops(store.index_dir, p, ops)
    return {"out_path": str(out)}


# In‑memory delete session (last batch) per process
_last_delete = None

@app.post("/edit/upscale")
def api_edit_upscale(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    scale: Optional[int] = None,
    engine: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    scale_value = _from_body(body, scale, "scale", default=2, cast=lambda v: int(v)) or 2
    engine_value = _from_body(body, engine, "engine", default="pil") or "pil"

    folder = Path(dir_value)
    p = Path(path_value)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    out = _edit_upscale(store.index_dir, p, scale=scale_value, engine=engine_value)
    return {"out_path": str(out)}


@app.post("/export")
def api_export(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    dest: Optional[str] = None,
    mode: Optional[str] = None,
    strip_exif: Optional[bool] = None,
    overwrite: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    dest_value = _require(_from_body(body, dest, "dest"), "dest")
    mode_value = (_from_body(body, mode, "mode", default="copy") or "copy").lower()
    strip_exif_value = _from_body(body, strip_exif, "strip_exif", default=False, cast=_as_bool) or False
    overwrite_value = _from_body(body, overwrite, "overwrite", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    dest_dir = Path(dest_value).expanduser()
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(400, "Cannot create destination")
    copied = 0; skipped = 0; errors = 0
    for sp in paths_value:
        src = Path(sp)
        if not src.exists():
            errors += 1; continue
        out = dest_dir / src.name
        if out.exists() and not overwrite_value:
            skipped += 1; continue
        try:
            if mode_value == 'symlink':
                try:
                    if out.exists(): out.unlink()
                    os.symlink(src, out)
                    copied += 1
                    continue
                except Exception:
                    pass
            if strip_exif_value:
                try:
                    from PIL import Image
                    with Image.open(src) as img:
                        img = img.convert('RGB') if img.mode not in ('RGB','L') else img
                        img.save(out)
                    copied += 1
                    continue
                except Exception:
                    pass
            shutil.copy2(src, out)
            copied += 1
        except Exception:
            errors += 1
    return {"ok": True, "copied": copied, "skipped": skipped, "errors": errors, "dest": str(dest_dir)}


@app.get("/diagnostics")
def api_diagnostics(dir: str, provider: Optional[str] = None, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    # If provider specified, report its index; else list indexes under .photo_index
    items: List[Dict[str, Any]] = []
    if provider:
        emb = _emb(provider, hf_token, openai_key)
        store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
        store.load()
        info = {"key": getattr(emb, 'index_id', 'default'), "index_dir": str(store.index_dir), "count": len(store.state.paths or [])}
        try:
            info["fast"] = {
                "annoy": bool(store.ann_status().get('exists')),
                "faiss": bool(store.faiss_status().get('exists')),
                "hnsw": bool(store.hnsw_status().get('exists')),
            }
        except Exception:
            info["fast"] = {"annoy": False, "faiss": False, "hnsw": False}
        items.append(info)
    else:
        base = folder / ".photo_index"
        if base.exists():
            for sub in base.iterdir():
                if not sub.is_dir():
                    continue
                p = sub / "paths.json"
                cnt = 0
                try:
                    import json
                    if p.exists():
                        data = json.loads(p.read_text())
                        cnt = len(data.get("paths", []))
                except Exception:
                    cnt = 0
                items.append({"key": sub.name, "index_dir": str(sub), "count": cnt})
    import shutil, platform
    free_gb = shutil.disk_usage(Path.home()).free / (1024**3)
    return {"folder": str(folder), "engines": items, "free_gb": round(free_gb, 1), "os": platform.system()}


@app.get("/library")
def api_library(dir: str, provider: str = "local", limit: int = 120, offset: int = 0, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    """Return a slice of the indexed library paths for quick browse grids."""
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    paths = store.state.paths or []
    start = max(0, int(offset))
    end = max(start, min(len(paths), start + int(limit)))
    out = paths[start:end]
    return {"total": len(paths), "offset": start, "limit": int(limit), "paths": out}


# Workspace management (intent-first only)
from infra.workspace import load_workspace, save_workspace


@app.get("/workspace")
def api_workspace_list() -> Dict[str, Any]:
    return {"folders": load_workspace()}


class WorkspacePath(BaseModel):
    path: str

@app.post("/workspace/add")
def api_workspace_add(data: WorkspacePath) -> Dict[str, Any]:
    ws = load_workspace()
    if data.path not in ws:
        ws.append(data.path)
        save_workspace(ws)
    return {"folders": ws}


@app.post("/workspace/remove")
def api_workspace_remove(data: WorkspacePath) -> Dict[str, Any]:
    ws = load_workspace()
    ws = [p for p in ws if p != data.path]
    save_workspace(ws)
    return {"folders": ws}


def _build_exif_index(index_dir: Path, paths: List[str]) -> Dict[str, Any]:
    from PIL import Image, ExifTags
    inv = {v: k for k, v in ExifTags.TAGS.items()}
    out = {
        "paths": [], "camera": [], "iso": [], "fnumber": [], "exposure": [], "focal": [], "width": [], "height": [],
        "flash": [], "white_balance": [], "metering": [], "gps_altitude": [], "gps_heading": [],
        "gps_lat": [], "gps_lon": [], "place": [],
        "sharpness": [], "brightness": [], "contrast": []
    }
    # Initialize metadata status for UI polling
    status_path = index_dir / 'metadata_status.json'
    try:
        status_path.write_text(json.dumps({
            'state': 'running',
            'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'total': int(len(paths or [])),
            'done': 0,
            'updated': 0,
        }), encoding='utf-8')
    except Exception:
        pass
    done = 0
    for sp in paths:
        p = Path(sp)
        cam = None; iso = None; fn = None; exp = None; foc = None; w=None; h=None
        flash_v = None; wb_v = None; met_v = None; alt_v = None; head_v = None
        lat_v = None; lon_v = None; place_v = None
        try:
            with Image.open(p) as img:
                w, h = img.size
                ex = img._getexif() or {}
                cam = ex.get(inv.get('Model', -1))
                iso = ex.get(inv.get('ISOSpeedRatings', -1)) or ex.get(inv.get('PhotographicSensitivity', -1))
                fn = ex.get(inv.get('FNumber', -1))
                exp = ex.get(inv.get('ExposureTime', -1))
                foc = ex.get(inv.get('FocalLength', -1))
                flash_v = ex.get(inv.get('Flash', -1))
                wb_v = ex.get(inv.get('WhiteBalance', -1))
                met_v = ex.get(inv.get('MeteringMode', -1))
                def cv(v):
                    if isinstance(v, tuple) and len(v)==2 and all(isinstance(x,(int,float)) for x in v):
                        a,b=v; return float(a)/float(b) if b else None
                    return float(v) if isinstance(v,(int,float)) else None
                if isinstance(fn, tuple): fn = cv(fn)
                if isinstance(exp, tuple): exp = cv(exp)
                if isinstance(foc, tuple): foc = cv(foc)
                if isinstance(iso, (list, tuple)) and iso:
                    iso = int(iso[0])
                if isinstance(iso, (float,int)):
                    iso = int(iso)
                if isinstance(cam, bytes): cam = cam.decode(errors='ignore')
                # GPS altitude/heading from GPSInfo
                gps = ex.get(inv.get('GPSInfo', -1)) or {}
                if gps:
                    from PIL.ExifTags import GPSTAGS
                    gps_named = {GPSTAGS.get(k, k): v for k, v in gps.items()}
                    # Lat/Lon degrees
                    def _cv(v):
                        if isinstance(v, tuple) and len(v)==2 and all(isinstance(x,(int,float)) for x in v):
                            a,b=v; return float(a)/float(b) if b else None
                        return float(v) if isinstance(v,(int,float)) else None
                    def _to_deg(val):
                        try:
                            d,m,s = val
                            def _c(x):
                                return float(x[0])/float(x[1]) if isinstance(x, tuple) else float(x)
                            return _c(d)+_c(m)/60.0+_c(s)/3600.0
                        except Exception:
                            return None
                    alt_raw = gps_named.get('GPSAltitude')
                    alt_ref = gps_named.get('GPSAltitudeRef')
                    if alt_raw is not None:
                        av = _cv(alt_raw) if not isinstance(alt_raw, (int,float)) else float(alt_raw)
                        if av is not None:
                            # 0 = above sea level, 1 = below
                            if isinstance(alt_ref, (int,float)) and int(alt_ref) == 1:
                                av = -abs(av)
                            alt_v = av
                    head_raw = gps_named.get('GPSImgDirection') or gps_named.get('GPSTrack')
                    if head_raw is not None:
                        hv = _cv(head_raw) if not isinstance(head_raw, (int,float)) else float(head_raw)
                        if hv is not None:
                            head_v = float(hv) % 360.0
                    lat_raw = gps_named.get('GPSLatitude'); lat_ref = gps_named.get('GPSLatitudeRef')
                    lon_raw = gps_named.get('GPSLongitude'); lon_ref = gps_named.get('GPSLongitudeRef')
                    if lat_raw is not None and lon_raw is not None and lat_ref and lon_ref:
                        latd = _to_deg(lat_raw); lond = _to_deg(lon_raw)
                        if latd is not None and lond is not None:
                            if str(lat_ref).upper().startswith('S'):
                                latd = -latd
                            if str(lon_ref).upper().startswith('W'):
                                lond = -lond
                            lat_v = float(latd); lon_v = float(lond)
                            # Reverse geocode (offline if available)
                            try:
                                import reverse_geocoder as rg  # type: ignore
                                res = rg.search((lat_v, lon_v), mode=1)
                                if res and isinstance(res, list):
                                    r0 = res[0]
                                    # name, admin1, cc
                                    place_v = f"{r0.get('name','')}, {r0.get('admin1','')}, {r0.get('cc','')}".strip(', ')
                            except Exception:
                                place_v = None
                # Quality metrics (on downscaled grayscale)
                try:
                    from PIL import ImageOps
                    import numpy as _np
                    g = ImageOps.grayscale(img.copy())
                    # Downscale to speed up
                    g.thumbnail((256, 256))
                    A = _np.asarray(g, dtype=_np.float32)
                    bright = float(A.mean())
                    contrast = float(A.std())
                    # Laplacian variance
                    K = _np.array([[0,1,0],[1,-4,1],[0,1,0]], dtype=_np.float32)
                    # pad reflect
                    P = _np.pad(A, 1, mode='reflect')
                    lap = (
                        K[0,1]*P[0:-2,1:-1] + K[1,0]*P[1:-1,0:-2] + K[1,1]*P[1:-1,1:-1] +
                        K[1,2]*P[1:-1,2:] + K[2,1]*P[2:,1:-1]
                    )
                    sharp = float(lap.var())
                except Exception:
                    bright = None; contrast = None; sharp = None
        except Exception:
            pass
        # Normalize flash (bit 0 indicates fired)
        try:
            if isinstance(flash_v, (int, float)):
                flash_v = int(flash_v)
            else:
                flash_v = None
        except Exception:
            flash_v = None
        try:
            if isinstance(wb_v, (int, float)):
                wb_v = int(wb_v)
            else:
                wb_v = None
        except Exception:
            wb_v = None
        try:
            if isinstance(met_v, (int, float)):
                met_v = int(met_v)
            else:
                met_v = None
        except Exception:
            met_v = None
        out["paths"].append(str(p))
        out["camera"].append(cam)
        out["iso"].append(iso)
        out["fnumber"].append(fn)
        out["exposure"].append(exp)
        out["focal"].append(foc)
        out["width"].append(w)
        out["height"].append(h)
        out["flash"].append(flash_v)
        out["white_balance"].append(wb_v)
        out["metering"].append(met_v)
        out["gps_altitude"].append(alt_v)
        out["gps_heading"].append(head_v)
        out["gps_lat"].append(lat_v)
        out["gps_lon"].append(lon_v)
        out["place"].append(place_v)
        out["sharpness"].append(sharp)
        out["brightness"].append(bright)
        out["contrast"].append(contrast)
        # Update status after each file
        try:
            cur = {}
            try:
                cur = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {}
            except Exception:
                cur = {}
            done += 1
            cur['done'] = int(done)
            cur['updated'] = int(done)
            status_path.write_text(json.dumps(cur), encoding='utf-8')
        except Exception:
            pass
    (index_dir / 'exif_index.json').write_text(json.dumps(out))
    # Mark completion
    try:
        status_path.write_text(json.dumps({
            'state': 'complete',
            'end': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'total': int(len(paths or [])),
            'done': int(done),
            'updated': int(done),
        }), encoding='utf-8')
    except Exception:
        pass
    return out

@app.post("/metadata/build")
def api_build_metadata(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if not store.state.paths:
        return {"updated": 0}
    data = _build_exif_index(store.index_dir, store.state.paths)
    cams = sorted({c for c in data.get('camera',[]) if c})
    places = sorted({p for p in data.get('place',[]) if p})
    out = {"updated": len(store.state.paths or []), "cameras": cams, "places": places}
    _write_event(store.index_dir, { 'type': 'metadata_build', 'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'updated': out['updated'] })
    return out

@app.get("/metadata")
def api_get_metadata(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"cameras": []}
    try:
        data = json.loads(p.read_text())
        cams = sorted({c for c in data.get('camera',[]) if c})
        places = sorted({s for s in data.get('place',[]) if s})
        return {"cameras": cams, "places": places}
    except Exception:
        return {"cameras": [], "places": []}


@app.get("/metadata/batch")
def api_metadata_batch(dir: str, paths: str) -> Dict[str, Any]:
    """Return EXIF/derived metadata for multiple photos in batch to reduce API calls."""
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Parse comma-separated paths
    path_list = [p.strip() for p in paths.split(',') if p.strip()]
    if not path_list:
        return {"ok": False, "meta": {}}

    store = IndexStore(Path(dir))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"ok": False, "meta": {}}

    try:
        data = json.loads(p.read_text())
        paths_data = data.get('paths', [])
        meta_dict = {}

        for path in path_list:
            try:
                i = paths_data.index(path)
            except ValueError:
                continue

            def pick(key):
                arr = data.get(key, [])
                return arr[i] if i < len(arr) else None

            meta_dict[path] = {
                "camera": pick('camera'),
                "iso": pick('iso'),
                "fnumber": pick('fnumber'),
                "exposure": pick('exposure'),
                "focal": pick('focal'),
                "width": pick('width'),
                "height": pick('height'),
                "flash": pick('flash'),
                "white_balance": pick('white_balance'),
                "metering": pick('metering'),
                "gps_lat": pick('gps_lat'),
                "gps_lon": pick('gps_lon'),
                "gps_altitude": pick('gps_altitude'),
                "gps_heading": pick('gps_heading'),
                "place": pick('place'),
                "sharpness": pick('sharpness'),
                "brightness": pick('brightness'),
                "contrast": pick('contrast'),
            }

            # Include filesystem modification time for timeline grouping
            try:
                meta_dict[path]["mtime"] = float(Path(path).stat().st_mtime)
            except Exception:
                meta_dict[path]["mtime"] = None

        return {"ok": True, "meta": meta_dict}
    except Exception:
        return {"ok": False, "meta": {}}


@app.post("/autotag")
def api_autotag(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    min_len: Optional[int] = None,
    max_tags_per_image: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Derive simple tags from captions (if available) and add them to tags.json.
    Heuristic: split on non-letters, lowercase, drop stopwords/short tokens, keep unique tokens.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    min_len_value = _from_body(body, min_len, "min_len", default=4, cast=lambda v: int(v)) or 4
    max_tags_value = _from_body(body, max_tags_per_image, "max_tags_per_image", default=8, cast=lambda v: int(v)) or 8

    folder = Path(dir_value)
    emb = _emb(provider_value, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    cap_p = store.cap_texts_file
    if not cap_p.exists():
        return {"updated": 0}
    try:
        data = json.loads(cap_p.read_text())
        texts = {p: t for p, t in zip(data.get('paths', []), data.get('texts', []))}
    except Exception:
        texts = {}
    stop = set(['the','and','with','for','from','this','that','your','their','over','under','into','near','onto','are','is','of','to','a','an','in','on','by','at','it','its','as','be'])
    import re
    tmap = load_tags(store.index_dir)
    updated = 0
    for p, txt in texts.items():
        if not txt:
            continue
        toks = [w.lower() for w in re.split(r"[^A-Za-z]+", txt) if len(w)>=min_len_value and w.lower() not in stop]
        uniq = []
        for w in toks:
            if w and w not in uniq:
                uniq.append(w)
        if not uniq:
            continue
        cur = set(tmap.get(p, []))
        before = len(cur)
        for w in uniq[:max_tags_value]:
            cur.add(w)
        if len(cur) != before:
            tmap[p] = sorted(cur)
            updated += 1
    save_tags(store.index_dir, tmap)
    return {"updated": updated}


@app.post("/delete")
def api_delete(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    os_trash: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> dict[str, object]:
    """Delete files either to OS Trash (if enabled) or to a local trash folder for undo."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    os_trash_value = _from_body(body, os_trash, "os_trash", default=False, cast=_as_bool) or False

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    store = IndexStore(folder, index_key=None)
    store.load()
    if os_trash_value:
        # Try to use OS trash via send2trash; fall back to app trash on failure
        try:
            from send2trash import send2trash  # type: ignore
            moved = 0
            for p in paths_value:
                sp = Path(p)
                try:
                    sp_res = sp.resolve(); folder_res = folder.resolve()
                    if not str(sp_res).startswith(str(folder_res)):
                        continue
                except Exception:
                    continue
                try:
                    send2trash(str(sp))
                    moved += 1
                except Exception:
                    continue
            # No undo for OS trash path
            return {"ok": True, "moved": moved, "undoable": False, "os_trash": True}
        except Exception:
            # Fall through to app-managed trash if send2trash is unavailable
            pass
    trash_root = store.index_dir / 'trash'
    ts = str(int(time.time()))
    dest_root = trash_root / ts
    moved_list: list[dict[str,str]] = []
    os.makedirs(dest_root, exist_ok=True)
    for p in paths_value:
        sp = Path(p)
        try:
            sp_res = sp.resolve(); folder_res = folder.resolve()
            if not str(sp_res).startswith(str(folder_res)):
                continue
        except Exception:
            continue
        rel = sp.resolve().relative_to(folder.resolve())
        dst = dest_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        try:
            import shutil as _sh; _sh.move(str(sp), str(dst))
            moved_list.append({"src": str(sp), "dst": str(dst)})
        except Exception:
            continue
    global _last_delete
    _last_delete = {"dir": str(folder), "batch": moved_list, "ts": ts}
    try:
        (trash_root / 'last.json').write_text(json.dumps(_last_delete, indent=2), encoding='utf-8')
    except Exception:
        pass
    return {"ok": True, "moved": len(moved_list), "undoable": True, "os_trash": False}


@app.post("/undo_delete")
def api_undo_delete(
    dir: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> dict[str, object]:
    """Undo last delete by moving files back from trash. Best‑effort."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    folder = Path(dir_value)
    trash_root = IndexStore(folder, index_key=None).index_dir / 'trash'
    state = None
    global _last_delete
    if _last_delete and _last_delete.get('dir') == str(folder):
        state = _last_delete
    else:
        p = trash_root / 'last.json'
        if p.exists():
            try:
                state = json.loads(p.read_text(encoding='utf-8'))
            except Exception:
                state = None
    if not state:
        return {"ok": False, "restored": 0}
    restored = 0
    for item in state.get('batch', []):
        src = Path(item.get('dst')); dst = Path(item.get('src'))
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            import shutil as _sh; _sh.move(str(src), str(dst))
            restored += 1
        except Exception:
            continue
    try:
        (trash_root / 'last.json').unlink(missing_ok=True)
    except Exception:
        pass
    _last_delete = None
    return {"ok": True, "restored": restored}


@app.get("/analytics")
def api_analytics(dir: str, limit: int = 200) -> Dict[str, Any]:
    """Return recent analytics events from JSONL log."""
    store = IndexStore(Path(dir))
    events: List[Dict[str, Any]] = []
    try:
        p = _analytics_file(store.index_dir)
        if p.exists():
            lines = p.read_text(encoding='utf-8').splitlines()
            tail = lines[-max(1, int(limit)):] if lines else []
            for ln in tail:
                try:
                    events.append(json.loads(ln))
                except Exception:
                    continue
    except Exception:
        events = []
    return {"events": events}


@app.post("/analytics/log")
def api_analytics_log(
    dir: Optional[str] = None,
    type: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Append a simple event record to analytics log."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    type_value = _require(_from_body(body, type, "type"), "type")
    data_value = _from_body(body, None, "data")

    store = IndexStore(Path(dir_value))
    rec = {
        "type": str(type_value),
        "time": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    if isinstance(data_value, dict):
        try:
            # shallow merge, preferring base keys for safety
            for k, v in data_value.items():
                if k not in rec:
                    rec[k] = v
        except Exception:
            pass
    try:
        f = _analytics_file(store.index_dir)
        f.parent.mkdir(parents=True, exist_ok=True)
        with open(f, 'a', encoding='utf-8') as fh:
            fh.write(json.dumps(rec) + "\n")
    except Exception:
        pass
    return {"ok": True}


# Video Processing APIs
@app.get("/videos")
def api_list_videos(dir: str) -> Dict[str, Any]:
    """List all video files in a directory."""
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    videos = list_videos(folder)
    video_data = []
    for video in videos:
        video_data.append({
            "path": str(video.path),
            "mtime": video.mtime,
            "size": video.path.stat().st_size if video.path.exists() else 0
        })
    
    return {"videos": video_data, "count": len(video_data)}


@app.get("/video/metadata")
def api_get_video_metadata(dir: str, path: str) -> Dict[str, Any]:
    """Get metadata for a specific video file."""
    folder = Path(dir)
    video_path = Path(path)
    
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")
    
    metadata = get_video_metadata(video_path)
    if not metadata:
        raise HTTPException(500, "Could not extract video metadata")
    
    return {"metadata": metadata}


@app.get("/video/thumbnail")
def api_get_video_thumbnail(dir: str, path: str, frame_time: float = 1.0, size: int = 256):
    """Generate and return a thumbnail for a video file."""
    from fastapi.responses import FileResponse
    folder = Path(dir)
    video_path = Path(path)
    
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    if not video_path.exists():
        raise HTTPException(404, "Video file not found")
    
    # Create thumbnail in cache directory
    store = IndexStore(folder)
    thumb_dir = store.index_dir / "video_thumbs"
    thumb_dir.mkdir(exist_ok=True)
    
    # Generate unique filename for thumbnail
    import hashlib
    video_hash = hashlib.md5(str(video_path).encode()).hexdigest()
    thumb_path = thumb_dir / f"{video_hash}_{size}.jpg"
    
    # Generate thumbnail if it doesn't exist
    if not thumb_path.exists():
        success = extract_video_thumbnail(video_path, thumb_path, frame_time)
        if not success:
            raise HTTPException(500, "Could not generate video thumbnail")
    
    return FileResponse(str(thumb_path))


@app.post("/videos/index")
def api_index_videos(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Index video files for search (extract metadata and generate thumbnails)."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    video_store = VideoIndexStore(folder)

    videos = list_videos(folder)
    indexed = 0

    for video in videos:
        try:
            # Extract metadata
            metadata = get_video_metadata(video.path)
            if metadata:
                # Store video metadata
                video_store.add_video(str(video.path), metadata, video.mtime)
                indexed += 1
        except Exception:
            continue

    video_store.save()
    return {"indexed": indexed, "total": len(videos), "provider": provider_value}


# Batch Operations APIs
@app.post("/batch/delete")
def api_batch_delete(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    os_trash: Optional[bool] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Delete multiple files in batch."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    os_trash_value = _from_body(body, os_trash, "os_trash", default=False, cast=_as_bool) or False

    result = api_delete(dir_value, paths_value, os_trash_value)
    return {
        "ok": result["ok"],
        "processed": len(paths_value),
        "moved": result["moved"],
        "failed": len(paths_value) - int(result["moved"]),
        "undoable": result.get("undoable", False),
        "os_trash": result.get("os_trash", False)
    }


@app.post("/batch/tag")
def api_batch_tag(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    tags: Optional[List[str]] = None,
    operation: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Apply tags to multiple files in batch. Operation can be 'add', 'remove', or 'replace'."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    tags_value = _from_body(body, tags, "tags", default=[], cast=_as_str_list) or []
    operation_value = (_from_body(body, operation, "operation", default="add") or "add").lower()

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    store = IndexStore(folder)
    tag_map = load_tags(store.index_dir)
    updated = 0
    for path in paths_value:
        if operation_value == "replace":
            tag_map[path] = sorted(set(tags_value))
            updated += 1
        elif operation_value == "add":
            current_tags = set(tag_map.get(path, []))
            new_tags = current_tags.union(set(tags_value))
            if new_tags != current_tags:
                tag_map[path] = sorted(new_tags)
                updated += 1
        elif operation_value == "remove":
            current_tags = set(tag_map.get(path, []))
            new_tags = current_tags - set(tags_value)
            if new_tags != current_tags:
                tag_map[path] = sorted(new_tags)
                updated += 1

    save_tags(store.index_dir, tag_map)
    return {"ok": True, "updated": updated, "processed": len(paths_value), "operation": operation_value}


@app.post("/batch/collections")
def api_batch_add_to_collection(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    collection_name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Add multiple files to a collection in batch."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    collection_value = _require(_from_body(body, collection_name, "collection_name"), "collection_name")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    store = IndexStore(folder)
    collections = load_collections(store.index_dir)

    current_paths = set(collections.get(collection_value, []))
    new_paths = current_paths.union(set(paths_value))

    collections[collection_value] = sorted(new_paths)
    save_collections(store.index_dir, collections)

    added = len(new_paths) - len(current_paths)
    return {"ok": True, "collection": collection_value, "added": added, "total": len(new_paths)}


# Face Clustering Enhancement APIs
@app.get("/faces/photos")
def api_get_face_photos(dir: str, cluster_id: str) -> Dict[str, Any]:
    """Get all photos containing faces from a specific cluster."""
    store = IndexStore(Path(dir))
    try:
        photos = _face_photos(store.index_dir, cluster_id)
        return {"cluster_id": cluster_id, "photos": photos, "count": len(photos)}
    except Exception:
        raise HTTPException(404, "Face cluster not found")


@app.post("/faces/merge")
def api_merge_face_clusters(
    dir: Optional[str] = None,
    source_cluster_id: Optional[str] = None,
    target_cluster_id: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Merge two face clusters together."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    source_value = _require(_from_body(body, source_cluster_id, "source_cluster_id"), "source_cluster_id")
    target_value = _require(_from_body(body, target_cluster_id, "target_cluster_id"), "target_cluster_id")

    store = IndexStore(Path(dir_value))
    try:
        # This would need implementation in the faces infrastructure
        # For now, return a placeholder response
        return {"ok": True, "merged_into": target_value, "source": source_value, "message": "Cluster merge functionality needs implementation"}
    except Exception:
        raise HTTPException(500, "Could not merge face clusters")


@app.post("/faces/split")
def api_split_face_cluster(
    dir: Optional[str] = None,
    cluster_id: Optional[str] = None,
    photo_paths: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Split selected photos from a face cluster into a new cluster."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    cluster_value = _require(_from_body(body, cluster_id, "cluster_id"), "cluster_id")
    photo_values = _from_body(body, photo_paths, "photo_paths", default=[], cast=_as_str_list) or []

    store = IndexStore(Path(dir_value))
    try:
        # This would need implementation in the faces infrastructure
        # For now, return a placeholder response
        return {"ok": True, "new_cluster_id": f"split_{cluster_value}", "photos": photo_values, "message": "Cluster split functionality needs implementation"}
    except Exception:
        raise HTTPException(500, "Could not split face cluster")


# Progressive Loading APIs
@app.post("/search/paginated")
def api_search_paginated(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    provider: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    favorites_only: Optional[bool] = None,
    tags: Optional[List[str]] = None,
    date_from: Optional[float] = None,
    date_to: Optional[float] = None,
    use_fast: Optional[bool] = None,
    fast_kind: Optional[str] = None,
    use_captions: Optional[bool] = None,
    use_ocr: Optional[bool] = None,
    camera: Optional[str] = None,
    iso_min: Optional[int] = None,
    iso_max: Optional[int] = None,
    f_min: Optional[float] = None,
    f_max: Optional[float] = None,
    place: Optional[str] = None,
    flash: Optional[str] = None,
    wb: Optional[str] = None,
    metering: Optional[str] = None,
    alt_min: Optional[float] = None,
    alt_max: Optional[float] = None,
    heading_min: Optional[float] = None,
    heading_max: Optional[float] = None,
    sharp_only: Optional[bool] = None,
    exclude_underexp: Optional[bool] = None,
    exclude_overexp: Optional[bool] = None,
    has_text: Optional[bool] = None,
    person: Optional[str] = None,
    persons: Optional[List[str]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Paginated search with cursor support for large result sets."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    limit_value = _from_body(body, limit, "limit", default=24, cast=lambda v: int(v)) or 24
    offset_value = _from_body(body, offset, "offset", default=0, cast=lambda v: int(v)) or 0
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")
    favorites_value = _from_body(body, favorites_only, "favorites_only", default=False, cast=_as_bool) or False
    tags_value = _from_body(body, tags, "tags", default=[], cast=_as_str_list) or []
    date_from_value = _from_body(body, date_from, "date_from")
    date_to_value = _from_body(body, date_to, "date_to")
    use_fast_value = _from_body(body, use_fast, "use_fast", default=False, cast=_as_bool) or False
    fast_kind_value = _from_body(body, fast_kind, "fast_kind")
    use_captions_value = _from_body(body, use_captions, "use_captions", default=False, cast=_as_bool) or False
    use_ocr_value = _from_body(body, use_ocr, "use_ocr", default=False, cast=_as_bool) or False
    camera_value = _from_body(body, camera, "camera")
    iso_min_value = _from_body(body, iso_min, "iso_min")
    iso_max_value = _from_body(body, iso_max, "iso_max")
    f_min_value = _from_body(body, f_min, "f_min")
    f_max_value = _from_body(body, f_max, "f_max")
    place_value = _from_body(body, place, "place")
    flash_value = _from_body(body, flash, "flash")
    wb_value = _from_body(body, wb, "wb")
    metering_value = _from_body(body, metering, "metering")
    alt_min_value = _from_body(body, alt_min, "alt_min")
    alt_max_value = _from_body(body, alt_max, "alt_max")
    heading_min_value = _from_body(body, heading_min, "heading_min")
    heading_max_value = _from_body(body, heading_max, "heading_max")
    sharp_only_value = _from_body(body, sharp_only, "sharp_only", default=False, cast=_as_bool) or False
    exclude_under_value = _from_body(body, exclude_underexp, "exclude_underexp", default=False, cast=_as_bool) or False
    exclude_over_value = _from_body(body, exclude_overexp, "exclude_overexp", default=False, cast=_as_bool) or False
    has_text_value = _from_body(body, has_text, "has_text", default=False, cast=_as_bool) or False
    person_value = _from_body(body, person, "person")
    persons_value = _from_body(body, persons, "persons", default=[], cast=_as_str_list) or []

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()

    # Get more results than needed for pagination
    search_top_k = min(limit_value + offset_value + 50, len(store.state.paths or []))

    if use_fast_value:
        try:
            if fast_kind_value and fast_kind_value.lower() == 'faiss' and store.faiss_status().get('exists'):
                results = store.search_faiss(emb, query_value, top_k=search_top_k)
            elif fast_kind_value and fast_kind_value.lower() == 'hnsw' and store.hnsw_status().get('exists'):
                results = store.search_hnsw(emb, query_value, top_k=search_top_k)
            elif fast_kind_value and fast_kind_value.lower() == 'annoy' and store.ann_status().get('exists'):
                results = store.search_annoy(emb, query_value, top_k=search_top_k)
            else:
                if store.faiss_status().get('exists'):
                    results = store.search_faiss(emb, query_value, top_k=search_top_k)
                elif store.hnsw_status().get('exists'):
                    results = store.search_hnsw(emb, query_value, top_k=search_top_k)
                elif store.ann_status().get('exists'):
                    results = store.search_annoy(emb, query_value, top_k=search_top_k)
                else:
                    results = store.search(emb, query_value, top_k=search_top_k)
        except Exception:
            results = store.search(emb, query_value, top_k=search_top_k)
    else:
        if use_captions_value and store.captions_available():
            results = store.search_with_captions(emb, query_value, top_k=search_top_k)
        elif use_ocr_value and store.ocr_available():
            results = store.search_with_ocr(emb, query_value, top_k=search_top_k)
        else:
            results = store.search(emb, query_value, top_k=search_top_k)

    out = results

    # Apply filters (simplified version)
    if favorites_value:
        coll = load_collections(store.index_dir)
        favs = set(coll.get('Favorites', []))
        out = [r for r in out if str(r.path) in favs]

    if tags_value:
        tmap = load_tags(store.index_dir)
        req = set(tags_value)
        out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]

    if date_from_value is not None and date_to_value is not None:
        mmap = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        out = [r for r in out if date_from_value <= mmap.get(str(r.path), 0.0) <= date_to_value]

    # Apply pagination
    total = len(out)
    paginated_results = out[offset_value:offset_value + limit_value]

    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query_value, [(str(r.path), float(r.score)) for r in out])

    return {
        "search_id": sid,
        "results": [{"path": str(r.path), "score": float(r.score)} for r in paginated_results],
        "pagination": {
            "offset": offset_value,
            "limit": limit_value,
            "total": total,
            "has_more": offset_value + limit_value < total
        }
    }


@app.get("/library/paginated")
def api_library_paginated(dir: str, provider: str = "local", limit: int = 120, offset: int = 0, sort: str = "mtime", order: str = "desc") -> Dict[str, Any]:
    """Enhanced library endpoint with sorting and pagination options."""
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    
    paths = store.state.paths or []
    mtimes = store.state.mtimes or []
    
    # Create path-mtime pairs for sorting
    path_data = list(zip(paths, mtimes))
    
    # Sort based on parameters
    if sort == "mtime":
        path_data.sort(key=lambda x: x[1], reverse=(order == "desc"))
    elif sort == "name":
        path_data.sort(key=lambda x: str(x[0]), reverse=(order == "desc"))
    elif sort == "size":
        # Sort by file size (requires disk access)
        path_data.sort(key=lambda x: Path(x[0]).stat().st_size if Path(x[0]).exists() else 0, reverse=(order == "desc"))
    
    # Apply pagination
    total = len(path_data)
    start = max(0, int(offset))
    end = max(start, min(len(path_data), start + int(limit)))
    
    paginated_data = path_data[start:end]
    result_paths = [str(path) for path, _ in paginated_data]
    
    return {
        "total": total,
        "offset": start,
        "limit": int(limit),
        "paths": result_paths,
        "sort": sort,
        "order": order,
        "has_more": end < total
    }


# Video Search API
@app.post("/search_video")
def api_search_video(
    dir: Optional[str] = None,
    query: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Search for videos using semantic search on extracted metadata and keyframes."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    query_value = _require(_from_body(body, query, "query"), "query")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get video index store
    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    # Embed query
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    try:
        qv = emb.embed_text(query_value)
    except Exception:
        raise HTTPException(500, "Embedding failed")

    # Search in video store
    results = video_store.search(qv, top_k=top_k_value)

    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}


@app.post("/search_video_like")
def api_search_video_like(
    dir: Optional[str] = None,
    path: Optional[str] = None,
    top_k: Optional[int] = None,
    provider: Optional[str] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Find visually similar videos based on a reference video."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    path_value = _require(_from_body(body, path, "path"), "path")
    top_k_value = _from_body(body, top_k, "top_k", default=12, cast=lambda v: int(v)) or 12
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")

    # Get video index store
    video_store = VideoIndexStore(folder)
    if not video_store.load():
        return {"results": []}

    # Search for similar videos
    results = video_store.search_like(path_value, top_k=top_k_value)

    return {"results": [{"path": r.path, "score": float(r.score)} for r in results]}
