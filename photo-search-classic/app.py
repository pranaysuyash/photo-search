import os
import json
import shutil
import platform
from datetime import datetime, date, time as dt_time
from pathlib import Path
import streamlit as st
import numpy as np
try:
    from transformers.utils import logging as hf_logging
    hf_logging.set_verbosity_error()
except Exception:
    pass

from engine import IndexStore, load_model, safe_open_image
from providers import get_provider
from thumbs import get_or_create_thumb
from storage import (
    load_collections,
    save_collections,
    load_tags,
    save_tags,
    all_tags,
    load_saved,
    save_saved,
    load_prefs,
    save_prefs,
)
from analytics import (
    log_search as analytics_log_search,
    log_open as analytics_log_open,
    log_feedback as analytics_log_feedback,
    apply_feedback_boost,
)
from exif import load_exif_dates, preload_capture_dates
from dupes import build_hashes as build_dupe_hashes, find_lookalikes


st.set_page_config(page_title="Photo Search (Classic)", layout="wide")
st.title("📸 Photo Search – Classic")
st.caption("Index your photo folders and search by text using CLIP embeddings.")


DEFAULT_PREFS = {
    "photo_dir": str(Path.home()),
    "batch_size": 32,
    "grid_cols": 6,
    "more_folders": [],
}
prefs = load_prefs(DEFAULT_PREFS)

with st.sidebar:
    st.header("Settings")
    photo_dir = st.text_input("Photo directory", value=str(prefs.get("photo_dir", str(Path.home()))))
    batch_size = st.slider("Batch size", min_value=8, max_value=64, value=int(prefs.get("batch_size", 32)), step=8)
    grid_cols = st.selectbox("Grid columns", options=[3, 4, 6], index={3:0,4:1,6:2}.get(int(prefs.get("grid_cols", 6)), 2))
    provider_label = st.selectbox(
        "AI engine",
        options=["On-device (Recommended)", "On-device (Fast)", "Hugging Face Cloud", "Hugging Face (Caption)", "OpenAI (Captions)"],
        help="On-device keeps everything private. Cloud options may send data to that provider.",
    )
    # Optional keys
    hf_token = None
    openai_key = None
    if provider_label in ("Hugging Face Cloud", "Hugging Face (Caption)"):
        hf_token = st.text_input("Hugging Face API key", type="password", value=os.environ.get("HF_API_TOKEN", ""))
    if provider_label == "OpenAI (Captions)":
        openai_key = st.text_input("OpenAI API key", type="password", value=os.environ.get("OPENAI_API_KEY", ""))
    cols_actions = st.columns([1,1])
    with cols_actions[0]:
        run_index = st.button("Index / Update Photos", type="primary")
    with cols_actions[1]:
        clear_index = st.button("Clear Index")
    prep_thumbs = st.button("Prepare Thumbnails")

    with st.expander("More folders", expanded=False):
        # newline-separated paths
        more_text = "\n".join(prefs.get("more_folders", []))
        more_text = st.text_area("Extra folders (one per line)", value=more_text, height=100, placeholder="/path/one\n/path/two")
        build_all = st.button("Build / Update (all folders)")
        prep_all = st.button("Prepare Thumbnails (all folders)")
    # Persist preferences
    # Normalize folder list
    more_folders = [s.strip() for s in (more_text.splitlines() if 'more_text' in locals() else []) if s.strip()]
    new_prefs = {"photo_dir": photo_dir, "batch_size": batch_size, "grid_cols": grid_cols, "more_folders": more_folders}
    if any(prefs.get(k) != v for k, v in new_prefs.items()):
        save_prefs(new_prefs)
        prefs.update(new_prefs)


def _label_to_provider(label: str) -> str:
    if label.startswith("On-device (Recommended"):
        return "local"
    if label.startswith("On-device (Fast"):
        return "local-fast"
    if label.startswith("Hugging Face"):
        return "hf-caption" if "Caption" in label else "hf"
    return "openai"


@st.cache_resource(show_spinner=False)
def _cached_embedder(prov_key: str, hf_token: str | None, openai_key: str | None):
    try:
        return get_provider(prov_key, hf_token=hf_token, openai_api_key=openai_key)
    except Exception:
        from sentence_transformers import SentenceTransformer
        m = SentenceTransformer("clip-ViT-B-32")
        m.index_id = "st-clip-ViT-B-32"  # type: ignore[attr-defined]
        return m

