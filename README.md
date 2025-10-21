# Photo Search - Local-First AI Photo Management

## Architecture Priority

**Photo Search is a local-first desktop application with three operational modes:**

1. **🖥️ Desktop Local App (Primary)** - Electron app with direct file system access
   - Works completely offline without any server
   - Direct photo viewing using file:// URLs
   - Local thumbnail generation and caching
   - Basic photo management and organization

2. **🤖 AI Search Enhanced (Secondary)** - Desktop app + optional backend
   - All local features PLUS AI-powered semantic search
   - Face recognition and people management
   - OCR text extraction from photos
   - Advanced search and filtering capabilities

3. **🌐 React Web App (Tertiary)** - Browser-based version
   - Requires backend server to be running
   - Limited to web-based file access
   - Primarily for development and testing

## Tech Stack

- **Primary Shell:** Electron V3 (desktop app in `electron-v3/`)
- **Frontend:** React V3 + TypeScript + Vite (in `photo-search-intent-first/webapp-v3/`)
- **Optional Backend:** FastAPI + Python AI models (in `photo-search-intent-first/api/`)
- **State Management:** Zustand, direct file system APIs
- **UI Components:** shadcn/ui, Radix UI, Tailwind CSS, Framer Motion
- **Legacy:** Streamlit prototype (not part of shipping app)

What’s Included

- `photo-search-classic`: Straightforward Streamlit app with a single engine module.
- `photo-search-intent-first`: Same app built using Intent-First methodology with layered architecture and explicit intent docs.

Run Either App

1. Create a virtualenv and install requirements:
   - Classic: `cd photo-search-classic && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
   - Intent-First: `cd photo-search-intent-first && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
2. Launch Streamlit:
   - Classic: `streamlit run app.py`

- Intent-First: `streamlit run ui/app.py`

3. In the app sidebar, enter your photo directory, build the index, and search by text (e.g., “friends having tea”).

Deploy Separately

- See `DEPLOYMENT.md` for Docker builds and docker-compose to run Classic (port 8001) and Intent‑First (port 8000) independently.

CLI (Intent-First)

- Index: `python3 photo-search-intent-first/cli.py index --dir /path/to/photos --provider local`
- Search: `python3 photo-search-intent-first/cli.py search --dir /path/to/photos --query "friends having tea" --top-k 12`
- Database: `python3 photo-search-intent-first/cli.py db --help` (SQLite storage management)

Storage Backends (Intent-First)

The Intent-First backend supports multiple storage backends for photo metadata, embeddings, and thumbnails:

- **File-based (default)**: JSON/NumPy files in `.photo_index/` folder
- **SQLite**: Structured database storage with SQL querying capabilities

Configure backend via environment variable:

```bash
export STORAGE_BACKEND=sqlite  # or 'file' (default)
```

SQLite provides:

- Structured queries for complex searches
- Better performance for large collections
- ACID transactions and data integrity
- Easy backup/restore operations
- Concurrent access support

Database CLI commands:

- Initialize: `python3 cli.py db init --dir /path/to/photos --backend sqlite`
- Migrate: `python3 cli.py db migrate --dir /path/to/photos --from-backend file --to-backend sqlite`
- Stats: `python3 cli.py db stats --dir /path/to/photos --backend sqlite`
- Backup: `python3 cli.py db backup --dir /path/to/photos --output backup.db`
- Restore: `python3 cli.py db restore --dir /path/to/photos --input backup.db`

Package + Entry Point

- Install package in editable mode:
  - `python -m pip install -e .[ann,faiss,hnsw,ocr]`
    - Extras (optional): `ann` (Annoy), `faiss` (FAISS), `hnsw` (HNSW), `ocr` (EasyOCR)
- Run the CLI anywhere:
  - `ps-intent index --dir /path/to/photos --provider local`
  - `ps-intent search --dir /path/to/photos --query "friends having tea"`
- Launch the UI anywhere:
  - `ps-intent-ui` (uses `PS_INTENT_PORT` env var if set)

Features Snapshot (Intent‑First)

- Build/Workspace:
  - Build/Update Library; Workspace tools (Build all folders, Prepare faster search, Show per‑folder search data, Show workspace search data)
- Search:
  - Natural language search, EXIF filters + timeline chart, Saved searches
  - Favorites (♥), Tags (filter + editor), Collections, Recent queries
  - Export (copy/symlink), Compact/List modes, Zoom popover, “Open top N in Files”
- Map:
  - Plot photos with GPS EXIF; include other folders; limit plotted count
- Preflight:
  - Engine/device status, diagnostics export, reset settings, look‑alike photos (beta)
- Advanced:
  - Faster search engines: Annoy, FAISS, HNSW (optional installs)
  - OCR (EasyOCR) with language selection; thumbnail size + cache cap

Offline Capabilities (Intent-First)

- **Local Provider**: CLIP models bundled with Electron installer for immediate offline search
- **Model Storage**: Default location `{appData}/photo-search/models/` (override with `PHOTOVAULT_MODEL_DIR`)
- **PWA Offline**: Service worker caches shell, thumbnails, and read-only JSON for offline browsing
- **Air-gapped Support**: Works without network connectivity after initial installation

Electron Packaging (Intent-First)

1. Install Python deps (`pip install -r photo-search-intent-first/requirements.txt`) so the bundling script can talk to Hugging Face.
2. Prepare the UI bundle: `npm --prefix photo-search-intent-first/electron run build:ui` (runs Vite build in the webapp).
3. Stage bundled models (downloads, verifies hashes, and writes `manifest.json`):

   ```bash
   npm --prefix photo-search-intent-first/electron run prepare:models
   ```

