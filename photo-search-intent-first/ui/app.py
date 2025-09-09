from pathlib import Path
import os
import sys
import typing as t
import platform

import streamlit as st

try:
    from transformers.utils import logging as hf_logging
    hf_logging.set_verbosity_error()
except Exception:
    pass

# Ensure project root is on sys.path so imports work when running from ui/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from adapters.fs_scanner import safe_open_image
from adapters.provider_factory import get_provider
from infra.index_store import IndexStore
from infra.prefs import load_prefs, save_prefs, DEFAULTS
from infra.thumbs import get_or_create_thumb
from usecases.manage_collections import load_collections, save_collections
from usecases.manage_tags import load_tags, save_tags, all_tags
from usecases.manage_saved import load_saved, save_saved
from infra.dupes import build_hashes, find_lookalikes
from infra.workspace import load_workspace, save_workspace
from infra.workspace_index import WorkspaceIndex
import numpy as np
from infra.workspace import load_workspace, save_workspace
from infra.workspace_index import WorkspaceIndex
import numpy as np


def label_to_provider(label: str) -> str:
    if label.startswith("On-device (Recommended"):
        return "local"
    if label.startswith("On-device (Compatible"):
        return "local-compat"
    if label.startswith("Hugging Face"):
        return "hf-caption" if "Caption" in label else "hf"
    return "openai"


@st.cache_resource(show_spinner=False)
def cached_embedder(
    prov_key: str,
    hf_token: t.Optional[str],
    openai_key: t.Optional[str],
    st_model: t.Optional[str],
    tf_model: t.Optional[str],
    hf_model: t.Optional[str],
    oai_cap_model: t.Optional[str],
    oai_emb_model: t.Optional[str],
):
    return get_provider(
        prov_key,
        hf_token=hf_token,
        openai_api_key=openai_key,
        st_model=st_model,
        tf_model=tf_model,
        hf_model=hf_model,
        openai_caption_model=oai_cap_model,
        openai_embed_model=oai_emb_model,
    )


st.set_page_config(page_title="Photo Search (Intent-First)", layout="wide")
st.title("📸 Photo Search – Intent-First")
st.caption("Find any photo fast by describing it. Private by default; choose a cloud engine only if you want.")

prefs = load_prefs()

with st.sidebar:
    st.header("Getting Started")
    photo_dir = st.text_input(
        "Your photo folder",
        value=prefs.get("photo_dir", str(Path.home())),
        help="Choose the folder with your photos. We'll scan it and build a private index on your device.",
    )
    grid_cols = st.selectbox("Grid layout", options=[3, 4, 6], index={3: 0, 4: 1, 6: 2}.get(int(prefs.get("grid_cols", 6)), 2))
    provider_label = st.selectbox(
        "AI engine",
        options=["On-device (Recommended)", "On-device (Compatible)", "Hugging Face Cloud", "Hugging Face (Caption)", "OpenAI (Captions)"],
        index={
            "On-device (Recommended)": 0,
            "On-device (Compatible)": 1,
            "Hugging Face Cloud": 2,
            "Hugging Face (Caption)": 3,
            "OpenAI (Captions)": 4,
        }.get(prefs.get("provider_label", "On-device (Recommended)"), 0),
        help="On-device keeps everything private. Cloud engines can work better in some cases but send data to that provider.",
    )
    hf_token = None
    openai_key = None
    if provider_label in ("Hugging Face Cloud", "Hugging Face (Caption)"):
        hf_token = st.text_input(
            "Hugging Face API key",
            type="password",
            value=os.environ.get("HF_API_TOKEN", ""),
            help="Used only to contact Hugging Face. Not saved.",
        )
    if provider_label == "OpenAI (Captions)":
        openai_key = st.text_input(
            "OpenAI API key",
            type="password",
            value=os.environ.get("OPENAI_API_KEY", ""),
            help="Captions each image, then searches captions. Slow and may incur cost.",
        )
    with st.expander("Advanced settings", expanded=False):
        batch_size = st.slider(
            "Indexing speed",
            min_value=8,
            max_value=64,
            value=int(prefs.get("batch_size", 32)),
            step=8,
            help="Higher is faster but uses more memory.",
        )
        use_ann = st.checkbox(
            "Faster search for huge folders (Annoy)",
            value=bool(prefs.get("use_ann", False)),
            help="Build a special index to speed up search in very large libraries.",
        )
        use_faiss = st.checkbox(
            "Fastest search (FAISS) if available",
            value=bool(prefs.get("use_faiss", False)),
            help="If FAISS is installed, use it for very fast search.",
        )
        ann_trees = st.slider(
            "Speed vs accuracy",
            min_value=10,
            max_value=200,
            value=int(prefs.get("ann_trees", 50)),
            step=10,
            help="Higher values are more accurate but take longer to build.",
        )
        use_ocr = st.checkbox(
            "Use OCR (if available) to improve text-in-image matches",
            value=bool(prefs.get("use_ocr", False)),
            help="Requires EasyOCR installed; heavy operation on first run.",
        )
        ocr_langs = ["en"]
        if use_ocr:
            ocr_langs = st.multiselect(
                "OCR languages",
                options=["en","es","fr","de","it","pt","nl","sv","da","no","fi","pl","tr"],
                default=prefs.get("ocr_langs", ["en"]),
                help="Pick the languages most common in your photos",
            )
        # Optional model overrides per provider
        tf_model = st_model = hf_model = oai_cap_model = oai_emb_model = None
        if provider_label == "On-device (Recommended)":
            tf_model = st.text_input("Model (advanced)", value="openai/clip-vit-base-patch32")
        if provider_label == "On-device (Compatible)":
            st_model = st.text_input("Model (advanced)", value="clip-ViT-B-32")
        if provider_label == "Hugging Face Cloud":
            hf_model = st.text_input("Model (advanced)", value="sentence-transformers/clip-ViT-B-32")
        if provider_label == "OpenAI (Captions)":
            oai_cap_model = st.text_input("Caption model (advanced)", value="gpt-4o-mini")
            oai_emb_model = st.text_input("Embedding model (advanced)", value="text-embedding-3-small")

    with st.expander("Help & About", expanded=False):
        st.markdown(
            "- Private by default: on-device engine keeps your photos on your computer.\n"
            "- Cloud engines: send data to the provider you choose (HF/OpenAI). Keys are used in-session only.\n"
            "- Faster search: use Annoy/FAISS for very large libraries; if not installed, search falls back to standard.\n"
            "- Tips: keep your library organized; re-run Build after adding photos; use Filters to narrow by date.\n"
            "- Troubleshooting: if search fails, check your folder is accessible and retry Build; for unreadable files, they’re skipped.\n"
        )
        # Engine status
        if st.checkbox("Show engine status"):
            ok_ann = False
            ok_faiss = False
            try:
                import annoy  # noqa: F401
                ok_ann = True
            except Exception:
                ok_ann = False
            try:
                import faiss  # type: ignore  # noqa: F401
                ok_faiss = True
            except Exception:
                ok_faiss = False
            st.write(f"Annoy available: {'✅' if ok_ann else '❌'}  •  FAISS available: {'✅' if ok_faiss else '❌'}")

        # Docs
        repo_root = PROJECT_ROOT.parent
        if st.checkbox("Show approach differences"):
            diff_path = repo_root / "DIFFERENCES.md"
            if diff_path.exists():
                st.markdown(diff_path.read_text())
            else:
                st.info("DIFFERENCES.md not found.")
        if st.checkbox("Show intent handbook (summary)"):
            hb = PROJECT_ROOT / "docs" / "intent_first_handbook.md"
            if hb.exists():
                # Show first ~120 lines to keep it light
                lines = hb.read_text(encoding="utf-8", errors="ignore").splitlines()
                st.markdown("\n".join(lines[:120]))
                if len(lines) > 120:
                    st.caption("(Truncated) Open the file for full content.")
            else:
                st.info("intent_first_handbook.md not found.")
        if st.checkbox("Show roadmap"):
            rb = PROJECT_ROOT.parent / "ROADMAP.md"
            if rb.exists():
                st.markdown(rb.read_text())
            else:
                st.info("ROADMAP.md not found.")

    # Workspace folders management
    with st.expander("More folders", expanded=False):
        ws = load_workspace()
        new_folder = st.text_input("Add folder path", key="ws_add_path", placeholder="/path/to/another/photos")
        if st.button("Add Folder", key="ws_add_btn"):
            if new_folder.strip() and Path(new_folder).exists():
                if new_folder not in ws:
                    ws.append(new_folder)
                    save_workspace(ws)
                    st.success("Folder added.")
                    st.experimental_rerun()
                else:
                    st.info("Folder already added.")
            else:
                st.warning("Enter a valid path.")
        if ws:
            st.caption("In your library:")
            for i, p in enumerate(ws):
                c1, c2 = st.columns([1, 4])
                with c2:
                    st.text(p)
                with c1:
                    if st.button("Remove", key=f"ws_rm_{i}"):
                        ws.pop(i)
                        save_workspace(ws)
                        st.experimental_rerun()
        # Whether to search across all folders
        use_workspace_search = st.checkbox("Search across all folders", value=False, key="use_workspace_search", help="Search the primary folder and any added folders together.")

    act_cols = st.columns([1, 1, 1])
    with act_cols[0]:
        run_index = st.button("Build / Update Library", type="primary")
    with act_cols[1]:
        clear_index = st.button("Clear Index")
    with act_cols[2]:
        build_fast = st.button("Prepare Faster Search")


