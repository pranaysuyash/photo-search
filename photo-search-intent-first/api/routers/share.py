"""Share router - photo sharing functionality with password protection and expiry."""

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import HTMLResponse

from api.schemas.v1 import (
  BaseResponse,
  ShareRequest,
  ShareResponse,
  ShareRevokeRequest,
  ShareListResponse,
  ShareListItem,
  ShareDetailResponse,
)
from infra.config import config
from infra.shares import (
    create_share as _share_create,
    is_expired as _share_expired,
    list_shares as _share_list,
    load_share as _share_load,
    revoke_share as _share_revoke,
    validate_password as _share_validate,
)

router = APIRouter()


@router.post("/share", response_model=ShareResponse)
def create_share(
  req: ShareRequest = Body(...),
) -> ShareResponse:
    """Create a new share with optional password protection and expiry."""
    folder = Path(req.dir or req.directory)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    try:
        rec = _share_create(
            str(folder),
            req.provider or "local",
            [str(p) for p in req.paths],
            expiry_hours=req.expiry_hours,
            password=req.password,
            view_only=bool(req.view_only),
        )
        url = f"{config.root_url}/share/{rec.token}/view"
        return ShareResponse(
            ok=True,
            token=rec.token,
            url=url,
            expires=rec.expires
        )
    except Exception as e:
        raise HTTPException(500, f"Create share failed: {e}")


@router.get("/share", response_model=ShareListResponse)
def list_shares(directory: Optional[str] = Query(None, alias="dir")) -> ShareListResponse:
    """List all shares, optionally filtered by directory."""
    try:
        items = _share_list(dir_filter=directory)
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
        return ShareListResponse(
            ok=True,
            shares=[
                ShareListItem(
                    token=it["token"],
                    created=it["created"],
                    expires=it["expires"],
                    dir=it["dir"],
                    provider=it["provider"],
                    count=it["count"],
                    view_only=it["view_only"],
                    expired=it["expired"],
                )
                for it in out
            ],
        )
    except Exception:
        # Preserve legacy silent-fail behavior on error (empty list rather than 500)
        return ShareListResponse(ok=True, shares=[])

@router.post("/share/revoke", response_model=BaseResponse)
def revoke_share(
  req: ShareRevokeRequest = Body(...),
) -> BaseResponse:
    """Revoke an existing share by token."""
    try:
        success = _share_revoke(str(req.token))
        return BaseResponse(ok=bool(success))
    except Exception:
        return BaseResponse(ok=False)


@router.get("/share/detail", response_model=ShareDetailResponse)
def get_share_detail(token: str, password: Optional[str] = None) -> ShareDetailResponse:
    """Return share record details; if password protected, require matching password."""
    try:
        rec = _share_load(str(token))
        if rec is None:
            raise HTTPException(404, "Share not found")

        # Expiry check
        if _share_expired(rec):
            return ShareDetailResponse(ok=False, error="expired")

        # Password validation (if set and invalid)
        if not _share_validate(rec, password):
            return ShareDetailResponse(ok=False, error="password_required")

        return ShareDetailResponse(
            ok=True,
            token=rec.token,
            created=rec.created,
            expires=rec.expires,
            dir=rec.dir,
            provider=rec.provider,
            paths=rec.paths or [],
            view_only=bool(rec.view_only),
            has_password=bool(rec.pass_hash),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Share detail failed: {e}")


@router.get("/share/{token}/view", response_class=HTMLResponse)
def view_share(token: str) -> HTMLResponse:
    """Minimal share viewer page. Client fetches /share/detail and renders thumbs."""
    # Simple HTML with inline script
    html = f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <div class="row">
        <div>Shared Photos</div>
        <span id="meta" class="pill"></span>
      </div>
      <div class="row">
        <input id="pw" type="password" placeholder="Password (if required)" style="background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:6px;padding:6px 8px;" />
        <button id="openBtn" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;">Open</button>
      </div>
    </header>
    <div class="container">
      <div id="err" style="color:#fca5a5;display:none;margin:8px 0;"></div>
      <div id="grid" class="grid"></div>
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