# Photo Search – Product Spec and Plan

This document captures the product vision, current capabilities, APIs, frontends, and roadmap for the two apps in this repository. It is a living source of truth for what we’ve built, what we should build next, and how we keep the “Classic” and “Intent‑First” approaches feature‑aligned while differing in architecture and development style.


## Vision & Principles
- Help people find any photo fast with friendly, private‑by‑default tools.
- Be engine‑agnostic: support on‑device models first, with optional cloud engines (opt‑in, clearly explained).
- Keep the experience fast and uncluttered; progressive disclosure for advanced features.
- Maintain two implementations:
  - Classic: minimal, pragmatic structure for speed and simplicity.
  - Intent‑First: layered architecture (domain/adapters/infra/usecases/ui) guided by the intent handbook.


## Codebase Split
- Classic app
  - Streamlit (legacy UI): `archive/photo-search-classic/app.py`
  - Backend (FastAPI): `archive/photo-search-classic/api/server.py`
  - React Frontend (Vite + Tailwind + TS): `archive/photo-search-classic/webapp` → builds to `archive/photo-search-classic/api/web`
  - Electron wrapper: `archive/photo-search-classic/electron`
  - Engine/store: `archive/photo-search-classic/engine.py`
  - Providers: `archive/photo-search-classic/providers.py`
  - Storage: `archive/photo-search-classic/storage.py`
  - Thumbs/EXIF/Dupes/Analytics: `archive/photo-search-classic/thumbs.py`, `exif.py`, `dupes.py`, `analytics.py`

- Intent‑First app
  - Streamlit (legacy UI): `photo-search-intent-first/ui/app.py`
  - Backend (FastAPI): `photo-search-intent-first/api/server.py`
  - React Frontend (Vite + Tailwind + TS): `photo-search-intent-first/webapp` → builds to `photo-search-intent-first/api/web`
  - Electron wrapper: `photo-search-intent-first/electron`
  - Architecture: `adapters/`, `infra/`, `usecases/`, `domain/`
  - Providers: `adapters/provider_factory.py`
  - Index store & fast search: `infra/index_store.py` (Annoy/FAISS/HNSW, OCR, thumbnails)
  - Extras: look‑alikes (`infra/dupes.py`), workspace (`infra/workspace*.py`), analytics (`infra/analytics.py`)


## Engines & Indexing
- Engines (both apps)
  - On‑device (Recommended): CLIP via transformers – fast, private.
  - On‑device (Compatible): CLIP via sentence‑transformers – easy parity with legacy logic.
  - Hugging Face (Caption): Captions (e.g., BLIP) + text embedding – used when image feature APIs are limited.
  - OpenAI (Captions): Vision captioning + text embedding – opt‑in, can be slow/costly.
  - Hugging Face (CLIP API): Text‑first support in this repo; we recommend caption+embed for images.
- Per‑engine index namespaces: `.photo_index/<engine-id>` keeps embeddings separate.
- Files per index (typical)
  - `paths.json`, `embeddings.npy`, `thumbs/`
  - Optional OCR: `ocr_texts.json`, `ocr_embeddings.npy`
  - ANN/fast: `annoy.index` + meta, `faiss.index` + meta, `hnsw.index` + meta
  - Analytics/Feedback: `analytics.jsonl`, `feedback.json`
  - Collections/Favorites/Tags/Saved: `collections.json`, `tags.json`, `saved_searches.json` (intent) or legacy layout in classic
  - Dupes: `hashes.json`, resolved groups: `dupes_resolved.json`


## Current Feature Matrix

### Classic (API + React + Electron)
- Search
  - Multi‑engine, Top‑K input
  - Filters: favorites‑only, tag filter (comma list), optional date (API)
  - Results grid with thumbnails, favorites toggle, reveal in Finder/Explorer
  - Per‑result tags editor
  - CSV export for current results
- Library tools
  - Build/Update index
  - Saved searches: list, run, delete, save current
  - Map (EXIF GPS): fetch points; lightweight list view
  - Diagnostics: per‑engine index counts + paths, OS, free disk
- Analytics & feedback
  - Logs searches/opens (analytics.jsonl)
  - Per‑query feedback (feedback.json) boosts future ranking
- Electron app
  - Starts uvicorn and opens the app (127.0.0.1:8001)

### Intent‑First (API + React + Electron)
- Search
  - Multi‑engine, Top‑K input
  - Filters: favorites‑only, tag filter, date (API)
  - Results grid with thumbnails, favorites toggle, reveal, tags editor
  - Saved searches: list, run, delete, save current
  - Feedback logging and ranking boost
- Advanced
  - Speed & OCR: Annoy/FAISS/HNSW build and OCR build (language)
  - Look‑alikes: scan groups, mark resolved, add to Favorites, export keepers (via filesystem), thumbnails for groups
  - Workspace: list/add/remove folders; (backend has workspace‑wide capabilities)
- Map & Diagnostics
  - Map points from EXIF GPS
  - Diagnostics: per‑engine index stats, fast‑index availability, OS, free disk
- Electron app
  - Starts uvicorn and opens the app (127.0.0.1:8000)


## Public APIs (summary)

### Classic – `archive/photo-search-classic/api/server.py`
- POST `/index` {dir, provider, batch_size}
- POST `/search` {dir, provider, query, top_k, favorites_only?, tags?, date_from?, date_to?}
- GET `/favorites` ?dir=…
- POST `/favorites` {dir, path, favorite}
- GET `/tags` ?dir=…
- POST `/tags` {dir, path, tags}
- GET `/saved` ?dir=…
- POST `/saved` {dir, name, query, top_k}
- POST `/saved/delete` {dir, name}
- POST `/feedback` {dir, search_id, query, positives, note}
- GET `/thumb` ?dir=…&provider=…&path=…&size=…
- POST `/open` {dir, path}
- GET `/map` ?dir=…&limit=…
- GET `/diagnostics` ?dir=…

