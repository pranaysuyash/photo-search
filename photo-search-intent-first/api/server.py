from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from adapters.provider_factory import get_provider
from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from infra.index_store import IndexStore
from infra.collections import load_collections, save_collections, load_smart_collections, save_smart_collections
from infra.tags import load_tags, save_tags, all_tags
from usecases.manage_saved import load_saved, save_saved
from infra.analytics import log_search, log_feedback
from infra.dupes import find_lookalikes, load_resolved, save_resolved, _group_id  # type: ignore
from infra.thumbs import get_or_create_thumb, get_or_create_face_thumb
from infra.faces import build_faces as _build_faces, list_clusters as _face_list, set_cluster_name as _face_name, photos_for_person as _face_photos, load_faces as _faces_load
from infra.trips import build_trips as _build_trips, load_trips as _load_trips
from infra.edits import apply_ops as _edit_apply_ops, upscale as _edit_upscale, EditOps as _EditOps
from adapters.vlm_caption_hf import VlmCaptionHF
import shutil, os
import json

from PIL import Image, ExifTags


app = FastAPI(title="Photo Search – Intent-First API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/todo")
def api_todo() -> Dict[str, Any]:
    """Return the repository TODO.md contents for in-app Tasks view."""
    try:
        # server.py -> api -> intent-first -> repo root
        repo_root = Path(__file__).resolve().parents[2]
        todo_path = repo_root / 'TODO.md'
        if not todo_path.exists():
            return {"text": "# TODO\nNo TODO.md found."}
        return {"text": todo_path.read_text(encoding='utf-8')}
    except Exception:
        return {"text": "# TODO\nUnable to load TODO.md."}


def _emb(provider: str, hf_token: Optional[str], openai_key: Optional[str], st_model: Optional[str] = None,
         tf_model: Optional[str] = None, hf_model: Optional[str] = None) -> Any:
    return get_provider(provider, hf_token=hf_token, openai_api_key=openai_key, st_model=st_model, tf_model=tf_model, hf_model=hf_model)


