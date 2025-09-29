"""
OCR-related endpoints for API v1.
"""
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any, List, Optional
from pathlib import Path
import json

from api.utils import _require, _from_body, _as_str_list, _emb
from api.schemas.v1 import SearchResponse, SearchResultItem
from infra.index_store import IndexStore

# Create router for OCR endpoints
ocr_router = APIRouter(prefix="/ocr", tags=["ocr"])


@ocr_router.post("/build")
def build_ocr_v1(
    dir: Optional[str] = None,
    provider: Optional[str] = None,
    languages: Optional[List[str]] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Build OCR index for the specified directory.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    languages_value = _from_body(body, languages, "languages")
    hf_token_value = _from_body(body, hf_token, "hf_token")
    openai_key_value = _from_body(body, openai_key, "openai_key")

    folder = Path(dir_value)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    
    emb = _emb(provider_value, hf_token_value, openai_key_value)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_ocr(emb, languages=languages_value)
    
    return {"ok": True, "updated": updated}


@ocr_router.get("/status")
def get_ocr_status_v1(
    directory: str,
) -> Dict[str, Any]:
    """
    Get OCR processing status for the specified directory.
    """
    store = IndexStore(Path(directory))
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
                return {"ok": True, "data": data}
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
        return {"ok": True, "data": {'ready': bool(ready), 'count': int(count)}}
    except Exception:
        return {"ok": True, "data": {'ready': False}}


@ocr_router.post("/snippets")
def get_ocr_snippets_v1(
    dir: Optional[str] = None,
    paths: Optional[List[str]] = None,
    limit: Optional[int] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """
    Get OCR text snippets for specified photos.
    """
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    paths_value = _from_body(body, paths, "paths", default=[], cast=_as_str_list) or []
    limit_value = _from_body(body, limit, "limit", default=160, cast=int) or 160

    store = IndexStore(Path(dir_value))
    texts: Dict[str, str] = {}
    try:
        if not store.ocr_texts_file.exists():
            return {"ok": True, "snippets": {}}
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
    
    return {"ok": True, "snippets": texts}