tab_build, tab_search, tab_browse, tab_map, tab_preflight = st.tabs(["Build", "Search", "Browse", "Map", "Preflight"])

with tab_build:
    st.subheader("Build your photo library (Step 1 of 2)")
    if run_index:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            prov = label_to_provider(provider_label)
            with st.spinner("Building your private index… (first run may download the AI model)"):
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                try:
                    new_count, updated_count, total = index_photos(
                        Path(photo_dir),
                        batch_size=batch_size,
                        provider=prov,
                        hf_token=hf_token,
                        openai_api_key=openai_key,
                        embedder=emb,
                    )
                except Exception as e:
                    st.error(f"Indexing failed: {e}")
                    st.stop()
            st.success(f"All set! Added {new_count} new and refreshed {updated_count}. Total photos indexed: {total}.")
            # Prepare OCR if requested
            if use_ocr:
                with st.spinner("Extracting text (OCR)…"):
                    built = store_preview.build_ocr(emb, languages=ocr_langs)
                st.caption(f"OCR ready (processed {built} images).")
            # Optional: prepare faster search
            if use_ann or use_faiss:
                store_prev = IndexStore(Path(photo_dir), index_key=getattr(emb, "index_id", None))
                ok = False
                if use_faiss:
                    ok = store_prev.build_faiss()
                else:
                    ok = store_prev.build_annoy(trees=ann_trees)
                st.caption("Faster search prepared." if ok else "Could not prepare faster search (library missing or no photos).")

            # Preview first 12 images from index (thumbnails)
            store_preview = IndexStore(Path(photo_dir), index_key=getattr(emb, "index_id", None))
            store_preview.load()
            paths = [Path(p) for p in (store_preview.state.paths[:12] if store_preview.state.paths else [])]
            if paths:
                cols = st.columns(grid_cols)
                for i, p in enumerate(paths):
                    with cols[i % grid_cols]:
                        mtime = p.stat().st_mtime if p.exists() else 0.0
                        tpath = get_or_create_thumb(store_preview.index_dir, p, mtime, size=locals().get('thumb_size', 512))
                        if tpath is not None:
                            st.image(str(tpath), caption=p.name, width='stretch')
                        else:
                            img = safe_open_image(p)
                            if img is not None:
                                st.image(img, caption=p.name, width='stretch')
                            else:
                                st.caption(f"Unreadable: {p.name}")

            # Auto-precache thumbnails for small libraries
            total_paths = len(store_preview.state.paths or [])
            cache_flag = f"thumbs_precached::{getattr(emb, 'index_id', 'default')}::{photo_dir}"
            if total_paths and total_paths <= 500 and not st.session_state.get(cache_flag, False):
                with st.spinner("Preparing thumbnails for faster browsing…"):
                    prog = st.progress(0)
                    for i, p in enumerate(store_preview.state.paths, 1):
                        path = Path(p)
                        mtime = path.stat().st_mtime if path.exists() else 0.0
                        _ = get_or_create_thumb(store_preview.index_dir, path, mtime, size=locals().get('thumb_size', 512))
                        if i % 10 == 0 or i == total_paths:
                            prog.progress(int(i * 100 / max(1, total_paths)))
                st.session_state[cache_flag] = True
                st.caption("Thumbnails ready.")

            # Optional: Precache thumbnails for all photos
            if store_preview.state.paths:
                if st.button("Precache Thumbnails"):
                    total_paths = len(store_preview.state.paths)
                    prog = st.progress(0)
                    for i, p in enumerate(store_preview.state.paths, 1):
                        path = Path(p)
                        mtime = path.stat().st_mtime if path.exists() else 0.0
                        _ = get_or_create_thumb(store_preview.index_dir, path, mtime, size=locals().get('thumb_size', 512))
                        if i % 10 == 0 or i == total_paths:
                            prog.progress(int(i * 100 / max(1, total_paths)))
                    st.success("Thumbnails ready.")

    if clear_index:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            prov = label_to_provider(provider_label)
            emb_clear = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
            store = IndexStore(Path(photo_dir), index_key=getattr(emb_clear, "index_id", None))
            import shutil
            shutil.rmtree(store.index_dir, ignore_errors=True)
            st.success("Index cleared.")

    if build_fast:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path.")
        else:
            prov = label_to_provider(provider_label)
            emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
            store = IndexStore(Path(photo_dir), index_key=getattr(emb, "index_id", None))
            store.load()
            ok = False
            if use_faiss:
                ok = store.build_hnsw() if locals().get("use_hnsw", False) else store.build_faiss()
            elif use_ann:
                ok = store.build_annoy(trees=ann_trees)
            st.success("Faster search prepared.") if ok else st.warning("Not prepared (missing library or no photos).")
        # Workspace tools
        with st.expander("Workspace tools", expanded=False):
            ws_list = load_workspace()
            if st.button("Build all folders", key="ws_build_all"):
                prov = label_to_provider(provider_label)
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                targets = [Path(photo_dir)] + [Path(p) for p in ws_list if Path(p).exists()]
                prog = st.progress(0)
                total = len(targets)
                import pandas as pd
                rows = []
                for idx, folder in enumerate(targets, 1):
                    try:
                        new_c, upd_c, tot = index_photos(folder, batch_size=batch_size, provider=prov, hf_token=hf_token, openai_api_key=openai_key, embedder=emb)
                        rows.append({"folder": str(folder), "new": new_c, "updated": upd_c, "total": tot, "status": "✅"})
                    except Exception as e:
                        rows.append({"folder": str(folder), "new": 0, "updated": 0, "total": 0, "status": f"❌ {e}"})
                    prog.progress(int(idx * 100 / max(1, total)))
                if rows:
                    st.dataframe(pd.DataFrame(rows))
                    st.caption("Peek at search data for a folder:")
                    for folder in targets:
                        colx1, colx2 = st.columns([6,1])
                        with colx1:
                            st.text(str(folder))
                        with colx2:
                            if st.button("Show", key=f"open_data_{str(folder)}"):
                                try:
                                    fstore = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
                                    if platform.system() == 'Darwin':
                                        os.system(f"open {fstore.index_dir}")
                                    elif platform.system() == 'Windows':
                                        os.system(f"start {fstore.index_dir}")
                                    else:
                                        os.system(f"xdg-open {fstore.index_dir}")
                                except Exception:
                                    st.info(str(fstore.index_dir))
                # Auto-prepare workspace fast index if enabled
                auto_ok = False
                if locals().get("use_hnsw", False) or use_faiss or use_ann:
                    stores = []
                    for folder in targets:
                        s = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
                        s.load()
                        stores.append(s)
                    wsi = WorkspaceIndex(getattr(emb, 'index_id', 'default'))
                    total_paths, dim = wsi.build_from_stores(stores)
                    if locals().get("use_hnsw", False):
                        auto_ok = wsi.build_hnsw()
                    elif use_faiss:
                        auto_ok = wsi.build_hnsw() if locals().get("use_hnsw", False) else wsi.build_faiss()
                    elif use_ann:
                        auto_ok = wsi.build_annoy(trees=ann_trees)
                    st.caption(f"Workspace fast search data ready for {total_paths} photos." if auto_ok else "Workspace fast search data not prepared.")
                st.success("All folders indexed.")
            if st.button("Prepare faster search (all)", key="ws_fast_all"):
                prov = label_to_provider(provider_label)
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                targets = [Path(photo_dir)] + [Path(p) for p in ws_list if Path(p).exists()]
                stores = []
                for folder in targets:
                    s = IndexStore(folder, index_key=getattr(emb, 'index_id', None))
                    s.load()
                    stores.append(s)
                wsi = WorkspaceIndex(getattr(emb, 'index_id', 'default'))
                total_paths, dim = wsi.build_from_stores(stores)
                ok = False
                if use_faiss:
                    ok = wsi.build_hnsw() if locals().get("use_hnsw", False) else wsi.build_faiss()
                elif use_ann:
                    ok = wsi.build_annoy(trees=ann_trees)
                st.success(f"Workspace fast search ready for {total_paths} photos.") if ok else st.warning("Not ready (missing library or no photos).")
            # Show workspace search data folder
            ws_base = Path.home() / ".photo_search" / "workspace_index" / getattr(emb, 'index_id', 'default').replace('/', '_').replace(' ', '-').replace(':','-')
            if st.button("Show workspace search data"):
                try:
                    if platform.system() == 'Darwin':
                        os.system(f"open {ws_base}")
                    elif platform.system() == 'Windows':
                        os.system(f"start {ws_base}")
                    else:
                        os.system(f"xdg-open {ws_base}")
                except Exception:
                    st.info(str(ws_base))

        
        # Convenience: open the index folder
        sysname = platform.system()
        if st.button("Open Index Folder"):
            try:
                idx = Path(photo_dir)
                prov = label_to_provider(provider_label)
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                idx_store = IndexStore(idx, index_key=getattr(emb, "index_id", None))
                if sysname == "Darwin":
                    os.system(f"open {idx_store.index_dir}")
                elif sysname == "Windows":
                    os.system(f"start {idx_store.index_dir}")
                else:
                    os.system(f"xdg-open {idx_store.index_dir}")
            except Exception:
                st.info(str(idx_store.index_dir))

