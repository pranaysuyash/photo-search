Photo Search – Two Approaches

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

Documentation
- Frontend Demo Guide: `photo-search-intent-first/docs/FRONTEND_DEMO_GUIDE.md`
- Intent-First Handbook: `photo-search-intent-first/docs/intent_first_handbook.md`
- Visual Testing: `docs/VISUAL_TESTING.md`
- Webapp Error Logging + Deep Links: `photo-search-intent-first/webapp/docs/error-logging-and-deeplinks.md`
