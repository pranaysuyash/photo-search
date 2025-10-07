# Frontend v3 ↔ Backend Parity Gaps

_Date: 2025-10-07_

This memo documents the feature gaps between the intent-first backend and the modern v3 frontends (webapp-v3 + electron-v3 shell). It inventories which backend capabilities still lack v3 UI coverage, and where the new frontends expect data or events that the backend (or Electron bridge) does not yet provide. Each gap includes a v3-aligned design recommendation to close the loop.

## How to read this document
- **Backend → Frontend gaps** highlight server features that are already implemented but missing in both v3 clients.
- **Frontend → Backend gaps** capture v3 UI expectations that currently lack server or desktop plumbing.
- **Electron bridge gaps** call out menu/IPCs that are not wired into the v3 React app.

---

## 1. Backend capabilities without v3 frontend coverage

| Capability | Backend evidence | v3 frontend status | Suggested v3 integration |
| --- | --- | --- | --- |
| Favorites management (list/toggle) | `/favorites` GET/POST in `api/routers/favorites.py` return the favorite set and toggle state. | _Completed (Oct 2025):_ `webapp-v3` now calls `apiClient.getFavorites`/`toggleFavorite` to hydrate the Favorites route and sync grid actions. | Keep monitoring analytics parity; `/analytics` now exposes `favorites_total`, but broader summary fields (tags/places/index size) remain TODO. |
| Manual & automatic tagging | `/tags` CRUD + `/autotag` in `api/routers/tagging.py` generate and persist tags. | Tags view fabricates counts and keeps empty photo lists. | Replace placeholder logic with `GET /tags` and `POST /tags`. Surface `/autotag` behind a “Generate tags” CTA that reflects job progress in the shadcn UI. |
| Places analytics | `api/routers/metadata.py` returns camera + place lists from EXIF. | Places view uses random coordinates/counts and logs console messages. | Call `/metadata/places` (or extend analytics) to hydrate real place names. Replace fake coordinates with map-ready lat/lon once backend enriches metadata. |
| Batch operations (delete/tag/collections) | `/batch/delete`, `/batch/tag`, `/batch/collections` in `api/routers/batch.py` process bulk updates. | No batch UI in v3 grid/actions. | Add multi-select toolbar actions (“Delete”, “Add tags”, “Add to collection”) that invoke the batch endpoints and refresh state. |
| Video indexing/serving | `/videos`, `/videos/index`, `/video/metadata`, `/video/thumbnail` in `api/routers/videos.py` expose video cataloging. | v3 components list excludes any video surface. | Introduce a `Videos` view (shadcn cards) that lists indexed clips, shows thumbnails, and links to playback once Electron wiring lands. |
| OCR & metadata enrichment | `/ocr/*`, `/metadata/*`, `/captions/*` in their respective routers offer extraction endpoints. | Analytics/Details panes do not surface OCR text or EXIF roll-ups. | Extend the photo detail sheet to call OCR endpoints on demand and surface metadata facets (camera, lens, place) using existing shadcn accordions. |
| Smart collections / auto curation | `/smart_collections`, `/auto_curation` pipelines in the backend generate thematic albums. | Sidebar only lists manual collections; no smart album chips resolve. | Add a smart collections section that fetches `/smart_collections` and renders cards similar to the current Collections UI, with badges for automation source. |
| Workspace management | `/workspace` in `api/routers/workspace.py` lists tracked folders and add/remove endpoints mutate the set. | v3 API client assumes a named `workspaces` array but no UI uses it. | Update the adapter to map `folders` into `{name, path}` and add a Workspace switcher in the sidebar header to match v3 layout patterns. |
| File management utilities | `/file_management` router supports move/delete/restore workflows. | Library grid has no move-to-folder or trash restore flows. | Layer a context menu in `PhotoLibrary` that routes to file-management calls (move, restore) and reflects undo state in the Jobs indicator. |


---

## 2. v3 frontend expectations lacking backend support

| Frontend feature | v3 source | Missing backend support | Recommended server / adapter work |
| --- | --- | --- | --- |
| Aggregated analytics cards (totals, index size, people/places counts) | `Analytics` component expects `total_photos`, `total_indexed`, `index_size_mb`, `people_clusters`, etc. | `/analytics` currently streams raw event logs without aggregates. | Add an analytics summary endpoint (or extend `/analytics`) that reads index metadata and returns the aggregated fields consumed by the cards. |
| Places & tag detail chips with counts and lat/lon | Places/Tags views assume deterministic counts and coordinates. | Neither `/analytics` nor `/metadata` expose counts or geocodes; coordinates are missing entirely. | Extend metadata pipeline to persist occurrence counts and optional geocoding per place, then expose via `/metadata` so the UI can stop using random placeholders. |
| Workspace list with friendly names | API client expects `{ workspaces: [{ name, path }] }`. | `/workspace` returns `{ "folders": [...] }` without labels. | Either update the backend schema to include `{name, path}` pairs or let the adapter synthesize names (basename of path) before passing to the sidebar directory picker. |
| Electron “import/export/smart search” menu actions | Electron main sends IPC events (`photos-import`, `export-library`, etc.). | No renderer handlers subscribe to these IPC channels. | Implement an electron-aware hook (e.g., `useElectronBridge`) in v3 that registers IPC listeners and triggers the appropriate React flows (open import dialog, launch export wizard, etc.). |

---

## 3. Electron bridge gaps

The electron shell exposes rich integration points, but the React v3 app ignores them today.

- **Menu & IPC plumbing.** The main process emits directory selection, import/export, smart search, and indexing events via IPC channels. The preload script safely exposes these handlers to the renderer, yet no `webapp-v3` module references `window.electronAPI`, so menu actions have no effect. Implement a shared listener (e.g., in `main.tsx`) that hooks into the Zustand stores to update state or open dialogs when IPC events fire.
- **Backend lifecycle.** Electron auto-starts the Python backend in production; ensure the React app respects readiness signals (e.g., show a connection toast when the backend process logs readiness) and retries API calls accordingly.
- **File protocol.** The custom `photoapp://` protocol allows secure local file reads. Update the photo grid and lightbox to prefer this scheme when running under Electron for better sandboxing than raw `file://` paths.

---

## Follow-up status (Oct 2025)
- **ESLint config migration.** Lint remains blocked on the legacy `.eslintrc.cjs`. Migrate to the flat `eslint.config.js` layout so ESLint v9 can execute across `webapp` and `webapp-v3`.
- **Analytics aggregates** _(Completed Oct 2025)_. `/analytics` now emits favorites totals plus photo counts, index size, cameras/places, tags, and people cluster summaries, letting the v3 dashboard drop its placeholders.
- **Workspace & folder selection** _(Completed Oct 2025)_. Electron now exposes `selectDirectory` IPC and `webapp-v3` listens for `directory-selected`, removing the hard-coded demo path. The renderer now persists the recent directory list for browser/dev sessions, so folder choices survive reloads without Electron.
- **Global indexing.** Implement an "index all libraries" workflow that enumerates every tracked workspace and invokes `apiClient.startIndex` per directory instead of limiting to the current selection.
- **Remaining parity rows.** Tags, places, batch operations, Electron IPC enrichments, and analytics aggregates listed earlier are still open until backfilled.

## Next steps
1. Knock out ESLint migration + analytics aggregates to unblock CI and accurate dashboards.
2. Rethink workspace selection + IPC wiring before iterating on desktop UX so directory changes propagate end-to-end.
3. Sequence tagging, places, and batch operations integration work once analytics data contracts stabilize.