prov_key = _label_to_provider(provider_label)
emb = _cached_embedder(prov_key, hf_token, openai_key)


@st.cache_resource(show_spinner=False)
def _load_model():
    return load_model()


tab_index, tab_search, tab_browse, tab_map, tab_tools = st.tabs(["Index", "Search", "Browse", "Map", "Tools"])

with tab_index:
    st.subheader("Build or Update Index")
    st.write("Provide a folder path in the sidebar and click the button to index.")
    if run_index:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            model = emb
            store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            with st.spinner("Indexing photos... (downloads model on first run)"):
                new_count, updated_count = store.build_or_update(model, batch_size=batch_size)
            st.success(f"Index complete. New: {new_count}, Updated: {updated_count}, Total: {len(store.paths)}")
            if store.paths:
                st.write("Index path:", store.index_dir)
                preview_cols = st.columns(grid_cols)
                for i, p in enumerate(store.paths[:12]):
                    with preview_cols[i % grid_cols]:
                        img = safe_open_image(Path(p))
                        if img is not None:
                            st.image(img, caption=Path(p).name, width='stretch')
                        else:
                            st.caption(f"Unreadable: {Path(p).name}")
    if prep_thumbs:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            store.load()
            if not store.paths:
                st.info("No index found. Build it first.")
            else:
                made = 0
                for sp, mt in zip(store.paths, store.mtimes):
                    tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=512)
                    if tp is not None:
                        made += 1
                st.success(f"Prepared {made} thumbnails.")

    if clear_index:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            import shutil
            shutil.rmtree(store.index_dir, ignore_errors=True)
            st.success("Index cleared.")
    # Sidebar bulk actions
    if 'build_all' in locals() and build_all:
        folders = [photo_dir] + prefs.get("more_folders", [])
        done = 0
        model = emb
        for f in folders:
            if f and Path(f).exists():
                st.write(f"Indexing: {f}")
                store = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                store.build_or_update(model, batch_size=batch_size)
                done += 1
        st.success(f"Indexed {done} folder(s)")
    if 'prep_all' in locals() and prep_all:
        folders = [photo_dir] + prefs.get("more_folders", [])
        made = 0
        for f in folders:
            if f and Path(f).exists():
                store = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                store.load()
                for sp, mt in zip(store.paths or [], store.mtimes or []):
                    tp = get_or_create_thumb(store.index_dir, Path(sp), float(mt), size=512)
                    if tp is not None:
                        made += 1
        st.success(f"Prepared {made} thumbnails across folders")

