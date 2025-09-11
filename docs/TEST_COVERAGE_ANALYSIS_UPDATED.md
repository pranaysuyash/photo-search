# Photo Search — Combined Test Coverage, API, and Flow Documentation (Updated)

This document combines Qwen’s revised findings with Codex’s repo‑grounded analysis into a single, practical reference you can use to test every flow end‑to‑end. It includes: current coverage, gaps, a prioritized plan, endpoint catalog, page/linkage map, user flows, and a ready‑to‑run smoke checklist.

---

## Executive Summary

- The project has a solid testing foundation: core stores/contexts covered, many components already tested, API client unit tests present, and onboarding E2E + visual tests in place.
- Significant value remains in covering complex user workflows (faces, collections, videos, sharing) and rounding out endpoint/edge‑case tests.
- This doc provides the authoritative catalog of endpoints, features, pages, flows, and test status with a precise gap plan.

---

## Key Findings Comparison (Qwen ↔ Codex)

Qwen (revised) acknowledges Codex’s analysis is more accurate and detailed than the initial assessment. The combined view:

- What Qwen underestimated
  1. Frontend component coverage: Many core components already have tests (TopBar, ResultsPanel, TasksView, etc.).
  2. Backend API coverage: Most core endpoints already have unit tests in `webapp/src/api*.test.ts[x]`.
  3. User flow coverage: Comprehensive onboarding E2E tests (with performance metrics) + visual/regression and responsive tests.
  4. Integration coverage: App‑level integration tests with mocked stores.

- What Qwen overlooked
  1. Missing tests for specific components (FaceClusterManager, VideoManager, ShareViewer, ExportModal).
  2. Granularity of API endpoint coverage (pagination, lifecycle endpoints, faces ops) present in code.
  3. User flow details: keyboard navigation, mobile responsiveness, error handling already tested.
  4. Performance hooks in onboarding tests.

- Gaps that still exist (aligned)
  1. Missing component tests: FaceClusterManager, VideoManager, ShareViewer, ExportModal.
  2. Complex user workflows: faces management, collections/smart, video processing, sharing.
  3. Edge cases: error conditions, performance under load, security testing.
  4. Accessibility: comprehensive a11y coverage across components.

- Recommendations (combined)
  1. Immediate: Add tests for missing components above.
  2. Short‑term: Expand API endpoint coverage for edge cases and error handling.
  3. Medium‑term: Build full E2E test suites for complex workflows (faces/collections/videos/sharing/trips).
  4. Long‑term: Add performance, accessibility, and security testing; wire CI coverage gates.

---

## Current Test Inventory (Repo‑Grounded)

- Unit/Integration (Vitest)
  - App: `src/App.test.tsx`, `src/App.smoke.test.tsx`, `src/App.collections.test.tsx`
  - API: `src/api.test.ts`, `src/api.more.test.ts` (payload/URL validation for many endpoints)
  - Contexts: `src/contexts/*Context.test.tsx`
  - Stores: `src/stores/*Store.test.tsx`
  - Components (present tests):
    - TopBar, StatusBar, ResultsPanel (+keyboard), ResultsGrid, JustifiedResults,
      SearchControls, LibraryBrowser, Lightbox, PeopleView, SavedSearches, TasksView,
      IndexManager, MapView, TripsView, Collections, SmartCollections,
      Workspace, LookAlikesView
  - Smoke: `src/smoke.test.ts`

- E2E/Visual (Playwright)
  - Onboarding E2E: `tests/onboarding.e2e.test.ts` (first‑run, tooltips, mobile, recovery)
  - Visual: `tests/visual/*` (status bar, topbar indexed chip, search interface, onboarding)
  - Responsive: `tests/visual/responsive.test.ts`

---

## Coverage Map

- Strong
  - Stores/Contexts: settings/ui/workspace/photo & contexts.
  - API unit tests: search/index build/favorites/saved/presets/diagnostics/library/workspace/metadata detail.
  - Onboarding E2E; visual/regression; responsive.

- Thin/Missing
  - Index lifecycle: `/index/status`, `/index/pause`, `/index/resume` (unit/integration).
  - Pagination assembly: `/search/paginated`, `/library/paginated` (filters/sort/order).
  - Faces workflow: `/faces/*` (build/clusters/name/photos/merge/split).
  - Trips/Map: `/trips/build`, `/trips`, `/map`.
  - Sharing: `/share`, `/share/revoke`.
  - Videos: `/videos`, `/video/metadata`, `/videos/index` (+ thumbnail URL tests).
  - Export/Delete/Undo/Batch: round out direct API & component flows.
  - Components not covered: FaceClusterManager, VideoManager, VideoLightbox, ShareViewer, ExportModal, Diagnostics drawer (optional add).

---

## Endpoint Catalog (Features → Endpoints)