@app.post("/index")
def api_index(dir: str, provider: str = "local", batch_size: int = 32, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    new_c, upd_c, total = index_photos(folder, batch_size=batch_size, embedder=emb)
    return {"new": new_c, "updated": upd_c, "total": total}


@app.post("/search")
def api_search(
    dir: str,
    query: str,
    top_k: int = 12,
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_key: Optional[str] = None,
    favorites_only: bool = False,
    tags: Optional[List[str]] = None,
    date_from: Optional[float] = None,
    date_to: Optional[float] = None,
    use_fast: bool = False,
    fast_kind: Optional[str] = None,
    use_captions: bool = False,
    use_ocr: bool = False,
    camera: Optional[str] = None,
    iso_min: Optional[int] = None,
    iso_max: Optional[int] = None,
    f_min: Optional[float] = None,
    f_max: Optional[float] = None,
    place: Optional[str] = None,
    flash: Optional[str] = None,  # 'fired' | 'noflash'
    wb: Optional[str] = None,     # 'auto' | 'manual'
    metering: Optional[str] = None, # e.g., 'average','center','spot','matrix','partial'
    alt_min: Optional[float] = None,
    alt_max: Optional[float] = None,
    heading_min: Optional[float] = None,
    heading_max: Optional[float] = None,
    sharp_only: bool = False,
    exclude_underexp: bool = False,
    exclude_overexp: bool = False,
    has_text: bool = False,
    person: Optional[str] = None,
    persons: Optional[List[str]] = None,
) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    # Basic search via usecase or fast search
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
                # Choose best available
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
    # Favorites filter
    if favorites_only:
        coll = load_collections(store.index_dir)
        favs = set(coll.get('Favorites', []))
        out = [r for r in out if str(r.path) in favs]
    # Person filter (named face clusters)
    if person:
        try:
            ppl = set(_face_photos(store.index_dir, person))
            out = [r for r in out if str(r.path) in ppl]
        except Exception:
            out = out
    # Tags filter
    if tags:
        tmap = load_tags(store.index_dir)
        req = set(tags)
        out = [r for r in out if req.issubset(set(tmap.get(str(r.path), [])))]
    # Person filters (single or AND across multiple people)
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
    # Date filter (by mtimes)
    if date_from is not None and date_to is not None:
        mmap = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        out = [r for r in out if date_from <= mmap.get(str(r.path), 0.0) <= date_to]
    # Log search
    # EXIF-based filtering if metadata exists
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
            def ok(p:str) -> bool:
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
                    # EXIF WhiteBalance: 0 Auto, 1 Manual
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
                    # Common EXIF MeteringMode values
                    mm = {
                        0: 'unknown', 1: 'average', 2: 'center', 3: 'spot', 4: 'multispot', 5: 'pattern', 6: 'partial', 255: 'other'
                    }
                    label = mm.get(int(mv), 'other')
                    if name not in (label, 'any'):
                        # Allow 'matrix' as alias for 'pattern'
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
                    # Normalize heading 0..360
                    try:
                        hh = float(hv) % 360.0
                    except Exception:
                        hh = hv
                    if heading_min is not None and hh < float(heading_min):
                        return False
                if heading_max is not None and hh > float(heading_max):
                    return False
                # Quality heuristics (optional)
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
    except Exception:
        pass

    # OCR filters: has_text and quoted exact match (if OCR built)
    try:
        texts_map = {}
        if hasattr(store, 'ocr_texts_file') and store.ocr_texts_file.exists():
            d = json.loads(store.ocr_texts_file.read_text())
            texts_map = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        # has_text filter
        if 'has_text' in locals() and bool(locals().get('has_text')):
            out = [r for r in out if (texts_map.get(str(r.path), '').strip() != '')]
        # quoted substrings inside query (both double and single quotes)
        import re as _re
        d_parts = _re.findall(r'"([^"]+)"', query)
        s_parts = _re.findall(r"'([^']+)'", query)
        req = (d_parts or []) + (s_parts or [])
        if req:
            low = {p: texts_map.get(p, '').lower() for p in texts_map.keys()}
            def has_all(pth: str) -> bool:
                s = low.get(pth, '')
                return all(x.lower() in s for x in req)
            out = [r for r in out if has_all(str(r.path))]
    except Exception:
        pass
    sid = log_search(store.index_dir, getattr(emb, 'index_id', 'default'), query, [(str(r.path), float(r.score)) for r in out])
    return {"search_id": sid, "results": [{"path": str(r.path), "score": float(r.score)} for r in out]}


@app.post("/captions/build")
def api_build_captions(dir: str, vlm_model: str = "Qwen/Qwen2-VL-2B-Instruct", provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    vlm = VlmCaptionHF(model=vlm_model, hf_token=hf_token)
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_captions(vlm, emb)
    return {"updated": updated}


# Faces (People & Pets)
@app.post("/faces/build")
def api_build_faces(dir: str, provider: str = "local") -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, None, None)
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
def api_faces_name(dir: str, cluster_id: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return _face_name(store.index_dir, cluster_id, name)


# Trips & Events
@app.post("/trips/build")
def api_trips_build(dir: str, provider: str = "local") -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, None, None)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    return _build_trips(store.index_dir, store.state.paths or [], store.state.mtimes or [])


@app.get("/trips")
def api_trips_list(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"trips": _load_trips(store.index_dir)}


@app.post("/search_workspace")
def api_search_workspace(dir: str, query: str, top_k: int = 12, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None,
                         favorites_only: bool = False, tags: Optional[List[str]] = None, date_from: Optional[float] = None, date_to: Optional[float] = None,
                         place: Optional[str] = None, has_text: bool = False, person: Optional[str] = None, persons: Optional[List[str]] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
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
    # build combined search
    try:
        qv = emb.embed_text(query)
    except Exception:
        raise HTTPException(500, "Embedding failed")
    import numpy as np
    E_list = []; paths: List[str] = []
    for s in stores:
        if s.state.embeddings is not None and len(s.state.embeddings) > 0:
            E_list.append(s.state.embeddings)
            paths.extend(s.state.paths)
    if not E_list:
        return {"search_id": None, "results": []}
    E = np.vstack(E_list).astype('float32')
    sims = (E @ qv).astype(float)
    k = max(1, min(top_k, len(sims)))
    idx = np.argpartition(-sims, k - 1)[:k]
    idx = idx[np.argsort(-sims[idx])]
    # Convert to SearchResults-like tuples for filters
    out_pairs = [(paths[i], float(sims[i])) for i in idx]
    # Apply filters
    if favorites_only:
        favset = set()
        for s in stores:
            coll = load_collections(s.index_dir)
            favset.update(coll.get('Favorites', []))
        out_pairs = [(p, s) for (p, s) in out_pairs if p in favset]
    if tags:
        req = set(tags)
        # merge tags
        tmap: Dict[str, List[str]] = {}
        for s in stores:
            for k,v in (load_tags(s.index_dir)).items():
                tmap[k] = v
        out_pairs = [(p, s) for (p, s) in out_pairs if req.issubset(set(tmap.get(p, [])))]
    if date_from is not None and date_to is not None:
        mmap: Dict[str, float] = {}
        for s in stores:
            mmap.update({sp: float(mt) for sp, mt in zip(s.state.paths or [], s.state.mtimes or [])})
        out_pairs = [(p, s) for (p, s) in out_pairs if date_from <= mmap.get(p, 0.0) <= date_to]
    # Person filter(s)
    try:
        if persons and isinstance(persons, list) and len(persons) > 0:
            sets: List[set] = []
            for nm in persons:
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
        elif person:
            ppl = set()
            for s in stores:
                try:
                    ppl.update(set(_face_photos(s.index_dir, str(person))))
                except Exception:
                    continue
            out_pairs = [(p, sc) for (p, sc) in out_pairs if p in ppl]
    except Exception:
        pass
    # EXIF place filter
    if place and str(place).strip():
        place_map: Dict[str, str] = {}
        for s in stores:
            try:
                meta_p = s.index_dir / 'exif_index.json'
                if meta_p.exists():
                    m = json.loads(meta_p.read_text())
                    place_map.update({p: (str(v or '')) for p, v in zip(m.get('paths',[]), m.get('place',[]))})
            except Exception:
                continue
        pl = str(place).strip().lower()
        out_pairs = [(p, sc) for (p, sc) in out_pairs if pl in (place_map.get(p,'') or '').lower()]
    # OCR has_text filter
    if has_text:
        texts_map: Dict[str, str] = {}
        for s in stores:
            try:
                if hasattr(s, 'ocr_texts_file') and s.ocr_texts_file.exists():
                    d = json.loads(s.ocr_texts_file.read_text())
                    texts_map.update({p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))})
            except Exception:
                continue
        out_pairs = [(p, sc) for (p, sc) in out_pairs if (texts_map.get(p, '').strip() != '')]
    # Log
    sid = log_search(primary.index_dir, getattr(emb, 'index_id', 'default'), query, out_pairs)
    return {"search_id": sid, "results": [{"path": p, "score": sc} for (p, sc) in out_pairs]}