### Intent‑First – `photo-search-intent-first/api/server.py`
- POST `/index` {dir, provider, batch_size}
- POST `/search` {dir, provider, query, top_k, favorites_only?, tags?, date_from?, date_to?}
- GET `/favorites` ?dir=…
- POST `/favorites` {dir, path, favorite}
- GET `/tags` ?dir=…
- POST `/tags` {dir, path, tags}
- GET `/saved` ?dir=…
- POST `/saved` {dir, name, query, top_k}
- POST `/saved/delete` {dir, name}
- POST `/feedback` {dir, search_id, query, positives, note}
- GET `/thumb` ?dir=…&provider=…&path=…&size=…
- POST `/open` {dir, path}
- GET `/map` ?dir=…&limit=…
- POST `/ocr/build` {dir, provider, languages?, …}
- POST `/fast/build` {dir, kind: annoy|faiss|hnsw, provider, …}
- GET `/lookalikes` ?dir=…&max_distance=…
- POST `/lookalikes/resolve` {dir, group_paths}
- GET `/workspace` (list); POST `/workspace/add`; POST `/workspace/remove`
- GET `/diagnostics` ?dir=… [&provider=…]


## Frontends

### React apps (Vite + Tailwind + TS)
- Classic: minimal, clean UI with powerful features and clear affordances.
- Intent‑First: same visual language, adds Speed & OCR, Look‑alikes, and Workspace sections.

### Electron
- Each app ships an Electron wrapper that spawns uvicorn and opens the local UI.
- Next step: add electron‑builder packaging for distributables.

### Legacy Streamlit UIs
- Kept for reference and fallback: Classic `app.py`, Intent‑First `ui/app.py`.


## Analytics & Feedback
- `analytics.jsonl` appends an entry for each search (engine, query, results) and each file open.
- `feedback.json` holds per‑query, per‑path positive counts used to add small boosts during ranking.
- Both apps apply boost and log feedback/search consistently.


## UX Guidelines (to keep it “wow” without clutter)
- Essentials always visible; advanced tools in tabs/expanders.
- Clear copy (“Build Index”, “Reveal”, “Favorites only”), helpful empty states.
- Keyboard affordances (next/prev, favorite, reveal) and soft toasts.
- Thumbnails + details drawer for quick inspection.
- Non‑blocking background tasks with visible progress (see Roadmap SSE).


## Setup – Quick Start
- Intent‑First
  - Backend: `uvicorn photo-search-intent-first.api.server:app --port 8000 --reload`
  - React: `cd photo-search-intent-first/webapp && npm i && npm run build`
  - Electron: `cd ../electron && npm i && npm run dev`
- Classic
  - Backend: `uvicorn photo-search-classic.api.server:app --port 8001 --reload`
  - React: `cd archive/photo-search-classic/webapp && npm i && npm run build`
  - Electron: `cd ../electron && npm i && npm run dev`
- Optional keys: `OPENAI_API_KEY`, `HF_API_TOKEN`


## Roadmap

### Short‑term (Finish Polishing)
- Classic UI polish
  - Tabs + details drawer, tag chips, bulk selection/export, keyboard shortcuts, toasts.
- Intent‑First UI
  - Saved searches polish; Speed & OCR toggles; Look‑alikes “Keep/Discard” flow; Workspace UI; Map and Diagnostics panels.
- HF reliability (+ telemetry)
  - Retries with backoff; fallback caption models (BLIP base, ViT‑GPT2); clear UI messaging.
- Job progress
  - SSE (/progress) for index/OCR/fast builds; job IDs in responses; inline spinners.
- Packaging & docs
  - electron‑builder configs; one‑liners for API, React, Electron; privacy/engine notes.

### Mid‑term (Wow‑factor Features)
- People & faces (opt‑in): local face detection/embeddings and clustering; naming; face filters.
- Auto‑albums & smart collections: on‑device captioning/classifiers + rules (e.g., “Beach in 2021”).
- Timeline & map upgrades: timeline heatmap; real map tiles; cluster markers; hover thumbs.
- Similar‑by‑example: click a photo to find visually similar neighbors (local CLIP/SigLIP neighbors).
- Local LLM helpers (opt‑in): on‑device Q&A over personal photos; natural language filters.
- Mobile companion (future): scan/import from phone; local processing pipeline.

### Long‑term (Ecosystem & Scale)
- Vector DB integration (optional): FAISS/SQLite hybrid or external vector stores for huge libraries.
- Sync/export options: export collections or analytics snapshots; optional cloud sync with strict privacy.
- Extensions: plugin points for custom taggers/captioners or external tools.


## Open Tasks (Working Plan)
- Classic (near‑term polish)
  - Tabbed UI + details drawer
  - Tag chips + bulk select/export
  - Keyboard shortcuts + toasts
- Intent‑First (next)
  - Fast‑search UI + OCR polish
  - Look‑alikes UI keep/discard design
  - Workspace UI + map improvements
  - Diagnostics surface + engine/device badges
- Cross‑cutting
  - HF caption hardening
  - SSE progress + job status
  - Electron packaging + scripts
  - Docs (developer runbooks; privacy & engine guidance)


## Notes on Privacy & Data
- On‑device engines keep all photos and embeddings local.
- Cloud engines (HF/OpenAI) are explicit opt‑in; API keys are entered by the user; results/keys are not persisted beyond the session unless the user chooses to save them.
- Index folders (.photo_index) remain within the user’s photo folders, portable and private.