with tab_search:
    st.subheader("Search Photos")
    query = st.text_input("Describe what you're looking for (e.g., 'friends having tea')")
    top_k = st.slider("Top K results", min_value=3, max_value=100, value=12, step=1)
    min_score = st.slider("Min score", 0.0, 1.0, 0.0, 0.01)
    # Saved searches
    with st.expander("Saved searches", expanded=False):
        if photo_dir and Path(photo_dir).exists():
            st_cols = st.columns([2,1])
            with st_cols[0]:
                new_name = st.text_input("Name", placeholder="e.g., Tea with friends")
            with st_cols[1]:
                if st.button("Save current query"):
                    store_s = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                    saved = load_saved(store_s.index_dir)
                    saved.append({"name": new_name or f"Search {len(saved)+1}", "query": query.strip()})
                    save_saved(store_s.index_dir, saved)
                    st.success("Saved.")
            store_s = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            saved = load_saved(store_s.index_dir)
            if saved:
                names = [s.get("name", f"Search {i}") for i, s in enumerate(saved)]
                sel = st.selectbox("Pick a saved search", options=[""] + names)
                if sel:
                    idx = names.index(sel)
                    query = saved[idx].get("query", query)
                    st.info(f"Loaded: {sel}")
                if st.button("Delete selected") and sel:
                    idx = names.index(sel)
                    del saved[idx]
                    save_saved(store_s.index_dir, saved)
                    st.success("Deleted.")
        else:
            st.caption("Set a valid folder to save searches.")
    # Tag filter and favorites filter
    fav_only = st.checkbox("Show only Favorites", value=False, key="fav_only_search")
    tag_filter = []
    if photo_dir and Path(photo_dir).exists():
        tstore = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        tag_filter = st.multiselect("Filter by tags", options=all_tags(tstore.index_dir))
    search_all = st.checkbox("Search across all folders", value=False, key="search_all_folders")
    # Date range filter (by capture date if available, else file modified time)
    date_from: date | None = None
    date_to: date | None = None
    use_exif = st.checkbox("Use capture date (EXIF) when available", value=True)
    if photo_dir and Path(photo_dir).exists():
        if search_all:
            folders = [photo_dir] + prefs.get("more_folders", [])
            mts: list[float] = []
            for f in folders:
                if f and Path(f).exists():
                    stx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                    stx.load()
                    if use_exif:
                        ex = load_exif_dates(stx.index_dir)
                        mts.extend(list(ex.values()))
                    else:
                        if stx.mtimes:
                            mts.extend([float(m) for m in stx.mtimes])
        else:
            s0 = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            s0.load()
            if use_exif:
                ex = load_exif_dates(s0.index_dir)
                mts = list(ex.values())
            else:
                mts = [float(m) for m in (s0.mtimes or [])]
        if mts:
            dmin = datetime.fromtimestamp(min(mts)).date()
            dmax = datetime.fromtimestamp(max(mts)).date()
            try:
                df, dt = st.date_input("Date range", value=(dmin, dmax), min_value=dmin, max_value=dmax)
                date_from, date_to = df, dt
            except Exception:
                date_from, date_to = dmin, dmax
    # Soft undo for favorites
    if 'undo_stack' not in st.session_state:
        st.session_state['undo_stack'] = []
    if st.button("Undo last favorite") and st.session_state['undo_stack']:
        last = st.session_state['undo_stack'].pop()
        try:
            store_u = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            coll = load_collections(store_u.index_dir)
            fav = coll.get('Favorites', [])
            if last in fav:
                fav.remove(last)
                coll['Favorites'] = fav
                save_collections(store_u.index_dir, coll)
                st.success("Removed from Favorites")
        except Exception:
            st.warning("Could not undo.")
    search_clicked = st.button("Run Search")

    if search_clicked:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path in the sidebar.")
        elif not query.strip():
            st.warning("Enter a non-empty query.")
        else:
            model = emb
            # Helper: find matching store index dir by path prefix
            def _path_store_idx_dir(p: str, stores: list[tuple[Path, IndexStore]]):
                best = None
                for root, stx in stores:
                    try:
                        if str(p).startswith(str(root)):
                            if best is None or len(str(root)) > len(str(best[0])):
                                best = (root, stx)
                    except Exception:
                        continue
                return best[1].index_dir if best else IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir

            # Collect stores
            if search_all:
                folders = [photo_dir] + prefs.get("more_folders", [])
                stores: list[tuple[Path, IndexStore]] = []
                for f in folders:
                    if f and Path(f).exists():
                        stx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                        stx.load()
                        if stx.embeddings is not None and len(stx.paths) > 0:
                            stores.append((Path(f), stx))
                if not stores:
                    st.info("No indexes found. Build them first.")
                    results = []
                else:
                    with st.spinner("Searching across folders..."):
                        try:
                            q_emb = model.encode([query.strip()], convert_to_numpy=True, normalize_embeddings=True)[0]
                        except Exception:
                            q_emb = model.embed_text(query.strip())
                        cand: list[tuple[str, float]] = []
                        for _, stx in stores:
                            sims = (stx.embeddings @ q_emb).astype(float)
                            # Get per-store top up to top_k to limit memory
                            k = min(top_k, len(sims))
                            idx = np.argpartition(-sims, k - 1)[:k]
                            idx = idx[np.argsort(-sims[idx])]
                            cand.extend([(stx.paths[i], float(sims[i])) for i in idx])
                        # Global top_k
                        if cand:
                            scores = np.array([s for _, s in cand])
                            k = min(top_k, len(cand))
                            gidx = np.argpartition(-scores, k - 1)[:k]
                            gidx = gidx[np.argsort(-scores[gidx])]
                            results = [cand[i] for i in gidx]
                        else:
                            results = []
            else:
                store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                store.load()
                if not store.paths:
                    st.warning("No index found. Build it in the Index tab first.")
                    results = []
                else:
                    with st.spinner("Searching..."):
                        results = store.search(model, query.strip(), top_k=top_k)
            # Apply score + favorites + tag filters
            results = [(p, s) for (p, s) in results if s >= min_score]
            # Date filter
            if (date_from and date_to) and results:
                start_ts = datetime.combine(date_from, dt_time.min).timestamp()
                end_ts = datetime.combine(date_to, dt_time.max).timestamp()
                # Build mtime map(s)
                if search_all:
                    folders = [photo_dir] + prefs.get("more_folders", [])
                    mtmaps: dict[str, dict[str, float]] = {}
                    for f in folders:
                        if f and Path(f).exists():
                            sx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                            sx.load()
                            if use_exif:
                                ex = load_exif_dates(sx.index_dir)
                                mtmaps[str(sx.index_dir)] = ex
                            else:
                                mtmaps[str(sx.index_dir)] = {sp: float(mt) for sp, mt in zip(sx.paths or [], sx.mtimes or [])}
                    def in_range(pth: str) -> bool:
                        for m in mtmaps.values():
                            mt = m.get(pth)
                            if mt is not None:
                                return start_ts <= mt <= end_ts
                        return False
                    results = [(p, s) for (p, s) in results if in_range(p)]
                else:
                    sx = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                    sx.load()
                    if use_exif:
                        mmap = load_exif_dates(sx.index_dir)
                    else:
                        mmap = {sp: float(mt) for sp, mt in zip(sx.paths or [], sx.mtimes or [])}
                    results = [(p, s) for (p, s) in results if start_ts <= mmap.get(p, 0.0) <= end_ts]
            if fav_only and results:
                if search_all:
                    favsets = {}
                    # build favorites per store
                    folders = [photo_dir] + prefs.get("more_folders", [])
                    stores = []
                    for f in folders:
                        if f and Path(f).exists():
                            stx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                            favsets[str(stx.index_dir)] = set(load_collections(stx.index_dir).get('Favorites', []))
                    def is_fav(pth: str) -> bool:
                        idxdir = _path_store_idx_dir(pth, [(Path(f), IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))) for f in folders if f and Path(f).exists()])
                        return pth in favsets.get(str(idxdir), set())
                    results = [(p, s) for (p, s) in results if is_fav(p)]
                else:
                    store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                    fav = set(load_collections(store.index_dir).get('Favorites', []))
                    results = [(p, s) for (p, s) in results if p in fav]
            if tag_filter and results:
                need = set(tag_filter)
                if search_all:
                    # per-store tag map
                    tagmaps = {}
                    folders = [photo_dir] + prefs.get("more_folders", [])
                    for f in folders:
                        if f and Path(f).exists():
                            stx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                            tagmaps[str(stx.index_dir)] = load_tags(stx.index_dir)
                    def has_tags(sp: str) -> bool:
                        idxdir = _path_store_idx_dir(sp, [(Path(f), IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))) for f in folders if f and Path(f).exists()])
                        cur = set(tagmaps.get(str(idxdir), {}).get(sp, []))
                        return need.issubset(cur)
                    results = [(p, s) for (p, s) in results if has_tags(p)]
                else:
                    store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                    tmap = load_tags(store.index_dir)
                    def has_tags(sp: str) -> bool:
                        cur = set(tmap.get(sp, []))
                        return need.issubset(cur)
                    results = [(p, s) for (p, s) in results if has_tags(p)]
                # Apply learned feedback boost before showing
                if results:
                    idx_dir_boost = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                    results = apply_feedback_boost(idx_dir_boost, query.strip(), results)
                if not results:
                    st.info("No results.")
                else:
                    # Analytics: record this served result list
                    idx_dir_an = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                    search_id = analytics_log_search(idx_dir_an, getattr(emb, 'index_id', 'default'), query.strip(), results)
                    # Bulk actions
                    colA, colB, colC = st.columns([1,1,1])
                    with colA:
                        if st.toggle("Download results as CSV"):
                            import pandas as pd
                            df = pd.DataFrame([{ "path": str(p), "score": s } for (p, s) in results])
                            st.download_button("Download CSV", df.to_csv(index=False).encode("utf-8"), file_name="search_results.csv", mime="text/csv")
                    with colB:
                        if st.button("Add all to Favorites") and results:
                            added = 0
                            if search_all:
                                # Group by index_dir
                                folders = [photo_dir] + prefs.get("more_folders", [])
                                groups: dict[str, list[str]] = {}
                                for p, _ in results:
                                    idxdir = _path_store_idx_dir(p, [(Path(f), IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))) for f in folders if f and Path(f).exists()])
                                    groups.setdefault(str(idxdir), []).append(p)
                                for idxdir, paths in groups.items():
                                    coll = load_collections(Path(idxdir))
                                    fav = coll.get('Favorites', [])
                                    for p in paths:
                                        if p not in fav:
                                            fav.append(p)
                                            st.session_state['undo_stack'].append(p)
                                            added += 1
                                    coll['Favorites'] = fav
                                    save_collections(Path(idxdir), coll)
                            else:
                                store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                                coll = load_collections(store.index_dir)
                                fav = coll.get('Favorites', [])
                                for p, _ in results:
                                    if p not in fav:
                                        fav.append(p)
                                        st.session_state['undo_stack'].append(p)
                                        added += 1
                                coll['Favorites'] = fav
                                save_collections(store.index_dir, coll)
                            st.success(f"Added {added} to Favorites")
                    with colC:
                        max_open = min(len(results), 25)
                        if max_open > 0:
                            n_open = st.slider("Open top N in Files", min_value=1, max_value=max_open, value=min(10, max_open), key="openN")
                            sure = st.checkbox("I'm sure", key="openSure")
                            if st.button("Open now") and sure:
                                sysname = platform.system()
                                opened = 0
                                for p, _ in results[:n_open]:
                                    try:
                                        if sysname == 'Darwin':
                                            os.system(f"open -R '{p}'")
                                        elif sysname == 'Windows':
                                            os.system(f"explorer /select, {str(p)}")
                                        else:
                                            os.system(f"xdg-open '{Path(p).parent}'")
                                        opened += 1
                                        analytics_log_open(idx_dir_an, str(p), search_id)
                                    except Exception:
                                        pass
                                st.info(f"Tried to open {opened} items")
                    # Export results
                    with st.expander("Export files", expanded=False):
                        dest = st.text_input("Destination folder", placeholder="/path/to/export")
                        mode = st.radio("Mode", options=["Copy", "Symlink"], horizontal=True)
                        if st.button("Export current results") and dest:
                            Path(dest).mkdir(parents=True, exist_ok=True)
                            copied = 0
                            for p, _ in results:
                                try:
                                    target = Path(dest) / Path(p).name
                                    if mode == "Symlink":
                                        try:
                                            if target.exists():
                                                target.unlink()
                                            os.symlink(p, target)
                                        except Exception:
                                            shutil.copy2(p, target)
                                    else:
                                        shutil.copy2(p, target)
                                    copied += 1
                                except Exception:
                                    pass
                            st.success(f"Exported {copied} files to {dest}")
                    # Mini timeline (results by month)
                    try:
                        buckets: dict[str, int] = {}
                        # Build timestamp lookup
                        if search_all:
                            folders = [photo_dir] + prefs.get("more_folders", [])
                            mtmaps: dict[str, dict[str, float]] = {}
                            for f in folders:
                                if f and Path(f).exists():
                                    sx = IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))
                                    sx.load()
                                    if use_exif:
                                        mtmaps[str(sx.index_dir)] = load_exif_dates(sx.index_dir)
                                    else:
                                        mtmaps[str(sx.index_dir)] = {sp: float(mt) for sp, mt in zip(sx.paths or [], sx.mtimes or [])}
                            for p, _ in results:
                                # find mtime
                                mt_val = None
                                for m in mtmaps.values():
                                    mt_val = m.get(p)
                                    if mt_val is not None:
                                        break
                                if mt_val is not None:
                                    k = datetime.fromtimestamp(mt_val).strftime("%Y-%m")
                                    buckets[k] = buckets.get(k, 0) + 1
                        else:
                            sx = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                            sx.load()
                            if use_exif:
                                mmap = load_exif_dates(sx.index_dir)
                            else:
                                mmap = {sp: float(mt) for sp, mt in zip(sx.paths or [], sx.mtimes or [])}
                            for p, _ in results:
                                mt_val = mmap.get(p)
                                if mt_val is not None:
                                    k = datetime.fromtimestamp(mt_val).strftime("%Y-%m")
                                    buckets[k] = buckets.get(k, 0) + 1
                        if buckets:
                            try:
                                import pandas as pd
                                s = pd.Series(buckets)
                                s = s.sort_index()
                                st.caption("Results by month")
                                st.bar_chart(s, height=140)
                            except Exception:
                                keys = sorted(buckets.keys())
                                st.caption("Results by month: " + ", ".join(f"{k}: {buckets[k]}" for k in keys))
                    except Exception:
                        pass

                    # Selection -> Collection
                    sel_key = 'selection_paths'
                    if sel_key not in st.session_state:
                        st.session_state[sel_key] = set()
                    scl, scr = st.columns([2,1])
                    with scl:
                        col_name = st.text_input("Collection name", placeholder="e.g., Tea with friends")
                        if st.button("Save selection as collection"):
                            if not col_name.strip():
                                st.warning("Enter a collection name.")
                            else:
                                coll = load_collections(store.index_dir)
                                coll[col_name.strip()] = sorted(list(st.session_state[sel_key]))
                                save_collections(store.index_dir, coll)
                                st.success(f"Saved collection '{col_name.strip()}' with {len(st.session_state[sel_key])} items.")
                                st.session_state[sel_key] = set()
                    with scr:
                        st.metric("Selected", len(st.session_state[sel_key]))
                        if st.button("Clear selection"):
                            st.session_state[sel_key] = set()

                    # Build mapping candidates for per-path store when cross-searching
                    store_map_candidates = None
                    if search_all:
                        store_map_candidates = [(Path(f), IndexStore(Path(f), index_key=getattr(emb, 'index_id', None))) for f in [photo_dir] + prefs.get("more_folders", []) if f and Path(f).exists()]
                    cols = st.columns(grid_cols)
                    for i, (p, score) in enumerate(results):
                        with cols[i % grid_cols]:
                            # Use thumbnail if available
                            pth = Path(p)
                            # Guess mtime
                            try:
                                mt = pth.stat().st_mtime
                            except Exception:
                                mt = 0.0
                            if search_all and store_map_candidates is not None:
                                idxdir = _path_store_idx_dir(p, store_map_candidates)
                            else:
                                idxdir = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                            tp = get_or_create_thumb(idxdir, pth, mt, size=512)
                            readable = True
                            if tp is not None:
                                st.image(str(tp), caption=f"{pth.name} (score {score:.3f})", width='stretch')
                                st.caption(str(p))
                            else:
                                img = safe_open_image(pth)
                                if img is not None:
                                    st.image(img, caption=f"{pth.name} (score {score:.3f})", width='stretch')
                                    st.caption(str(p))
                                else:
                                    st.caption(f"Unreadable: {pth.name} (score {score:.3f})")
                                    readable = False
                            # Actions (show even if thumb used; skip on unreadable)
                            if readable:
                                # Favorite button
                                if st.button("♥ Favorite", key=f"fav_{i}"):
                                    # Pick store based on path
                                    if search_all and store_map_candidates is not None:
                                        idxdir = _path_store_idx_dir(p, store_map_candidates)
                                        coll = load_collections(idxdir)
                                    else:
                                        coll = load_collections(IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir)
                                    fav = coll.get('Favorites', [])
                                    if p not in fav:
                                        fav.append(p)
                                        coll['Favorites'] = fav
                                        if search_all:
                                            save_collections(idxdir, coll)
                                        else:
                                            save_collections(IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir, coll)
                                        st.session_state['undo_stack'].append(p)
                                        st.success("Added to Favorites")
                                # Zoom
                                with st.popover("Zoom", use_container_width=True):
                                    st.image(str(p), caption=str(Path(p).name), width=800)
                                # Tagging UI
                                with st.popover("Tag", use_container_width=True):
                                    if search_all and store_map_candidates is not None:
                                        idxdir = _path_store_idx_dir(p, store_map_candidates)
                                        tags_map = load_tags(idxdir)
                                        all_t = all_tags(idxdir)
                                    else:
                                        idxdir = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                                        tags_map = load_tags(idxdir)
                                        all_t = all_tags(idxdir)
                                    cur = tags_map.get(p, [])
                                    sel = st.multiselect("Tags", options=all_t, default=cur)
                                    new_t = st.text_input("Add a new tag", key=f"ntag_{i}")
                                    if st.button("Save tags", key=f"save_tags_{i}"):
                                        final = sel.copy()
                                        if new_t.strip():
                                            final.append(new_t.strip())
                                            final = [t for t in {t.strip() for t in final if t.strip()}]
                                        tags_map[p] = final
                                        save_tags(idxdir, tags_map)
                                        st.success("Tags saved.")
                                # Selection add
                                if st.button("⭐ Add", key=f"addsel_{i}"):
                                    st.session_state[sel_key].add(p)
                                # Reveal in OS
                                if st.button("Reveal", key=f"rev_{i}"):
                                    try:
                                        import platform, subprocess
                                        system = platform.system()
                                        if system == "Darwin":
                                            subprocess.Popen(["open", "-R", str(p)])
                                        elif system == "Windows":
                                            subprocess.Popen(["explorer", f"/select,{str(p)}"])
                                        else:
                                            subprocess.Popen(["xdg-open", str(Path(p).parent)])
                                        analytics_log_open(idx_dir_an, str(p), search_id)
                                    except Exception:
                                        pass

                    # Feedback UI
                    with st.expander("Help improve results", expanded=False):
                        idx_dir_fb = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                        # Offer the current list for marking
                        correct = st.multiselect(
                            "Which results were correct?",
                            options=[p for p, _ in results],
                            format_func=lambda sp: Path(sp).name,
                            key="fb_correct_classic",
                        )
                        note = st.text_input("Any notes?", key="fb_note_classic")
                        if st.button("Submit feedback", key="fb_submit_classic"):
                            try:
                                # search_id from above logging; if missing, synthesize one by re-logging minimal record
                                if 'search_id' not in locals() or not search_id:
                                    search_id_local = analytics_log_search(idx_dir_fb, getattr(emb, 'index_id', 'default'), query.strip(), results)
                                else:
                                    search_id_local = search_id
                                analytics_log_feedback(idx_dir_fb, search_id_local, query.strip(), correct, note)
                                st.success("Thanks! We'll use this to improve ranking.")
                            except Exception:
                                st.info("Could not save feedback right now.")