with tab_search:
    st.subheader("Search your photos (Step 2 of 2)")
    st.caption("Try one:")
    suggs = [
        "friends having tea",
        "birthday cake",
        "sunset on the beach",
        "hiking in mountains",
        "dog in park",
    ]
    s_cols = st.columns(len(suggs))
    for i, s in enumerate(suggs):
        if s_cols[i].button(s, key=f"sugg_{i}"):
            st.session_state["query_text"] = s
            st.rerun()
    query = st.text_input("Describe the moment", key="query_text", placeholder="e.g., friends having tea", help="Use natural language, just like you'd describe the photo.")
    top_k = st.slider("Number of results", min_value=3, max_value=100, value=12, step=1)
    compact_mode = st.toggle("Compact results", value=False, help="Smaller cards; more per row")
    list_mode = st.toggle("List mode", value=False, help="List with tiny thumbs and paths")
    # Soft Undo (session-scoped)
    if 'undo_stack' not in st.session_state:
        st.session_state['undo_stack'] = []
    undo_clicked = st.button("Undo last change")
    if undo_clicked and st.session_state['undo_stack']:
        last = st.session_state['undo_stack'].pop()
        try:
            if last.get('type') == 'selection':
                sel_key = 'selected_paths'
                if sel_key in st.session_state and last.get('path') in st.session_state[sel_key]:
                    st.session_state[sel_key].discard(last.get('path'))
                    st.success("Removed from selection")
            elif last.get('type') == 'favorite':
                from infra.collections import load_collections, save_collections
                prov = label_to_provider(provider_label)
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                store_u = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                coll = load_collections(store_u.index_dir)
                fav = coll.get('Favorites', [])
                if last.get('path') in fav:
                    fav.remove(last.get('path'))
                    coll['Favorites'] = fav
                    save_collections(store_u.index_dir, coll)
                    st.success("Removed from Favorites")
            elif last.get('type') == 'tags':
                from infra.tags import load_tags, save_tags
                prov = label_to_provider(provider_label)
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                store_u = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                tags_map = load_tags(store_u.index_dir)
                tags_map[last.get('path')] = last.get('prev', [])
                save_tags(store_u.index_dir, tags_map)
                st.success("Reverted tags")
        except Exception:
            st.warning("Could not undo last change.")
    run_search = st.button("Run Search")
    # Saved searches
    with st.expander("Saved searches", expanded=False):
        prov = label_to_provider(provider_label)
        emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
        store_s = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        saved = load_saved(store_s.index_dir)
        names = [s.get("name", f"Search {i}") for i, s in enumerate(saved)]
        if names:
            pick = st.selectbox("Run a saved search", options=["-"] + names)
            if pick and pick != "-":
                i = names.index(pick)
                s = saved[i]
                st.session_state["query_text"] = s.get("query", "")
                st.session_state["saved_params"] = s
                st.rerun()
        colA, colB = st.columns([2,1])
        with colA:
            new_name = st.text_input("Name")
        with colB:
            if st.button("Save current"):
                params = {
                    "name": new_name or f"Search {len(saved)+1}",
                    "query": st.session_state.get("query_text", ""),
                    "top_k": int(top_k),
                }
                saved.append(params)
                save_saved(store_s.index_dir, saved)
                st.success("Saved.")
        if names:
            if st.button("Delete selected") and pick and pick != "-":
                saved.pop(names.index(pick))
                save_saved(store_s.index_dir, saved)
                st.success("Deleted.")
    # Recent queries row
    rq_key = "recent_queries"
    if rq_key not in st.session_state:
        st.session_state[rq_key] = []
    recent = st.session_state[rq_key]
    if recent:
        st.caption("Recent:")
        qcols = st.columns(min(len(recent), 6))
        for i, qv in enumerate(recent[:12]):
            if qcols[i % len(qcols)].button(qv, key=f"rq_{i}"):
                st.session_state["query_text"] = qv
                st.rerun()
    if run_search:
        if not photo_dir or not Path(photo_dir).exists():
            st.error("Please provide a valid directory path in the sidebar.")
        elif not query.strip():
            st.warning("Enter a non-empty query.")
        else:
            prov = label_to_provider(provider_label)
            with st.spinner("Searching…"):
                emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
                # Prepare stores list (primary + optional workspace folders)
                stores = []
                primary = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                primary.load()
                stores.append((Path(photo_dir), primary))
                ws_list = load_workspace()
                for f in ws_list:
                    fpath = Path(f)
                    if fpath.exists() and str(fpath) != str(Path(photo_dir)):
                        stx = IndexStore(fpath, index_key=getattr(emb, 'index_id', None))
                        stx.load()
                        stores.append((fpath, stx))
                subset = None
                show_filters = st.checkbox("Filters", value=False)
                min_score = 0.0
                any_paths = any(s.state.paths for _, s in stores)
                if show_filters and any_paths:
                    min_score = st.slider("Minimum match", 0.0, 1.0, 0.0, 0.01)
                    import datetime, time as _t
                    mtimes = []
                    for _, s in stores:
                        mtimes.extend(s.state.mtimes or [])
                    if mtimes:
                        dt_min = datetime.date.fromtimestamp(min(mtimes))
                        dt_max = datetime.date.fromtimestamp(max(mtimes))
                        colA, colB = st.columns(2)
                        with colA:
                            d_start = st.date_input("From date", value=dt_min, min_value=dt_min, max_value=dt_max)
                        with colB:
                            d_end = st.date_input("To date", value=dt_max, min_value=dt_min, max_value=dt_max)
                        if d_start and d_end:
                            t_start = _t.mktime(datetime.datetime.combine(d_start, datetime.time.min).timetuple())
                            t_end = _t.mktime(datetime.datetime.combine(d_end, datetime.time.max).timetuple())
                            subset = [i for i, m in enumerate(mtimes) if t_start <= m <= t_end] if len(stores) == 1 else None
                        # Timeline histogram (informational)
                        try:
                            import pandas as pd
                            import altair as alt
                            if mtimes:
                                df = pd.DataFrame({"date": pd.to_datetime(pd.Series(mtimes), unit='s')})
                                df['month'] = df['date'].dt.to_period('M').dt.to_timestamp()
                                hist = (
                                    alt.Chart(df)
                                    .mark_bar()
                                    .encode(x=alt.X('month:T', title='Month'), y=alt.Y('count()', title='Photos'))
                                    .properties(height=100)
                                )
                                st.altair_chart(hist, use_container_width=True)
                        except Exception:
                            pass
                try:
                    if len(stores) > 1 and 'use_workspace_search' in locals() and use_workspace_search:
                        # Workspace-level search
                        wsi = WorkspaceIndex(getattr(emb, 'index_id', 'default'))
                        if use_faiss and wsi.faiss_status().get('exists'):
                            results = wsi.search_faiss(emb, query.strip(), top_k=top_k)
                        elif use_ann and wsi.annoy_status().get('exists'):
                            results = wsi.search_annoy(emb, query.strip(), top_k=top_k)
                        else:
                            # Exact combined
                            qv = emb.embed_text(query.strip())
                            E_list = []
                            paths = []
                            for _, s in stores:
                                if s.state.embeddings is not None and len(s.state.embeddings) > 0:
                                    E_list.append(s.state.embeddings)
                                    paths.extend(s.state.paths)
                            if not E_list:
                                results = []
                            else:
                                E = np.vstack(E_list).astype('float32')
                                sims = (E @ qv).astype(float)
                                k = max(1, min(top_k, len(sims)))
                                idx = np.argpartition(-sims, k - 1)[:k]
                                idx = idx[np.argsort(-sims[idx])]
                                from domain.models import SearchResult
                                results = [SearchResult(path=Path(paths[i]), score=float(sims[i])) for i in idx]
                    else:
                        # Single-folder search
                        store = stores[0][1]
                        if use_ocr and store.ocr_available():
                            results = store.search_with_ocr(emb, query.strip(), top_k=top_k, subset=subset)
                        elif use_faiss:
                            results = store.search_faiss(emb, query.strip(), top_k=top_k, subset=subset)
                        elif use_ann:
                            results = store.search_annoy(emb, query.strip(), top_k=top_k, subset=subset)
                        else:
                            results = store.search(emb, query.strip(), top_k=top_k, subset=subset)
                except Exception as e:
                    st.error(f"Search failed: {e}")
                    st.stop()
                # Update recent queries
                if query not in recent:
                    recent.insert(0, query)
                    if len(recent) > 10:
                        recent.pop()
                # Filter by minimum match
                if show_filters:
                    results = [r for r in results if r.score >= min_score]
                # Favorites-only quick filter and bulk actions
                fav_only = st.checkbox("Show only Favorites", value=False, key="fav_only_search_intent", help="Only show photos you've favorited (♥)")
                # Build favorites set across stores (primary + workspace)
                fav_paths = set()
                if 'stores' in locals():
                    for _, s in stores:
                        coll = load_collections(s.index_dir)
                        fav = coll.get('Favorites', [])
                        for sp in fav:
                            fav_paths.add(sp)
                if fav_only:
                    results = [r for r in results if str(r.path) in fav_paths]
                # Bulk: add all results to Favorites
                colfa, colop = st.columns([1,1])
                with colfa:
                    if st.button("Add all to Favorites") and results:
                        # Map path -> store
                        path_to_store = {}
                        if 'stores' in locals():
                            for _, s in stores:
                                for p in (s.state.paths or []):
                                    path_to_store[p] = s
                        added = 0
                        for r in results:
                            s = path_to_store.get(str(r.path)) if path_to_store else stores[0][1]
                            coll = load_collections(s.index_dir)
                            fav = coll.get('Favorites', [])
                            if str(r.path) not in fav:
                                fav.append(str(r.path))
                                coll['Favorites'] = fav
                                save_collections(s.index_dir, coll)
                                st.session_state['undo_stack'].append({'type': 'favorite', 'path': str(r.path)})
                                added += 1
                        st.success(f"Added {added} photos to Favorites")
                with colop:
                    # Open top-N results in system file browser
                    max_open = min(len(results), 25)
                    if max_open > 0:
                        n_open = st.slider("Open top N in Files", min_value=1, max_value=max_open, value=min(10, max_open))
                        sure = st.checkbox("I'm sure", help="Opens files in your system browser")
                        if st.button("Open now") and sure:
                            sysname = platform.system()
                            opened = 0
                            for r in results[:n_open]:
                                try:
                                    if sysname == 'Darwin':
                                        os.system(f"open -R '{r.path}'")
                                    elif sysname == 'Windows':
                                        os.system(f"explorer /select, {str(r.path)}")
                                    else:
                                        os.system(f"xdg-open '{r.path.parent}'")
                                    opened += 1
                                    try:
                                        primary = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                                        from infra.analytics import log_open as _an_open
                                        _an_open(primary.index_dir, str(r.path), locals().get('search_id'))
                                    except Exception:
                                        pass
                                except Exception:
                                    pass
                            st.info(f"Tried to open {opened} items in your file browser")
                # Feedback UI
                try:
                    from infra.analytics import log_search as _an_log, log_feedback as _an_fb, apply_feedback_boost as _an_boost
                    primary = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
                    idx_dir_an = primary.index_dir
                    # log and keep id
                    search_id = _an_log(idx_dir_an, getattr(emb, 'index_id', 'default'), query.strip(), [(str(r.path), float(r.score)) for r in (results or [])])
                    with st.expander("Help improve results", expanded=False):
                        correct = st.multiselect(
                            "Which results were correct?",
                            options=[str(r.path) for r in (results or [])],
                            format_func=lambda sp: Path(sp).name,
                            key="fb_correct_intent",
                        )
                        note = st.text_input("Any notes?", key="fb_note_intent")
                        if st.button("Submit feedback", key="fb_submit_intent"):
                            _an_fb(idx_dir_an, search_id, query.strip(), correct, note)
                            st.success("Thanks! We'll use this to improve ranking.")
                except Exception:
                    pass
                # EXIF filters (optional)
                if show_filters and results:
                    with st.expander("More filters (EXIF)", expanded=False):
                        cam_filter = st.text_input("Camera contains", placeholder="e.g., iPhone, Canon, Sony")
                        lens_filter = st.text_input("Lens contains", placeholder="e.g., 24-70, prime")
                        iso_min, iso_max = st.columns(2)
                        with iso_min:
                            iso_lo = st.number_input("ISO min", min_value=0, max_value=204800, value=0, step=50)
                        with iso_max:
                            iso_hi = st.number_input("ISO max", min_value=0, max_value=204800, value=204800, step=50)
                        ap_min, ap_max = st.columns(2)
                        with ap_min:
                            f_lo = st.number_input("Aperture f/ min", min_value=0.0, max_value=64.0, value=0.0, step=0.1)
                        with ap_max:
                            f_hi = st.number_input("Aperture f/ max", min_value=0.0, max_value=64.0, value=64.0, step=0.1)
                        fl_min, fl_max = st.columns(2)
                        with fl_min:
                            fl_lo = st.number_input("Focal length min (mm)", min_value=0.0, max_value=1200.0, value=0.0, step=1.0)
                        with fl_max:
                            fl_hi = st.number_input("Focal length max (mm)", min_value=0.0, max_value=1200.0, value=1200.0, step=1.0)

                    @st.cache_data(show_spinner=False)
                    def _exif_info(p: str) -> dict:
                        try:
                            from PIL import Image, ExifTags
                            img = Image.open(p)
                            exif = img._getexif() or {}
                            if not exif:
                                return {}
                            inv = {v: k for k, v in ExifTags.TAGS.items()}
                            out = {}
                            out['make'] = exif.get(inv.get('Make', -1), '')
                            out['model'] = exif.get(inv.get('Model', -1), '')
                            out['lens'] = exif.get(inv.get('LensModel', -1), '') or exif.get(inv.get('LensMake', -1), '')
                            # ISO
                            out['iso'] = exif.get(inv.get('ISOSpeedRatings', -1), 0) or exif.get(inv.get('PhotographicSensitivity', -1), 0)
                            # FNumber
                            fn = exif.get(inv.get('FNumber', -1)) or exif.get(inv.get('ApertureValue', -1))
                            if isinstance(fn, tuple) and fn[1] != 0:
                                out['fnumber'] = float(fn[0]) / float(fn[1])
                            elif isinstance(fn, (int, float)):
                                out['fnumber'] = float(fn)
                            else:
                                out['fnumber'] = 0.0
                            # FocalLength
                            fl = exif.get(inv.get('FocalLength', -1))
                            if isinstance(fl, tuple) and fl[1] != 0:
                                out['focallen'] = float(fl[0]) / float(fl[1])
                            elif isinstance(fl, (int, float)):
                                out['focallen'] = float(fl)
                            else:
                                out['focallen'] = 0.0
                            return out
                        except Exception:
                            return {}

                    def _passes_exif_filters(p: Path) -> bool:
                        info = _exif_info(str(p))
                        if not info and any([cam_filter, lens_filter, iso_lo > 0, iso_hi < 204800, f_lo > 0, f_hi < 64, fl_lo > 0, fl_hi < 1200]):
                            return False
                        if cam_filter and (cam_filter.lower() not in (f"{info.get('make','')} {info.get('model','')}").lower()):
                            return False
                        if lens_filter and (lens_filter.lower() not in str(info.get('lens','')).lower()):
                            return False
                        iso = int(info.get('iso', 0) or 0)
                        if not (iso_lo <= iso <= iso_hi):
                            return False
                        fnum = float(info.get('fnumber', 0.0) or 0.0)
                        if not (f_lo <= fnum <= f_hi):
                            return False
                        flen = float(info.get('focallen', 0.0) or 0.0)
                        if not (fl_lo <= flen <= fl_hi):
                            return False
                        return True

                    results = [r for r in results if _passes_exif_filters(r.path)]
                if not results:
                    st.info("No results or index empty. Build the index first.")
                else:
                    if st.toggle("Export results"):
                        import pandas as pd
                        df = pd.DataFrame([{ "path": str(r.path), "score": r.score } for r in results])
                        st.download_button("Download CSV", df.to_csv(index=False).encode("utf-8"), file_name="search_results.csv", mime="text/csv")
                    # Export to folder
                    with st.expander("Export files", expanded=False):
                        dest = st.text_input("Destination folder", placeholder="/path/to/export")
                        mode = st.radio("Mode", options=["Copy", "Symlink"], horizontal=True)
                        if st.button("Export current results") and dest:
                            import shutil, os
                            ok = 0
                            Path(dest).mkdir(parents=True, exist_ok=True)
                            for r in results:
                                try:
                                    target = Path(dest) / r.path.name
                                    if mode == "Symlink":
                                        try:
                                            if target.exists():
                                                target.unlink()
                                            os.symlink(r.path, target)
                                        except Exception:
                                            shutil.copy2(r.path, target)
                                    else:
                                        shutil.copy2(r.path, target)
                                    ok += 1
                                except Exception:
                                    pass
                            st.success(f"Exported {ok} files to {dest}")
                    # Prepare selection state for collections
                    sel_key = "selected_paths"
                    if sel_key not in st.session_state:
                        st.session_state[sel_key] = set()
                    selected_paths = st.session_state[sel_key]
                    st.caption("Click '⭐ Add' to build a collection, then save it below.")
                    # Tag filter
                    with st.expander("Tag filter", expanded=False):
                        tags_map = load_tags(store.index_dir)
                        all_t = all_tags(store.index_dir)
                        req_tags = st.multiselect("Must include tags", options=all_t)
                        if req_tags:
                            results = [r for r in results if all(t in tags_map.get(str(r.path), []) for t in req_tags)]
                    cols = st.columns(1 if list_mode else (6 if compact_mode else grid_cols))
                    for i, r in enumerate(results):
                        target_cols = 1 if list_mode else (6 if compact_mode else grid_cols)
                        with cols[i % target_cols]:
                            pct = int(round(r.score * 100))
                            mtime = r.path.stat().st_mtime if r.path.exists() else 0.0
                            # Find index dir for this result (primary or one of workspace stores)
                            idx_dir = None
                            if 'stores' in locals():
                                for _, s in stores:
                                    if s.state.paths and str(r.path) in s.state.paths:
                                        idx_dir = s.index_dir
                                        break
                            if idx_dir is None:
                                idx_dir = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)).index_dir
                            tpath = get_or_create_thumb(idx_dir, r.path, mtime, size=locals().get('thumb_size', 512))
                            if list_mode:
                                row_cols = st.columns([1, 6, 2])
                                with row_cols[0]:
                                    if tpath is not None:
                                        st.image(str(tpath), caption=None, width=96)
                                with row_cols[1]:
                                    st.text(str(r.path))
                                with row_cols[2]:
                                    st.caption(f"match {pct}%")
                            else:
                                caption = None if compact_mode else f"{r.path.name} (match {pct}%)"
                                if tpath is not None:
                                    st.image(str(tpath), caption=caption, width='stretch')
                                else:
                                    img = safe_open_image(r.path)
                                    if img is not None:
                                        st.image(img, caption=caption, width='stretch')
                                if not compact_mode:
                                    st.caption(str(r.path))
                            sysname = platform.system()
                            label = "Show in Finder" if sysname == 'Darwin' else ("Show in Explorer" if sysname == 'Windows' else "Show in Files")
                            if st.button(label, key=f"rev_{i}"):
                                try:
                                    import subprocess
                                    if sysname == "Darwin":
                                        subprocess.Popen(["open", "-R", str(r.path)])
                                    elif sysname == "Windows":
                                        subprocess.Popen(["explorer", f"/select,{str(r.path)}"])
                                    else:
                                        subprocess.Popen(["xdg-open", str(r.path.parent)])
                                except Exception:
                                    pass
                            # Zoom popover
                            with st.popover("Zoom", use_container_width=True):
                                st.image(str(r.path), caption=str(r.path.name), width=800)
                            if st.button("⭐ Add", key=f"addsel_{i}"):
                                selected_paths.add(str(r.path))
                            # Tagging UI
                            with st.popover("Tag", use_container_width=True):
                                tags_map = load_tags(store.index_dir)
                                cur = tags_map.get(str(r.path), [])
                                all_t = all_tags(store.index_dir)
                                sel = st.multiselect("Tags", options=all_t, default=cur)
                                new_t = st.text_input("Add a new tag")
                                if st.button("Save tags", key=f"save_tags_{i}"):
                                    # record undo
                                    st.session_state['undo_stack'].append({'type': 'tags', 'path': str(r.path), 'prev': cur})
                                    final = sel.copy()
                                    if new_t.strip():
                                        final.append(new_t.strip())
                                    final = [t for t in {t.strip() for t in final if t.strip()}]
                                    tags_map[str(r.path)] = final
                                    save_tags(store.index_dir, tags_map)
                                    st.success("Tags saved.")
                            # One-click favorite
                            if st.button("♥ Favorite", key=f"fav_{i}"):
                                coll = load_collections(store.index_dir)
                                fav = coll.get('Favorites', [])
                                if str(r.path) not in fav:
                                    fav.append(str(r.path))
                                    coll['Favorites'] = fav
                                    save_collections(store.index_dir, coll)
                                    st.session_state['undo_stack'].append({'type': 'favorite', 'path': str(r.path)})
                                    st.success("Added to Favorites")
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

