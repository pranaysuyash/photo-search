# Deployment – Classic and Intent‑First

This repo ships two separate, feature‑aligned apps you can deploy independently.

Targets
- API + static web (FastAPI serves the React build)
- Electron (desktop) – dev wrappers are included; packaging tasks tracked in PROJECT_PLAN.md

Docker (recommended)

Classic
- Build: `docker build -t photo-search-classic:latest photo-search-classic`
- Run: `docker run --rm -p 8001:8001 photo-search-classic:latest`
- Open: http://127.0.0.1:8001/

Intent‑First
- Build: `docker build -t photo-search-intent-first:latest photo-search-intent-first`
- Run: `docker run --rm -p 8000:8000 photo-search-intent-first:latest`
- Open: http://127.0.0.1:8000/

Compose (both at once)
- `docker-compose up --build`
- Classic UI: http://127.0.0.1:8001/
- Intent‑First UI: http://127.0.0.1:8000/

Landing Page
- The static site in `landing/` can be hosted via GitHub Pages/Netlify/S3.
- Replace download links with your S3/Drive URLs and configure payment links.

Notes
- The React builds default to `window.location.origin` for API calls, so the static UI and API can be served from the same origin without extra config. Override with `VITE_API_BASE` at build‑time if needed.
- Optional providers (HF/OpenAI) require outbound network and user‑supplied tokens.
- Fast search engines are optional in Classic. The Docker images include only Annoy via Python requirements; FAISS/HNSW are not preinstalled due to platform variability. The API gracefully falls back to exact search when a fast engine is unavailable.

Local (without Docker)
- Classic
  - API: `uvicorn photo-search-classic.api.server:app --port 8001 --reload`
- Web: `cd archive/photo-search-classic/webapp && npm i && npm run build` (served by the API)
- Intent‑First
  - API: `uvicorn photo-search-intent-first.api.server:app --port 8000 --reload`
  - Web: `cd photo-search-intent-first/webapp && npm i && npm run build` (served by the API)


Desktop Packaging (electron-builder)
- Classic: `cd archive/photo-search-classic/electron && npm i && npm run build:ui && npm run dist` → artifacts in `dist/`
- Intent‑First: `cd photo-search-intent-first/electron && npm i && npm run build:ui && npm run dist` → artifacts in `dist/`