with tab_browse:
    st.subheader("Browse Indexed Photos")
    if not photo_dir or not Path(photo_dir).exists():
        st.info("Set a valid directory in the sidebar and build the index.")
    else:
        store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        store.load()
        paths_all = store.paths or []
        fav_only_browse = st.checkbox("Show only Favorites", value=False, key="fav_only_browse")
        if fav_only_browse:
            coll = load_collections(store.index_dir)
            fav = set(coll.get('Favorites', []))
            paths = [p for p in paths_all if p in fav]
        else:
            paths = paths_all
        # Collections panel
        with st.expander("Collections", expanded=False):
            coll = load_collections(store.index_dir)
            names = sorted(coll.keys())
            if names:
                pick = st.selectbox("Select a collection", options=names)
                if pick:
                    items = coll.get(pick, [])
                    if st.checkbox("Only Favorites in this collection", value=False, key="only_favorites_in_collection_browse"):
                        favs = set(coll.get('Favorites', []))
                        items = [p for p in items if p in favs]
                    st.caption(f"{len(items)} photos in '{pick}'")
                    # Export CSV
                    if st.button("Export CSV", key="coll_csv"):
                        import pandas as pd
                        df = pd.DataFrame([{ "path": str(p) } for p in items])
                        st.download_button("Download CSV", df.to_csv(index=False).encode("utf-8"), file_name=f"{pick}.csv", mime="text/csv")
        total = len(paths)
        if not total:
            st.info("No index found. Build it in the Index tab.")
        else:
            page_size = st.selectbox("Page size", [12, 24, 48], index=0)
            pages = (total + page_size - 1) // page_size
            page = st.number_input("Page", min_value=1, max_value=max(1, pages), value=1, step=1)
            start = (page - 1) * page_size
            end = min(start + page_size, total)
            cols = st.columns(grid_cols)
            for i, p in enumerate(paths[start:end]):
                with cols[i % grid_cols]:
                    pp = Path(p)
                    try:
                        mt = pp.stat().st_mtime
                    except Exception:
                        mt = 0.0
                    tp = get_or_create_thumb(store.index_dir, pp, float(mt), size=512)
                    if tp is not None:
                        st.image(str(tp), caption=pp.name, width='stretch')
                        st.caption(str(p))
                    else:
                        img = safe_open_image(pp)
                        if img is not None:
                            st.image(img, caption=pp.name, width='stretch')
                            st.caption(str(p))
                        else:
                            st.caption(f"Unreadable: {pp.name}")