with tab_browse:
    st.subheader("Browse your photos")
    if not photo_dir or not Path(photo_dir).exists():
        st.info("Set a valid directory in the sidebar and build the index.")
    else:
        prov = label_to_provider(provider_label)
        emb = cached_embedder(prov, hf_token, openai_key, st_model, tf_model, hf_model, oai_cap_model, oai_emb_model)
        store = IndexStore(Path(photo_dir), index_key=getattr(emb, "index_id", None))
        store.load()
        fav_only_browse = st.checkbox("Show only Favorites", value=False, key="fav_only_browse_intent")
        # Collections
        with st.expander("Collections", expanded=False):
            coll = load_collections(store.index_dir)
            names = sorted(coll.keys())
            if names:
                pick = st.selectbox("Select a collection", options=names)
                if pick:
                    items = coll.get(pick, [])
                    if st.checkbox("Only Favorites in this collection", value=False, key="only_favorites_in_collection_intent_browse"):
                        favs = set(coll.get('Favorites', []))
                        items = [p for p in items if p in favs]
                    st.caption(f"{len(items)} photos in '{pick}'")
                    ccols = st.columns(grid_cols)
                    for i, sp in enumerate(items[:200]):
                        p = Path(sp)
                        with ccols[i % grid_cols]:
                            mtime = p.stat().st_mtime if p.exists() else 0.0
                            tpath = get_or_create_thumb(store.index_dir, p, mtime, size=locals().get('thumb_size', 512))
                            if tpath is not None:
                                st.image(str(tpath), caption=p.name, width='stretch')
                            else:
                                img = safe_open_image(p)
                                if img is not None:
                                    st.image(img, caption=p.name, width='stretch')
                            st.caption(str(p))
                    del_cols = st.columns([1,1])
                    with del_cols[0]:
                        if st.button("Export CSV", key="coll_csv"):
                            import pandas as pd
                            df = pd.DataFrame([{ "path": s } for s in items])
                            st.download_button("Download CSV", df.to_csv(index=False).encode("utf-8"), file_name=f"{pick}.csv", mime="text/csv")
                    with del_cols[1]:
                        if st.button("Delete collection", key="coll_del"):
                            coll.pop(pick, None)
                            save_collections(store.index_dir, coll)
                            st.success("Collection deleted.")
                            st.experimental_rerun()
            else:
                st.info("No collections saved yet.")
        paths_all = store.state.paths or []
        if fav_only_browse:
            favs = set((load_collections(store.index_dir).get('Favorites', [])))
            paths = [p for p in paths_all if p in favs]
        else:
            paths = paths_all
        total = len(paths)
        if not total:
            st.info("No index found. Build it in the Build tab.")
        else:
            page_size = st.selectbox("Page size", [12, 24, 48], index=0)
            pages = (total + page_size - 1) // page_size
            page = st.number_input("Page", min_value=1, max_value=max(1, pages), value=1, step=1)
            start = (page - 1) * page_size
            end = min(start + page_size, total)
            cols = st.columns(grid_cols)
            for i, p in enumerate(paths[start:end]):
                path = Path(p)
                with cols[i % grid_cols]:
                    mtime = path.stat().st_mtime if path.exists() else 0.0
                    tpath = get_or_create_thumb(store.index_dir, path, mtime, size=locals().get('thumb_size', 512))
                    if tpath is not None:
                        st.image(str(tpath), caption=path.name, width='stretch')
                    else:
                        img = safe_open_image(path)
                        if img is not None:
                            st.image(img, caption=path.name, width='stretch')
                    st.caption(str(path))