- Indexing
  - POST `/index` (start) → { new, updated, total }
  - GET `/index/status` (progress, coverage, state)
  - POST `/index/pause`, `/index/resume`
  - POST `/fast/build` (annoy/faiss/hnsw)

- Search
  - POST `/search`
  - GET `/search/paginated` (favorites/tags/date/camera/ISO/f/flash/wb/metering/alt/heading/place/ocr/text/person(s)/sharpOnly/exposure; pagination)
  - POST `/search_like`, `/search_like_plus`

- Library
  - GET `/library`
  - GET `/library/paginated?sort=&order=`

- Faces
  - POST `/faces/build`
  - GET `/faces/clusters`, GET `/faces/photos?cluster_id=`
  - POST `/faces/name`, `/faces/merge`, `/faces/split`

- OCR/Captions/Metadata
  - GET `/ocr/status`, POST `/ocr/snippets`
  - POST `/captions/build`
  - POST `/metadata/build`, GET `/metadata`

- Trips/Map
  - POST `/trips/build`, GET `/trips`
  - GET `/map`

- Favorites/Saved/Presets
  - GET/POST `/favorites`
  - GET/POST/DELETE `/saved`, `/saved/delete`
  - GET/POST/DELETE `/presets`, `/presets/delete`

- Export/Delete/Undo/Batch
  - POST `/export`, `/delete`, `/undo_delete`
  - POST `/batch/delete`, `/batch/tag`, `/batch/collections`

- Sharing
  - POST `/share`, GET `/share`, POST `/share/revoke`

- Videos
  - GET `/videos`, GET `/video/metadata`, GET `/video/thumbnail` (helper), POST `/videos/index`

- Workspace & Diagnostics
  - GET/POST `/workspace*`
  - GET `/diagnostics`, GET `/analytics`, POST `/analytics/log`, GET `/todo`

---

## Pages/Components ↔ Endpoints (Linkage)

- TopBar/StatusBar: `/index`, `/index/status`, `/index/pause|resume`, `/analytics`, `/diagnostics` (progress/ETA/coverage/tooltip)
- SearchBar/SearchControls: `/search`, `/search/paginated`, `/metadata`, `/map`
- ResultsPanel/Grid/JustifiedResults: `/favorites`, `/batch/*`, `/export`, `/delete`, `/undo_delete`
- Lightbox: `/search_like/_plus`, `/export`, `/delete`, `/open`, `/ocr/snippets`
- LibraryBrowser: `/library`, `/library/paginated`
- Collections/Smart: `/collections`, `/smart_collections`, `/smart_collections/resolve`
- Faces: `/faces/build`, `/faces/clusters`, `/faces/photos`, `/faces/name`, `/faces/merge|split`
- Trips/Map: `/trips/build`, `/trips`, `/map`
- Videos: `/videos`, `/video/metadata`, `/video/thumbnail`, `/videos/index`
- ShareViewer: `/share`, `/share/revoke`
- IndexManager/BackupDashboard: `/diagnostics`, `/analytics`

---

## User Flows (Intent‑First)

- Onboard & Select Library → preload `/library` → show dir/count
- Build Index → start → poll → show `%`, ETA, coverage, pause/resume → complete
- Search & Filter & Paginate → submit `/search` or `/search/paginated` → chips reflect filters
- Visual Similarity → `/search_like` → optional `/search_like_plus` (text+weight)
- Favorites/Saved/Presets → toggle/list/add/delete
- Collections/Smart → create/edit/delete/resolve → results visible
- Faces → build → clusters → photos → name/merge/split → PeopleView update
- Trips/Map → build trips → list → map points
- Export/Delete/Undo/Batch → export → delete → undo → batch tag/collections
- Sharing → create/list/revoke
- Videos → list → metadata → index → thumbnail → lightbox controls

---

## Gaps & Prioritized Plan

- Phase 1 – API Unit Tests (fast wins)
  - Index lifecycle: `/index/status`, `/index/pause`, `/index/resume`
  - Pagination: `/search/paginated`, `/library/paginated` (filters/sort/order)
  - Faces: `/faces/clusters`, `/faces/photos`, `/faces/name`, `/faces/merge`, `/faces/split`
  - Trips/Map: `/trips/build`, `/trips`, `/map`
  - Sharing: `/share`, `/share/revoke`
  - Videos: `/videos`, `/video/metadata`, `/videos/index`
  - OCR/Captions: `/ocr/status`, `/ocr/snippets`, `/captions/build`
  - Export/Delete/Batch: `/export`, `/delete`, `/undo_delete`, `/batch/*`

- Phase 2 – Component Tests
  - FaceClusterManager: name/merge/split/photos render + API calls
  - VideoManager/VideoLightbox: list/select/metadata/index/keyboard/touch
  - ShareViewer/ExportModal: happy paths
  - (Optional) DiagnosticsPanel: pure read‑only render with mock data

