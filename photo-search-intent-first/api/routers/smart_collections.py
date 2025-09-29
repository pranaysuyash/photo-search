"""Smart Collections router - manage and resolve smart collections with search integration."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from api.utils import _emb, _from_body, _require, _zip_meta
from infra.analytics import log_search
from infra.collections import load_collections, load_smart_collections, save_smart_collections
from infra.faces import photos_for_person as _face_photos
from infra.index_store import IndexStore
from infra.tags import load_tags

router = APIRouter()


@router.get("/smart_collections")
def get_smart_collections(directory: str = Query(..., alias="dir")) -> Dict[str, Any]:
    """Get all smart collections for a directory."""
    store = IndexStore(Path(directory))
    return {"smart": load_smart_collections(store.index_dir)}


@router.post("/smart_collections")
def set_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    rules: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Create or update a smart collection with rules."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    rules_value = _from_body(body, rules, "rules", default={}) or {}

    store = IndexStore(Path(dir_value))
    data = load_smart_collections(store.index_dir)
    data[name_value] = rules_value
    save_smart_collections(store.index_dir, data)
    return {"ok": True, "smart": data}


@router.post("/smart_collections/delete")
def delete_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Delete a smart collection."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")

    store = IndexStore(Path(dir_value))
    data = load_smart_collections(store.index_dir)
    if name_value in data:
        del data[name_value]
        save_smart_collections(store.index_dir, data)
        return {"ok": True, "deleted": name_value}
    return {"ok": False, "deleted": None}


@router.post("/smart_collections/resolve")
def resolve_smart_collection(
    dir: Optional[str] = None,
    name: Optional[str] = None,
    provider: Optional[str] = None,
    top_k: Optional[int] = None,
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    body: Optional[Dict[str, Any]] = Body(None),
) -> Dict[str, Any]:
    """Resolve smart collection rules into actual search results."""
    dir_value = _require(_from_body(body, dir, "dir"), "dir")
    name_value = _require(_from_body(body, name, "name"), "name")
    provider_value = _from_body(body, provider, "provider", default="local") or "local"
    top_k_value = _from_body(body, top_k, "top_k", default=24, cast=int) or 24
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
    date_from = rules.get('dateFrom')
    date_to = rules.get('dateTo')
    use_captions = bool(rules.get('useCaptions'))
    use_ocr = bool(rules.get('useOcr'))
    place = rules.get('place')
    person = rules.get('person')
    persons = rules.get('persons') or None
    camera = rules.get('camera')
    iso_min = rules.get('isoMin')
    iso_max = rules.get('isoMax')
    f_min = rules.get('fMin')
    f_max = rules.get('fMax')
    flash = rules.get('flash')
    wb = rules.get('wb')
    metering = rules.get('metering')
    alt_min = rules.get('altMin')
    alt_max = rules.get('altMax')
    heading_min = rules.get('headingMin')
    heading_max = rules.get('headingMax')
    sharp_only = bool(rules.get('sharpOnly'))
    exclude_underexp = bool(rules.get('excludeUnder'))
    exclude_overexp = bool(rules.get('excludeOver'))
    
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
            cam_map = _zip_meta(
                m,
                "camera",
                lambda value: value if isinstance(value, str) else "",
            )
            iso_map = _zip_meta(
                m,
                "iso",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            f_map = _zip_meta(
                m,
                "f_number",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            place_map = _zip_meta(
                m,
                "place",
                lambda value: value if isinstance(value, str) else "",
            )
            flash_map = _zip_meta(
                m,
                "flash",
                lambda value: value if isinstance(value, str) else "",
            )
            wb_map = _zip_meta(
                m,
                "white_balance",
                lambda value: value if isinstance(value, str) else "",
            )
            met_map = _zip_meta(
                m,
                "metering_mode",
                lambda value: value if isinstance(value, str) else "",
            )
            alt_map = _zip_meta(
                m,
                "altitude",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            head_map = _zip_meta(
                m,
                "heading",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            sharp_map = _zip_meta(
                m,
                "sharpness",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            bright_map = _zip_meta(
                m,
                "brightness",
                lambda value: value if isinstance(value, (int, float)) else None,
            )
            
            def ok(p: str) -> bool:
                if camera and str(camera).strip():
                    if str(camera).strip().lower() not in (cam_map.get(p,'') or '').lower():
                        return False
                if iso_min is not None:
                    iv = iso_map.get(p)
                    if iv is None or iv < iso_min:
                        return False
                if iso_max is not None:
                    iv = iso_map.get(p)
                    if iv is None or iv > iso_max:
                        return False
                if f_min is not None:
                    fv = f_map.get(p)
                    if fv is None or fv < f_min:
                        return False
                if f_max is not None:
                    fv = f_map.get(p)
                    if fv is None or fv > f_max:
                        return False
                if flash and str(flash).strip():
                    if str(flash).strip().lower() not in (flash_map.get(p,'') or '').lower():
                        return False
                if wb and str(wb).strip():
                    if str(wb).strip().lower() not in (wb_map.get(p,'') or '').lower():
                        return False
                if metering and str(metering).strip():
                    if str(metering).strip().lower() not in (met_map.get(p,'') or '').lower():
                        return False
                if alt_min is not None:
                    av = alt_map.get(p)
                    if av is None or av < alt_min:
                        return False
                if alt_max is not None:
                    av = alt_map.get(p)
                    if av is None or av > alt_max:
                        return False
                if heading_min is not None:
                    hv = head_map.get(p)
                    if hv is None or hv < heading_min:
                        return False
                if heading_max is not None:
                    hv = head_map.get(p)
                    if hv is None or hv > heading_max:
                        return False
                if sharp_only:
                    sv = sharp_map.get(p)
                    if sv is None or sv < 100.0:
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
    except Exception:
        out = out
    
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query, [(str(r.path), float(r.score)) for r in out])
    return {"search_id": sid, "results": [{"path": str(r.path), "score": float(r.score)} for r in out]}