@app.get("/favorites")
def api_get_favorites(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    return {"favorites": coll.get('Favorites', [])}


@app.post("/favorites")
def api_set_favorite(dir: str, path: str, favorite: bool = True) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    fav = coll.get('Favorites', [])
    if favorite:
        if path not in fav:
            fav.append(path)
    else:
        fav = [p for p in fav if p != path]
    coll['Favorites'] = fav
    save_collections(store.index_dir, coll)
    return {"ok": True, "favorites": fav}


@app.get("/tags")
def api_get_tags(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"tags": load_tags(store.index_dir), "all": all_tags(store.index_dir)}


@app.post("/tags")
def api_set_tags(dir: str, path: str, tags: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    t = load_tags(store.index_dir)
    t[path] = sorted({s.strip() for s in tags if s.strip()})
    save_tags(store.index_dir, t)
    return {"ok": True, "tags": t[path]}


@app.get("/saved")
def api_get_saved(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"saved": load_saved(store.index_dir)}


@app.post("/saved")
def api_add_saved(dir: str, name: str, query: str, top_k: int = 12) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    saved = load_saved(store.index_dir)
    saved.append({"name": name, "query": query, "top_k": int(top_k)})
    save_saved(store.index_dir, saved)
    return {"ok": True, "saved": saved}


@app.post("/saved/delete")
def api_delete_saved(dir: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    saved = load_saved(store.index_dir)
    before = len(saved)
    saved = [s for s in saved if str(s.get("name")) != name]
    save_saved(store.index_dir, saved)
    return {"ok": True, "deleted": before - len(saved), "saved": saved}


# Collections CRUD
@app.get("/collections")
def api_get_collections(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"collections": load_collections(store.index_dir)}

@app.post("/collections")
def api_set_collection(dir: str, name: str, paths: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    coll[name] = sorted(set(paths))
    save_collections(store.index_dir, coll)
    return {"ok": True, "collections": coll}

@app.post("/collections/delete")
def api_delete_collection(dir: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    coll = load_collections(store.index_dir)
    if name in coll:
        del coll[name]
        save_collections(store.index_dir, coll)
        return {"ok": True, "deleted": name}
    return {"ok": False, "deleted": None}


# Smart Collections CRUD + resolve
@app.get("/smart_collections")
def api_get_smart_collections(dir: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    return {"smart": load_smart_collections(store.index_dir)}


@app.post("/smart_collections")
def api_set_smart_collection(dir: str, name: str, rules: Dict[str, Any]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    data = load_smart_collections(store.index_dir)
    data[name] = rules
    save_smart_collections(store.index_dir, data)
    return {"ok": True, "smart": data}


@app.post("/smart_collections/delete")
def api_delete_smart_collection(dir: str, name: str) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    data = load_smart_collections(store.index_dir)
    if name in data:
        del data[name]
        save_smart_collections(store.index_dir, data)
        return {"ok": True, "deleted": name}
    return {"ok": False, "deleted": None}


@app.post("/smart_collections/resolve")
def api_resolve_smart_collection(dir: str, name: str, provider: str = "local", top_k: int = 24, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    data = load_smart_collections(store.index_dir)
    rules = data.get(name)
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
        results = store.search_with_captions(emb, query or '', top_k=top_k)
    elif use_ocr and store.ocr_available():
        results = store.search_with_ocr(emb, query or '', top_k=top_k)
    else:
        results = store.search(emb, query or '', top_k=top_k)
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
def api_feedback(dir: str, search_id: str, query: str, positives: List[str], note: str = "") -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    log_feedback(store.index_dir, search_id, query, positives, note)
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
def api_resolve_lookalike(dir: str, group_paths: List[str]) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    gid = _group_id(group_paths)
    ids = load_resolved(store.index_dir)
    if gid not in ids:
        ids.append(gid)
    save_resolved(store.index_dir, ids)
    return {"ok": True, "id": gid}


# Extras now that we have a proper frontend
@app.post("/ocr/build")
def api_build_ocr(dir: str, provider: str = "local", languages: Optional[List[str]] = None, hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    updated = store.build_ocr(emb, languages=languages)
    return {"updated": updated}


@app.post("/fast/build")
def api_build_fast(dir: str, kind: str = "faiss", trees: int = 50, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    ok = False
    if kind.lower() == 'faiss':
        ok = store.build_faiss()
    elif kind.lower() == 'hnsw':
        ok = store.build_hnsw()
    else:
        ok = store.build_annoy(trees=trees)
    return {"ok": ok, "kind": kind}


@app.post("/thumbs")
def api_build_thumbs(dir: str, size: int = 512, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    made = 0
    for sp, mt in zip(store.state.paths or [], store.state.mtimes or []):
        tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=size)
        if tp is not None:
            made += 1
    return {"made": made}


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


@app.get("/thumb")
def api_thumb(dir: str, path: str, provider: str = "local", size: int = 512, hf_token: Optional[str] = None, openai_key: Optional[str] = None):
    from fastapi.responses import FileResponse
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    try:
        idx_map = {sp: float(mt) for sp, mt in zip(store.state.paths or [], store.state.mtimes or [])}
        mtime = idx_map.get(path, 0.0)
        tp = get_or_create_thumb(store.index_dir, Path(path), float(mtime), size=size)
        if tp is None or not tp.exists():
            raise HTTPException(404, "Thumb not found")
        return FileResponse(str(tp))
    except Exception:
        raise HTTPException(404, "Thumb not found")


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
def api_search_like(dir: str, path: str, top_k: int = 12, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    out = store.search_like(path, top_k=top_k)
    return {"results": [{"path": str(r.path), "score": float(r.score)} for r in out]}


@app.post("/search_like_plus")
def api_search_like_plus(dir: str, path: str, top_k: int = 12, text: Optional[str] = None, weight: float = 0.5, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if store.state.embeddings is None or not store.state.paths:
        return {"results": []}
    try:
        i = store.state.paths.index(path)
    except ValueError:
        return {"results": []}
    import numpy as np
    q_img = store.state.embeddings[i].astype('float32')
    if text and text.strip():
        try:
            q_txt = emb.embed_text(text).astype('float32')
        except Exception:
            q_txt = np.zeros_like(q_img)
    else:
        q_txt = np.zeros_like(q_img)
    w = max(0.0, min(1.0, float(weight)))
    q = ((1.0 - w) * q_img + w * q_txt).astype('float32')
    # Normalize if possible
    norm = float(np.linalg.norm(q))
    if norm > 0:
        q = q / norm
    E = store.state.embeddings.astype('float32')
    sims = (E @ q).astype(float)
    k = max(1, min(top_k, len(sims)))
    idx = np.argpartition(-sims, k - 1)[:k]
    idx = idx[np.argsort(-sims[idx])]
    return {"results": [{"path": str(store.state.paths[i]), "score": float(sims[i])} for i in idx]}


@app.post("/ocr/snippets")
def api_ocr_snippets(dir: str, paths: List[str], limit: int = 160) -> Dict[str, Any]:
    store = IndexStore(Path(dir))
    texts: Dict[str, str] = {}
    try:
        if not store.ocr_texts_file.exists():
            return {"snippets": {}}
        d = json.loads(store.ocr_texts_file.read_text())
        base = {p: (t or '') for p, t in zip(d.get('paths', []), d.get('texts', []))}
        def mk_snip(s: str) -> str:
            try:
                s = ' '.join(s.split())
                return s[: max(0, limit)].strip()
            except Exception:
                return s[: max(0, limit)] if s else ''
        for p in paths or []:
            t = base.get(p, '')
            if t:
                texts[p] = mk_snip(t)
    except Exception:
        texts = {}
    return {"snippets": texts}
@app.post("/open")
def api_open(dir: str, path: str) -> Dict[str, Any]:
    p = Path(path)
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


@app.post("/edit/ops")
def api_edit_ops(dir: str, path: str, rotate: int = 0, flip: Optional[str] = None, crop: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    folder = Path(dir)
    p = Path(path)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    ops = _EditOps(rotate=int(rotate or 0), flip=flip, crop=crop)
    out = _edit_apply_ops(store.index_dir, p, ops)
    return {"out_path": str(out)}


@app.post("/edit/upscale")
def api_edit_upscale(dir: str, path: str, scale: int = 2, engine: str = "pil") -> Dict[str, Any]:
    folder = Path(dir)
    p = Path(path)
    if not folder.exists() or not p.exists():
        raise HTTPException(400, "Folder or file not found")
    store = IndexStore(folder)
    out = _edit_upscale(store.index_dir, p, scale=scale, engine=engine)
    return {"out_path": str(out)}


@app.post("/export")
def api_export(dir: str, paths: List[str], dest: str, mode: str = "copy", strip_exif: bool = False, overwrite: bool = False) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    dest_dir = Path(dest).expanduser()
    try:
        dest_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        raise HTTPException(400, "Cannot create destination")
    copied = 0; skipped = 0; errors = 0
    for sp in paths:
        src = Path(sp)
        if not src.exists():
            errors += 1; continue
        out = dest_dir / src.name
        if out.exists() and not overwrite:
            skipped += 1; continue
        try:
            if mode.lower() == 'symlink':
                try:
                    if out.exists(): out.unlink()
                    os.symlink(src, out)
                    copied += 1
                    continue
                except Exception:
                    pass
            if strip_exif:
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


@app.post("/workspace/add")
def api_workspace_add(path: str) -> Dict[str, Any]:
    ws = load_workspace()
    if path not in ws:
        ws.append(path)
        save_workspace(ws)
    return {"folders": ws}


@app.post("/workspace/remove")
def api_workspace_remove(path: str) -> Dict[str, Any]:
    ws = load_workspace()
    ws = [p for p in ws if p != path]
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
    (index_dir / 'exif_index.json').write_text(json.dumps(out))
    return out

@app.post("/metadata/build")
def api_build_metadata(dir: str, provider: str = "local", hf_token: Optional[str] = None, openai_key: Optional[str] = None) -> Dict[str, Any]:
    folder = Path(dir)
    if not folder.exists():
        raise HTTPException(400, "Folder not found")
    emb = _emb(provider, hf_token, openai_key)
    store = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
    store.load()
    if not store.state.paths:
        return {"updated": 0}
    data = _build_exif_index(store.index_dir, store.state.paths)
    cams = sorted({c for c in data.get('camera',[]) if c})
    places = sorted({p for p in data.get('place',[]) if p})
    return {"updated": len(store.state.paths or []), "cameras": cams, "places": places}

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


@app.get("/metadata/detail")
def api_metadata_detail(dir: str, path: str) -> Dict[str, Any]:
    """Return EXIF/derived metadata for a single photo path if available."""
    store = IndexStore(Path(dir))
    p = store.index_dir / 'exif_index.json'
    if not p.exists():
        return {"ok": False, "meta": {}}
    try:
        data = json.loads(p.read_text())
        paths = data.get('paths', [])
        try:
            i = paths.index(path)
        except ValueError:
            return {"ok": False, "meta": {}}
        def pick(key):
            arr = data.get(key, [])
            return arr[i] if i < len(arr) else None
        meta = {
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
        return {"ok": True, "meta": meta}
    except Exception:
        return {"ok": False, "meta": {}}


@app.post("/autotag")
def api_autotag(dir: str, provider: str = "local", min_len: int = 4, max_tags_per_image: int = 8) -> Dict[str, Any]:
    """Derive simple tags from captions (if available) and add them to tags.json.
    Heuristic: split on non-letters, lowercase, drop stopwords/short tokens, keep unique tokens.
    """
    folder = Path(dir)
    emb = _emb(provider, None, None)
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
        toks = [w.lower() for w in re.split(r"[^A-Za-z]+", txt) if len(w)>=min_len and w.lower() not in stop]
        uniq = []
        for w in toks:
            if w and w not in uniq:
                uniq.append(w)
        if not uniq:
            continue
        cur = set(tmap.get(p, []))
        before = len(cur)
        for w in uniq[:max_tags_per_image]:
            cur.add(w)
        if len(cur) != before:
            tmap[p] = sorted(cur)
            updated += 1
    save_tags(store.index_dir, tmap)
    return {"updated": updated}