with tab_map:
    st.subheader("See photos on a map")
    src_all = st.checkbox("Include other folders you've added", value=False)
    limit = st.slider("Max photos to plot", min_value=100, max_value=10000, value=2000, step=100)
    cluster = st.checkbox("Group nearby photos", value=True, help="Show one dot for nearby photos")
    show_btn = st.button("Show map")
    if show_btn:
        prov = label_to_provider(provider_label)
        emb = cached_embedder(prov, hf_token, openai_key, None, None, None, None, None)
        stores = []
        base = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        base.load()
        stores.append(base)
        if src_all:
            for f in load_workspace():
                fpath = Path(f)
                if fpath.exists() and str(fpath) != str(Path(photo_dir)):
                    stx = IndexStore(fpath, index_key=getattr(emb, 'index_id', None))
                    stx.load()
                    stores.append(stx)

        @st.cache_data(show_spinner=True)
        def _gps_points(paths: list[str], limit: int) -> list[dict]:
            out = []
            from PIL import Image, ExifTags
            def _to_deg(val):
                try:
                    d, m, s = val
                    def cv(x):
                        return float(x[0]) / float(x[1]) if isinstance(x, tuple) else float(x)
                    return cv(d) + cv(m)/60.0 + cv(s)/3600.0
                except Exception:
                    return None
            inv = {v:k for k,v in ExifTags.TAGS.items()}
            for p in paths[:limit]:
                try:
                    img = Image.open(p)
                    exif = img._getexif() or {}
                    gps_id = inv.get('GPSInfo', -1)
                    gps = exif.get(gps_id) or {}
                    lat = gps.get(2)
                    lat_ref = gps.get(1)
                    lon = gps.get(4)
                    lon_ref = gps.get(3)
                    if lat and lon and lat_ref and lon_ref:
                        latd = _to_deg(lat)
                        lond = _to_deg(lon)
                        if latd is not None and lond is not None:
                            if str(lat_ref).upper().startswith('S'):
                                latd = -latd
                            if str(lon_ref).upper().startswith('W'):
                                lond = -lond
                            out.append({"lat": latd, "lon": lond, "path": p})
                except Exception:
                    continue
            return out

        all_paths = []
        for s in stores:
            all_paths.extend(s.state.paths or [])
        pts = _gps_points(all_paths, limit)
        if not pts:
            st.info("No location data found in these photos.")
        else:
            import pandas as pd
            import pydeck as pdk
            df = pd.DataFrame(pts)
            if cluster:
                # simple grid clustering
                grid = 0.05  # degrees
                df['grid_lat'] = (df['lat'] / grid).round().astype(int) * grid
                df['grid_lon'] = (df['lon'] / grid).round().astype(int) * grid
                agg = df.groupby(['grid_lat','grid_lon']).agg(count=('path','count')).reset_index()
                agg.rename(columns={'grid_lat':'lat','grid_lon':'lon'}, inplace=True)
                layer = pdk.Layer(
                    "ScatterplotLayer",
                    data=agg,
                    get_position='[lon, lat]',
                    get_radius='count * 50',
                    get_fill_color='[200, 30, 0, 140]',
                    pickable=True,
                )
                tooltip = {"text": "{count} photos here"}
                view_state = pdk.ViewState(latitude=float(df['lat'].mean()), longitude=float(df['lon'].mean()), zoom=3)
                st.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip=tooltip))
                st.caption(f"Plotted {len(df)} photos (grouped)")
            else:
                layer = pdk.Layer(
                    "ScatterplotLayer",
                    data=df,
                    get_position='[lon, lat]',
                    get_radius=50,
                    get_fill_color='[0, 120, 180, 140]',
                    pickable=True,
                )
                tooltip = {"text": "{path}"}
                view_state = pdk.ViewState(latitude=float(df['lat'].mean()), longitude=float(df['lon'].mean()), zoom=3)
                st.pydeck_chart(pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip=tooltip))
                st.caption(f"Plotted {len(df)} photos with GPS data")
                # Quick open helpers
                with st.expander("Open some of these", expanded=False):
                    sample = df['path'].tolist()[: min(50, len(df))]
                    picks = st.multiselect("Pick photos to open", options=sample)
                    if st.button("Open selected") and picks:
                        sysname = platform.system()
                        opened = 0
                        for sp in picks:
                            try:
                                if sysname == 'Darwin':
                                    os.system(f"open -R '{sp}'")
                                elif sysname == 'Windows':
                                    os.system(f"explorer /select, {str(sp)}")
                                else:
                                    os.system(f"xdg-open '{Path(sp).parent}'")
                                opened += 1
                            except Exception:
                                pass
                        st.info(f"Tried to open {opened} items")

