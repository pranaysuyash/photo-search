# Frontend v3 Revamp – Decision Record and Integration Plan

Date: 2025-10-05
Owner: Frontend Revamp Initiative
Status: Adopted

## 1) Scope and Principles

- Scope is frontend-only revamp (webapp-v3). No backend rewrites.
- The v1 backend is first-class and remains the source of truth.
- New frontend features must run against v1 BE unless explicitly gated.
- When new BE support is needed, it should be added to the main existing backend, not a parallel server.

## 2) Current State Summary

- webapp-v3: modern React 18 + TS + shadcn/ui + Zustand; routes for Library, Search, Collections, People, Trips, Analytics, and newly added Places and Tags.
- Sidebar wiring and TopBar search integrated with an API client.
- PlacesView and TagsView exist; Places has a map placeholder awaiting integration.
- The active backend mounts many routers (including legacy), but subtle endpoint/shape differences vs expectations exist. To avoid churn, v3 will use a thin FE adapter for v1.

## 3) Backend Stance (Agreed)

- Do not spin up a “new backend” for v3.
- If v3 requires new server capabilities, extend the main backend in-place (same repo lineage) via PRs, behind routes that preserve compatibility.
- For the immediate revamp, bridge differences client-side to keep delivery unblocked.

## 4) Compatibility Strategy (Frontend)

- Implement a frontend v1 API adapter that:
  - Maps v3 ApiClient calls to v1 endpoints, translating parameters and normalizing responses into stable types (LibraryResponse, SearchResponse, etc.).
  - Lives alongside the existing `api.ts` and is selectable via env toggle.
- Add a runtime flag: `VITE_API_MODE=v1|refactor` to switch between adapters.
- Provide a small endpoint mapping matrix (v3 -> v1) and contract tests to ensure shapes are consistent.

### Initial Adapter Coverage

- Phase 1: Library (GET /library), Search (POST /search)
- Phase 2: Collections (GET/POST/DELETE), Tags (GET/POST)
- Phase 3: Faces (/faces/*), Trips (/trips, /trips/build)
- Phase 4: Batch, OCR/Metadata, Video, Saved/Presets as needed

## 5) Endpoint Mapping (High-level Draft)

- Library
  - v3 client expects: GET /api/library?dir=&provider=&limit=&offset=
  - v1: same or compatible; normalize to `{ paths: string[], total, offset, limit }`.
- Search
  - v3 client uses POST /api/search with form-data: dir, query, provider, top_k, offset
  - v1 supports search variants; ensure payload keys match (`query` vs `q`) and normalize to `{ results: {path, score}[] }`.
- Collections
  - v3 client uses GET/POST/DELETE; adapter ensures body shapes and names align.
- Tags
  - v3 client: tags list/apply; adapter translates to v1 tags routes.
- Faces/Trips
  - Adapter proxies to v1, normalizes cluster/trip shapes for People/Trips views.

A full, file-level mapping doc will be produced with params and response deltas when the adapter lands.

## 6) Feature Status (Frontend)

- Complete: routing, sidebar, top bar search, library rendering, Places/Tags views, theme, basic analytics view wiring.
- In progress/planned:
  - Replace Places map placeholder with interactive map & clustering
  - Advanced Search UI (AI suggestions/history/filters) – to be ported from legacy webapp
  - Enhanced Lightbox (zoom/metadata/keyboard) – to be ported
  - Command Palette (Cmd+K) – to be ported
  - Batch actions UI; Favorites/Ratings UI wiring

## 7) Consolidated TODOs

- Backend parity (implemented in main BE where needed):
  - Auth, Favorites, Tags API, Collections CRUD, Faces, Trips, Search pagination/caching, OCR/Metadata, Video, Batch ops, Workspaces
- Frontend-v3 (port/wire):
  - Enhanced Lightbox, Command Palette, Advanced Search UI, Places map integration, Tag management UI, Batch actions UI, Favorites & Ratings, Similar/Duplicates views
- Compat Layer:
  - v1 API adapter (FE), backend mode toggle, endpoint mapping matrix, contract tests, CORS/auth wiring, smoke test
- Platform/QA/Docs:
  - Electron/PWA offline pathing, E2E coverage for new routes, UI TODO markers for backend-gated features, this decision record

Note: The live, granular task list is tracked in the repo TODO manager (see current Todo List).

## 8) Risks and Mitigations

- Risk: Subtle API drift breaks UI flows.
  - Mitigation: Adapter normalizes; contract tests enforce shapes.
- Risk: Dual modes (v1/refactor) add complexity.
  - Mitigation: Keep adapter small, focus on v1 as default.
- Risk: Perceived backend churn delays frontend delivery.
  - Mitigation: No backend edits required for initial delivery; if needed, PRs extend the main BE only.

## 9) Rollout Plan

- Week 1: Implement adapter for Library/Search + toggle; smoke test v3 on v1 BE; ship internally.
- Week 2: Port Command Palette and Enhanced Lightbox; add E2E sanity.
- Week 3+: Integrate Places map; port Advanced Search UI; extend adapter to Collections/Tags.

## 10) Validation & Quality Gates

- Build/Typecheck: v3 builds cleanly; adapter compiles both modes.
- Unit/Contract tests: shapes for LibraryResponse/SearchResponse validated.
- E2E smoke: Library load, search flow, navigation across views.
- Accessibility: Keep a11y checks on interactive elements (buttons vs divs with onClick).

## 11) Decision Log

- Frontend revamp remains frontend-only – no backend forks.
- v1 backend is first-class; v3 front targets it via adapter.
- Any new backend work happens in the main backend, not a parallel tree.
- UI clearly marks backend-gated features with TODO placeholders when necessary.

## 12) How to Switch Backends (once adapter is added)

- Set `VITE_API_MODE=v1` to use v1 backend; `refactor` to use the refactored routes.
- Optionally set `VITE_API_BASE` if v1 is hosted elsewhere; CORS/auth handled by adapter.

---
This document captures the constraints and the operating model so our frontend work proceeds fast without backend churn, while keeping the path clear to add/extend endpoints in the main backend when genuinely needed.
