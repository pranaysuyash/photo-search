from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import json
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import HTMLResponse

from infra.config import config
from api.schemas.v1 import (
    ShareRequest,
    ShareRevokeRequest,
    ShareResponse,
    BaseResponse,
)
from infra.shares import (
    create_share as _share_create,
    is_expired as _share_expired,
    list_shares as _share_list,
    load_share as _share_load,
    revoke_share as _share_revoke,
)

router = APIRouter()

@router.post("/share", response_model=ShareResponse)
def create_share(req: ShareRequest = Body(...)) -> ShareResponse:  # pragma: no cover (thin wrapper)
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
        return ShareResponse(ok=True, token=rec.token, url=url, expires=rec.expires)
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(500, f"Create share failed: {e}") from e

@router.get("/share")
def list_shares(directory: Optional[str] = Query(None, alias="dir")) -> Dict[str, Any]:
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
        return {"shares": out}
    except Exception:  # pragma: no cover - defensive
        return {"shares": []}

@router.post("/share/revoke", response_model=BaseResponse)
def revoke_share(req: ShareRevokeRequest = Body(...)) -> BaseResponse:
    try:
        success = _share_revoke(str(req.token))
        return BaseResponse(ok=bool(success))
    except Exception:  # pragma: no cover
        return BaseResponse(ok=False)

@router.get("/share/detail")
def share_detail(token: str, password: Optional[str] = None) -> Dict[str, Any]:  # kept dict for backward compatibility
    try:
        rec = _share_load(str(token))
        if rec is None:
            raise HTTPException(404, "Share not found")
        if _share_expired(rec):
            return {"ok": False, "error": "expired"}
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
    except Exception as e:  # pragma: no cover - defensive
        raise HTTPException(500, f"Share detail failed: {e}")

@router.get("/share/{token}/view", response_class=HTMLResponse)
def share_view(token: str) -> HTMLResponse:  # pragma: no cover - static HTML
    # Simpler static HTML (no template literals to avoid brace escaping complexity)
    token_json = json.dumps(token)
    html = (
        "<!doctype html><html><head><meta charset='utf-8'/>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
        "<title>Shared Photos</title>"
        "<style>body{font-family:-apple-system,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#0b0b0c;color:#e5e7eb}" \
        "header{padding:12px 16px;border-bottom:1px solid #1f2937;display:flex;align-items:center;justify-content:space-between}" \
        ".container{padding:16px}" \
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}" \
        ".card{position:relative;border:1px solid #1f2937;border-radius:8px;overflow:hidden;background:#111827}" \
        ".card img{width:100%;height:140px;object-fit:cover;display:block}" \
        ".pill{font-size:12px;padding:2px 6px;border-radius:999px;background:#1f2937;color:#9ca3af;margin-left:8px}" \
        "input,button{font:inherit}" \
        ".row{display:flex;align-items:center;gap:8px}" \
        ".row>*{margin-right:8px}</style></head><body>" \
        "<header><div class='row'><div>Shared Photos</div><span id='meta' class='pill'></span></div>" \
        "<div class='row'><input id='pw' type='password' placeholder='Password (if required)' " \
        "style='background:#111827;border:1px solid #1f2937;color:#e5e7eb;border-radius:6px;padding:6px 8px;'/>" \
        "<button id='openBtn' style='background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;'>Open</button></div></header>" \
        "<div class='container'><div id='err' style='color:#fca5a5;display:none;margin:8px 0;'></div><div id='grid' class='grid'></div></div>" \
        "<script>(function(){var token=" + token_json + ";var meta=document.getElementById('meta');var grid=document.getElementById('grid');" \
        "var err=document.getElementById('err');var pw=document.getElementById('pw');var btn=document.getElementById('openBtn');" \
        "function clear(el){while(el.firstChild)el.removeChild(el.firstChild);}function showError(msg){err.textContent=msg;err.style.display='block';}" \
        "async function load(){err.style.display='none';var qs='token='+encodeURIComponent(token);var xpw=pw.value.trim();if(xpw)qs+='&password='+encodeURIComponent(xpw);" \
        "var r=await fetch('/share/detail?'+qs);if(!r.ok){showError('Failed to load share');return;}var data=await r.json();" \
        "if(!data.ok){if(data.error==='password_required'){showError('Password required or incorrect');return;}if(data.error==='expired'){showError('Share expired');return;}showError(data.error||'Unknown error');return;}" \
        "meta.textContent=data.paths.length+' items';clear(grid);for(var i=0;i<data.paths.length;i++){var p=data.paths[i];var img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src='/thumb?path='+encodeURIComponent(p)+'&size=320';" \
        "var card=document.createElement('div');card.className='card';card.appendChild(img);grid.appendChild(card);} }" \
        "btn.addEventListener('click',load);load();})();</script></body></html>"
    )
    return HTMLResponse(content=html)