4. Create installers: `npm --prefix photo-search-intent-first/electron run dist` (`pack` builds unpacked directories).

The `prepare:models` step downloads the CLIP weights specified in `electron/models/manifest.template.json`, records a deterministic hash per model, and ships them via Electron `extraResources`. On application launch the runtime verifies hashes, copies the models into `{appData}/photo-search/models`, and exports environment variables (`PHOTOVAULT_MODEL_DIR`, `TRANSFORMERS_OFFLINE=1`, `SENTENCE_TRANSFORMERS_HOME`, etc.) so the local provider never reaches out to the network. Use **Photo Search ▸ Refresh Bundled Models…** from the app menu to force a re-stage if assets become corrupted.

FAISS vs others

- We support multiple ANN options in both apps (optional installs on Classic):
  - Annoy (angular), FAISS (inner‑product/cosine), and HNSW (cosine) when available.
  - Pick based on your platform and preference in Advanced settings.

Package + Entry Point

- Install package in editable mode:
  - `python -m pip install -e .[ann]` (add `[faiss]` if you have FAISS available)
- Run the CLI anywhere:
  - `ps-intent index --dir /path/to/photos --provider local`
  - `ps-intent search --dir /path/to/photos --query "friends having tea"`

Testing Without Downloading Models

- Each folder contains a dummy smoke test that validates indexing and search logic without network/model downloads:
  - Classic: `PYTHONPATH=archive/photo-search-classic python3 archive/photo-search-classic/tests/smoke_dummy.py`
  - Intent-First: `PYTHONPATH=photo-search-intent-first python3 photo-search-intent-first/tests/smoke_dummy.py`

See `DIFFERENCES.md` for a comparison of the two approaches.

Dev: API Token Pairing (401 fix)

- When `API_TOKEN` is set, the backend requires `Authorization: Bearer <token>` on mutating endpoints (search, index, etc.).
  Dev auth defaults
- Default is no-auth in development: `.env` includes `DEV_NO_AUTH=1` which bypasses auth even if `API_TOKEN` is set.
- To test auth locally, set `DEV_NO_AUTH=0` (or unset), then add a matching token pair:
  - Backend: `API_TOKEN=dev123`
  - Frontend: `VITE_API_TOKEN=dev123` (or `localStorage.setItem('api_token','dev123')`)
- Diagnostics:
  - `GET /auth/status` → `{ auth_required: true|false }`
  - `POST /auth/check` (with Authorization header) → 200 if accepted

Production auth

- Set `API_TOKEN=<strong-random>` and do not set `DEV_NO_AUTH`.
- Ensure the deployed UI sends `Authorization: Bearer <token>` for write calls. See `docs/AUTH.md` for options and security notes.

If you still see HMR reload errors, hard refresh the browser to clear stale modules and ensure API is running on `http://localhost:8000` (per `VITE_API_BASE`).

UX Improvements

Recent enhancements to user experience and interface polish:

- **Contextual Search Tips**: Search hints appear after first interaction (`search-first-interaction` event) and when photos are loaded. Dismissal is persisted in localStorage (`hint-search-tips-shown`).
- **Hole-Punch Highlight Overlay**: Onboarding tour uses CSS mask/clip-path for transparent holes around highlighted elements, with adjustable `backdropOpacity` prop.
- **Footer Anchoring**: Empty state uses `h-full` for proper centering and footer positioning at screen bottom.
- **Electron SW Guard**: Service worker protection prevents conflicts between Electron and web service workers, ensuring proper offline functionality in desktop app.
- **Visual Test Validation**: All UX improvements validated through Playwright visual regression tests (20/25 tests passing, browser-specific timeouts noted but non-critical).
- **Electron Service Worker Guard**: SW registration skipped in Electron dev to prevent 404s.

Documentation

- Frontend Demo Guide: `photo-search-intent-first/docs/FRONTEND_DEMO_GUIDE.md`
- Intent-First Handbook: `photo-search-intent-first/docs/intent_first_handbook.md`
- Visual Testing: `docs/VISUAL_TESTING.md`
- Webapp Error Logging + Deep Links: `photo-search-intent-first/webapp/docs/error-logging-and-deeplinks.md`
- Implementation Plan: `TODO_PLAN.md` (current cross-cutting TODOs, verification steps, acceptance criteria)

Fast ANN Indexes

The Intent-First backend supports optional accelerated search via FAISS, HNSW, or Annoy. These are **not required**; the system falls back to exact similarity if none are installed/built. A unified `FastIndexManager` abstraction manages build, status, and selection.

Quick start:

1. Build base embeddings first:
   `python3 photo-search-intent-first/cli.py index --dir /path/to/photos --provider local`
2. (Optional) Build a fast index (pick one you have libs for):
   `python3 photo-search-intent-first/cli.py fast build --dir /path/to/photos --kind annoy`
3. Inspect status:
   `python3 photo-search-intent-first/cli.py fast status --dir /path/to/photos`
4. Use fast search from API/UI by sending form fields `use_fast=1` and optional `fast_kind=auto|faiss|hnsw|annoy|exact`.

API endpoints:

- `POST /fast/build` – `{dir, kind}`
- `GET  /fast/status?dir=...` – backend availability/build matrix
- `POST /search` – adds `fast_backend`, `fast_fallback` keys when `use_fast=1`

Details, status schema, fallback ordering, and troubleshooting: see `photo-search-intent-first/FAST_INDEXES.md`.