- Phase 3 – E2E Flows
  - Faces journey; Collections/Smart; Export/Delete/Undo/Batch; Sharing; Videos; Trips/Map

- Long‑Term
  - Performance (under load), Accessibility (keyboard/ARIA), Security (share tokens/passwords)
  - CI/CD gates: coverage thresholds, visual regression baseline

---

## Ready‑to‑Run Smoke Checklist (Curl)

Setup:
- `export BASE=http://127.0.0.1:8000`
- `export DIR="/path/to/photos"; export PROVIDER="local"`
- `export TOKEN="…"` (if applicable)
- `alias HCURL='curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"'`
- `alias HCURLGET='curl -sS -H "Authorization: Bearer $TOKEN"'`

Examples:
- Index:
  - `HCURL "$BASE/index" -d "{\"dir\":\"$DIR\",\"provider\":\"$PROVIDER\",\"batch_size\":32}"`
  - `HCURLGET "$BASE/index/status?dir=$(python3 - <<<'import urllib.parse,os;print(urllib.parse.quote(os.environ[\"DIR\"]))')&provider=$PROVIDER"`
  - Pause/Resume: `HCURL "$BASE/index/pause" -d "{\"dir\":\"$DIR\"}"` / `HCURL "$BASE/index/resume" -d "{\"dir\":\"$DIR\"}"`
- Search:
  - `HCURL "$BASE/search" -d "{\"dir\":\"$DIR\",\"query\":\"beach\",\"provider\":\"$PROVIDER\",\"top_k\":24}"`
  - Paginated filters: `HCURLGET "$BASE/search/paginated?dir=$(python3 - <<<'import urllib.parse,os;print(urllib.parse.quote(os.environ[\"DIR\"]))')&query=family&provider=$PROVIDER&limit=24&offset=0&favorites_only=true&tags=vacation,friends&camera=iPhone&iso_min=100&iso_max=800&f_min=1.8&f_max=8&place=SF&use_ocr=true&has_text=true"`
- Similarity:
  - `HCURL "$BASE/search_like" -d "{\"dir\":\"$DIR\",\"path\":\"/…/photo.jpg\",\"provider\":\"$PROVIDER\",\"top_k\":24}"`
  - `HCURL "$BASE/search_like_plus" -d "{\"dir\":\"$DIR\",\"path\":\"/…/photo.jpg\",\"provider\":\"$PROVIDER\",\"top_k\":24,\"text\":\"sunset beach\",\"weight\":0.5}"`
- Favorites/Saved/Presets: GET/POST `/favorites`; GET/POST/DELETE `/saved*`, `/presets*`
- Collections/Smart: GET/POST/DELETE `/collections*`, `/smart_collections*`; resolve `/smart_collections/resolve`
- Faces: POST `/faces/build`; GET `/faces/clusters`; GET `/faces/photos?cluster_id=`; POST `/faces/name`; POST `/faces/merge`; POST `/faces/split`
- OCR/Captions/Metadata: GET `/ocr/status`; POST `/ocr/snippets`; POST `/captions/build`; POST `/metadata/build`; GET `/metadata`
- Trips/Map: POST `/trips/build`; GET `/trips`; GET `/map`
- Videos: GET `/videos`; GET `/video/metadata?path=…`; POST `/videos/index`
- Export/Delete/Undo/Batch: POST `/export`, `/delete`, `/undo_delete`, `/batch/delete`, `/batch/tag`, `/batch/collections`
- Sharing: POST `/share`; GET `/share?dir=…`; POST `/share/revoke`
- Diagnostics/Analytics: GET `/diagnostics?dir=…`; GET `/analytics?dir=…&limit=50`; POST `/analytics/log`

---

## Optional Diagnostics Panel (Add‑On)

- Purpose: single drawer/panel to surface `diagnostics + index status + analytics tail`.
- Inputs: `/diagnostics`, `/index/status`, `/analytics?limit=`.
- UI: progress (processed/target), coverage, paused chip; engine list with fast flags; storage/OS; recent events.
- Tests: pure read‑only render with mocked data.

---

## Status & Next Actions

- Solid foundation: core components/stores tested; API unit tests exist; onboarding E2E/visual/responsive in place.
- Immediate next steps:
  - Unit: index status/pause/resume; pagination; faces; trips/map; sharing; videos; OCR/captions; export/batch.
  - Component: FaceClusterManager, VideoManager/VideoLightbox, ShareViewer, ExportModal, DiagnosticsPanel.
  - E2E: faces, collections/smart, export/delete/undo/batch, sharing, videos, trips/map.
- Long‑term: performance, accessibility, security, CI coverage gates.

> This document supersedes prior snapshots and should be treated as the canonical reference for testing, endpoints, flows, and coverage planning.