# Preflight diagnostics
with tab_preflight:
    st.subheader("Preflight checks")
    import shutil
    # Engine availability
    ok_ann = ok_faiss = ok_ocr = False
    try:
        import annoy  # noqa: F401
        ok_ann = True
    except Exception:
        ok_ann = False
    try:
        import faiss  # type: ignore  # noqa: F401
        ok_faiss = True
    except Exception:
        ok_faiss = False
    try:
        import easyocr  # type: ignore  # noqa: F401
        ok_ocr = True
    except Exception:
        ok_ocr = False
    prov = label_to_provider(provider_label)
    emb = cached_embedder(prov, hf_token, openai_key, None, None, None, None, None)
    current_folder = str(Path(photo_dir).resolve()) if photo_dir else ""
    store_chk = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None)) if photo_dir and Path(photo_dir).exists() else None
    total_idx = 0
    if store_chk:
        store_chk.load()
        total_idx = len(store_chk.state.paths or [])
    free_gb = shutil.disk_usage(Path.home()).free / (1024**3)
    # GPU / device
    try:
        import torch
        device = (
            "CUDA" if torch.cuda.is_available() else ("MPS" if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available() else "CPU")
        )
    except Exception:
        device = "Unknown"
    # Workspace index status
    from infra.workspace_index import WorkspaceIndex
    wsi = WorkspaceIndex(getattr(emb, 'index_id', 'default'))
    w_ann = wsi.annoy_status()
    w_faiss = wsi.faiss_status()

    st.markdown(f"- Engine: {provider_label} (`{getattr(emb, 'index_id', 'default')}`) on {device}")
    st.markdown(f"- Libraries: Annoy: {'✅' if ok_ann else '❌'}, FAISS: {'✅' if ok_faiss else '❌'}, OCR: {'✅' if ok_ocr else '❌'}")
    st.markdown(f"- Current folder: {current_folder}")
    st.markdown(f"- Indexed photos (current): {total_idx}")
    st.markdown(f"- Workspace fast index: FAISS: {'✅' if w_faiss.get('exists') else '❌'}, Annoy: {'✅' if w_ann.get('exists') else '❌'}")
    st.markdown(f"- Free disk space (home): {free_gb:.1f} GB")

    # Open workspace index folder
    ws_base = Path.home() / ".photo_search" / "workspace_index" / getattr(emb, 'index_id', 'default').replace('/', '_').replace(' ', '-').replace(':','-')
    if st.button("Open Workspace Index Folder"):
        try:
            if platform.system() == 'Darwin':
                os.system(f"open {ws_base}")
            elif platform.system() == 'Windows':
                os.system(f"start {ws_base}")
            else:
                os.system(f"xdg-open {ws_base}")
        except Exception:
            st.info(str(ws_base))

    
    # Reset app settings
    if st.button("Reset app settings"):
        for k, v in DEFAULTS.items():
            prefs[k] = v
        save_prefs(prefs)
        st.success("Settings reset. Reloading…")
        st.experimental_rerun()

    # Export diagnostics

    diag = {
        "engine": getattr(emb, 'index_id', 'default'),
        "device": device,
        "annoy": ok_ann,
        "faiss": ok_faiss,
        "ocr": ok_ocr,
        "current_folder": current_folder,
        "indexed_count": total_idx,
        "workspace_faiss": bool(w_faiss.get('exists')),
        "workspace_annoy": bool(w_ann.get('exists')),
    }
    import json
    st.download_button("Export diagnostics", data=json.dumps(diag, indent=2).encode('utf-8'), file_name="photo_search_diagnostics.json", mime="application/json")

    st.divider()
    st.subheader("Find look‑alike photos (beta)")
    sim = st.slider("How similar (lower is stricter)", min_value=0, max_value=16, value=5)
    if st.button("Scan for look‑alikes"):
        prov = label_to_provider(provider_label)
        emb = cached_embedder(prov, hf_token, openai_key, None, None, None, None, None)
        store_d = IndexStore(Path(photo_dir), index_key=getattr(emb, 'index_id', None))
        store_d.load()
        with st.spinner("Crunching quick matches…"):
            built = build_hashes(store_d.index_dir, store_d.state.paths or [])
            groups = find_lookalikes(store_d.index_dir, max_distance=sim)
        st.caption(f"Updated {built} photos. Found {len(groups)} look‑alike groups.")
        if groups:
            for k, grp in enumerate(groups[:50]):
                st.caption(f"Group {k+1} ({len(grp)} photos)")
                cols = st.columns(min(len(grp), 6))
                for i, sp in enumerate(grp):
                    with cols[i % len(cols)]:
                        try:
                            mtime = Path(sp).stat().st_mtime
                            tpath = get_or_create_thumb(store_d.index_dir, Path(sp), mtime, size=locals().get('thumb_size', 512))
                            st.image(str(tpath or sp), caption=Path(sp).name, width='stretch')
                            st.caption(sp)
                        except Exception:
                            st.caption(sp)
                # Choose keepers per group
                with st.expander("Choose keepers", expanded=False):
                    choices = {}
                    subcols = st.columns(min(len(grp), 4))
                    for i, sp in enumerate(grp):
                        with subcols[i % len(subcols)]:
                            choices[sp] = st.checkbox(Path(sp).name, value=(i == 0), key=f"keep_{k}_{i}")
                    dest = st.text_input(f"Folder to copy keepers (Group {k+1})", key=f"keep_dest_{k}")
                    if st.button("Copy keepers", key=f"copy_keep_{k}") and dest:
                        import shutil
                        Path(dest).mkdir(parents=True, exist_ok=True)
                        copied = 0
                        for sp, keep in choices.items():
                            if keep:
                                try:
                                    shutil.copy2(sp, Path(dest) / Path(sp).name)
                                    copied += 1
                                except Exception:
                                    pass
                        st.success(f"Copied {copied} files to {dest}")
                    # Add keepers to Favorites
                    if st.button("Add keepers to Favorites", key=f"fav_keep_{k}"):
                        from infra.collections import load_collections, save_collections
                        coll = load_collections(store_d.index_dir)
                        fav = coll.get('Favorites', [])
                        added = 0
                        for sp, keep in choices.items():
                            if keep and sp not in fav:
                                fav.append(sp)
                                added += 1
                        coll['Favorites'] = fav
                        save_collections(store_d.index_dir, coll)
                        st.success(f"Added {added} to Favorites")
                    # Export non-keepers
                    dest_nk = st.text_input(f"Folder to copy non-keepers (Group {k+1})", key=f"nkeep_dest_{k}")
                    if st.button("Copy non-keepers", key=f"copy_nkeep_{k}") and dest_nk:
                        import shutil
                        Path(dest_nk).mkdir(parents=True, exist_ok=True)
                        copied = 0
                        for sp, keep in choices.items():
                            if not keep:
                                try:
                                    shutil.copy2(sp, Path(dest_nk) / Path(sp).name)
                                    copied += 1
                                except Exception:
                                    pass
                        st.success(f"Copied {copied} files to {dest_nk}")
                # Side-by-side compare
                with st.expander("Compare two", expanded=False):
                    if len(grp) >= 2:
                        c1, c2 = st.columns(2)
                        with c1:
                            a = st.selectbox("Left", options=grp, key=f"cmpL_{k}")
                        with c2:
                            b = st.selectbox("Right", options=grp, key=f"cmpR_{k}")
                        if a and b and a != b:
                            colL, colR = st.columns(2)
                            from PIL import Image
                            import os as _os
                            try:
                                imgA = Image.open(a)
                                imgB = Image.open(b)
                                wA, hA = imgA.size; wB, hB = imgB.size
                                sA = Path(a).stat().st_size; sB = Path(b).stat().st_size
                                with colL:
                                    st.image(imgA, caption=f"{Path(a).name} ({wA}x{hA}, {sA//1024} KB)", use_container_width=True)
                                with colR:
                                    st.image(imgB, caption=f"{Path(b).name} ({wB}x{hB}, {sB//1024} KB)", use_container_width=True)
                                # Suggest keep best (higher res then larger size)
                                scoreA = (wA*hA, sA)
                                scoreB = (wB*hB, sB)
                                best = a if scoreA >= scoreB else b
                                st.caption(f"Suggested keeper: {Path(best).name}")
                                dest2 = st.text_input(f"Copy suggested keeper to… (Group {k+1})", key=f"keepbest_{k}")
                                if st.button("Copy suggested keeper", key=f"copybest_{k}") and dest2:
                                    import shutil
                                    Path(dest2).mkdir(parents=True, exist_ok=True)
                                    try:
                                        shutil.copy2(best, Path(dest2) / Path(best).name)
                                        st.success("Copied")
                                    except Exception:
                                        st.warning("Could not copy")
                            except Exception:
                                st.warning("Could not load images to compare")

            with st.expander("Move these to a folder", expanded=False):
                dest = st.text_input("Destination", placeholder="/path/to/folder")
                if st.button("Copy all groups") and dest:
                    import shutil
                    Path(dest).mkdir(parents=True, exist_ok=True)
                    copied = 0
                    for grp in groups:
                        for sp in grp[1:]:  # keep first as primary
                            try:
                                shutil.copy2(sp, Path(dest) / Path(sp).name)
                                copied += 1
                            except Exception:
                                pass
                    st.success(f"Copied {copied} files to {dest}")

            # Manage tags (rename/merge)
            st.divider()
            st.subheader("Manage tags")
            from infra.tags import load_tags, save_tags, all_tags
            tags_map = load_tags(store_d.index_dir)
            all_t = all_tags(store_d.index_dir)
            if all_t:
                colr, coln = st.columns([1,2])
                with colr:
                    src_tag = st.selectbox("Pick a tag to rename/merge", options=["-"] + all_t)
                with coln:
                    new_tag = st.text_input("New tag name (existing name to merge)")
                if st.button("Apply tag rename/merge") and src_tag and src_tag != "-" and new_tag.strip():
                    changed = 0
                    for p, tags in list(tags_map.items()):
                        if src_tag in tags:
                            tags = [new_tag if t == src_tag else t for t in tags]
                            # de-dup
                            tags = [t for t in {t for t in tags if t}]
                            tags_map[p] = tags
                            changed += 1
                    save_tags(store_d.index_dir, tags_map)
                    st.success(f"Updated {changed} items")
            else:
                st.caption("No tags yet. Add some from Search → Tag.")
# Save preferences (best-effort)
prefs.update({
    "photo_dir": photo_dir,
    "provider_label": provider_label,
    "grid_cols": grid_cols,
    "batch_size": locals().get("batch_size", prefs.get("batch_size", 32)),
    "use_ann": locals().get("use_ann", prefs.get("use_ann", False)),
    "use_faiss": locals().get("use_faiss", prefs.get("use_faiss", False)),
    "ann_trees": locals().get("ann_trees", prefs.get("ann_trees", 50)),
    "use_ocr": locals().get("use_ocr", prefs.get("use_ocr", False)),
    "ocr_langs": locals().get("ocr_langs", prefs.get("ocr_langs", ["en"])),
    "thumb_size": locals().get("thumb_size", prefs.get("thumb_size", 512)),
    "thumb_cap_mb": locals().get("thumb_cap_mb", prefs.get("thumb_cap_mb", 500)),
    "onboarding_seen": prefs.get("onboarding_seen", False),
})
save_prefs(prefs)