with tab_map:
    st.subheader("See photos on a map")
    limit = st.slider("Max photos to plot", min_value=100, max_value=5000, value=1000, step=100)
    show_btn = st.button("Show map")
    if show_btn:
        try:
            from PIL import Image, ExifTags
            import pandas as pd
            store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
            store.load()
            paths = store.paths or []
            inv = {v:k for k,v in ExifTags.TAGS.items()}
            pts = []
            def to_deg(val):
                try:
                    d,m,s = val
                    def cv(x):
                        return float(x[0])/float(x[1]) if isinstance(x, tuple) else float(x)
                    return cv(d)+cv(m)/60.0+cv(s)/3600.0
                except Exception:
                    return None
            for p in paths[:limit]:
                try:
                    img = Image.open(p)
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
            if pts:
                df = pd.DataFrame(pts)
                st.map(df[['lat','lon']])
                st.caption(f"Plotted {len(df)} photos with GPS data")
            else:
                st.info("No location data found in these photos.")
        except Exception:
            st.warning("Could not read map data.")

with tab_tools:
    st.subheader("Tools")
    if not photo_dir or not Path(photo_dir).exists():
        st.info("Set a valid directory in the sidebar to use tools.")
    else:
        store = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        store.load()
        if not store.paths:
            st.info("No index found. Build it in the Index tab.")
        else:
            st.markdown("- Precompute capture dates for faster date filters and timelines.")
            if st.button("Precompute capture dates (EXIF)"):
                n = preload_capture_dates(store.index_dir, store.paths)
                st.success(f"Recorded {n} capture dates.")
            st.divider()
            st.markdown("- Find look‑alike photos (beta).")
            cols = st.columns([1,1,2])
            with cols[0]:
                if st.button("Prepare look‑alike data"):
                    updated = build_dupe_hashes(store.index_dir, store.paths)
                    st.success(f"Added {updated} new image hashes.")
            with cols[1]:
                max_dist = st.slider("Similarity (smaller = more similar)", min_value=1, max_value=16, value=5)
            with cols[2]:
                run = st.button("Find look‑alikes")
            if run:
                with st.spinner("Grouping similar photos…"):
                    groups = find_lookalikes(store.index_dir, max_distance=max_dist)
                if not groups:
                    st.info("No similar groups found.")
                else:
                    st.success(f"Found {len(groups)} groups.")
                    export_root = st.text_input("Export selected to folder", placeholder="/path/to/dupes")
                    for gi, grp in enumerate(groups[:100]):
                        st.write(f"Group {gi+1} – {len(grp)} photos")
                        gcols = st.columns(min(6, grid_cols))
                        selected = []
                        for i, sp in enumerate(grp):
                            with gcols[i % len(gcols)]:
                                p = Path(sp)
                                try:
                                    mt = p.stat().st_mtime
                                except Exception:
                                    mt = 0.0
                                tp = get_or_create_thumb(store.index_dir, p, float(mt), size=384)
                                if tp is not None:
                                    st.image(str(tp), caption=p.name, width='stretch')
                                else:
                                    st.image(str(p), caption=p.name, width='stretch')
                                if st.checkbox("Select", key=f"sel_{gi}_{i}"):
                                    selected.append(sp)
                                if st.button("Reveal", key=f"rev_dupe_{gi}_{i}"):
                                    try:
                                        import subprocess
                                        sysname = platform.system()
                                        if sysname == 'Darwin':
                                            subprocess.Popen(["open", "-R", str(p)])
                                        elif sysname == 'Windows':
                                            subprocess.Popen(["explorer", f"/select,{str(p)}"])
                                        else:
                                            subprocess.Popen(["xdg-open", str(p.parent)])
                                    except Exception:
                                        pass
                        if selected and export_root and st.button("Export selected", key=f"exp_{gi}"):
                            Path(export_root).mkdir(parents=True, exist_ok=True)
                            copied = 0
                            for sp in selected:
                                try:
                                    tgt = Path(export_root) / Path(sp).name
                                    shutil.copy2(sp, tgt)
                                    copied += 1
                                except Exception:
                                    pass
                            st.success(f"Exported {copied} files to {export_root}")
