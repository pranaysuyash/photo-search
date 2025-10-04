# Offline Capability Status Report

_Last updated: 2025-10-04_

> Purpose: capture the real state of the "offline-first" workstream, document recent fixes, and describe the remaining implementation required to make the Photo Search app behave correctly without a live FastAPI process or external network access.

## 1. Current Reality Snapshot

### 1.1 What Actually Works Today
- **Basic offline service scaffolding** exists (`EnhancedOfflineService`, `EnhancedOfflineStorage`, `EnhancedOfflineSearchService`), but they mostly wrap `offlineService` and IndexedDB helpers without end-to-end integration.
- **Photo display still depends on HTTP** (`/thumb`, `/library`, `/search`) and falls back to raw `file://` paths when the server is down.
- **Caching** is limited to in-memory structures and incomplete IndexedDB helpers; there is no reliable persistence or invalidation flow.
- **React components** such as `VirtualizedPhotoGrid` now render placeholders gracefully (see §2), but the data flow still pulls library/search results from live API calls.
- **Service worker** caches static assets but does not serve dynamic API data or handle background sync.

### 1.2 What Users Experience Offline Right Now
- The grid shows shadcn-style placeholders instead of broken `<div>` cells (after the latest change), but **no photos appear unless the backend is running**.
- Searches queue in the UI but do not return cached results, because the offline search hooks and storage are incomplete.
- On desktop (Electron builds), there is no IPC path for direct file access or offline thumbnails.

## 2. Work Completed in This Pass

| Area | Changes | Files |
| --- | --- | --- |
| Thumbnail resolution | Added a smarter resolver that hits cached data first, checks `EnhancedOfflineStorage`, and avoids unnecessary `/thumb` calls when offline | `photo-search-intent-first/webapp/src/services/ThumbnailResolver.ts` |
| Grid rendering | `VirtualizedPhotoGrid` now resolves thumbnails asynchronously, revokes blob URLs, and renders shadcn `Card` placeholders instead of inserting raw HTML |
| Documentation | Created this status report and `docs/offline_thumbnail_refinement.md` summarising the thumbnail/grid changes | `docs/offline_status_report.md`, `docs/offline_thumbnail_refinement.md` |

**Testing:** automated checks were not run because `npx` cannot reach the npm registry in the sandboxed environment (see `npx @biomejs/biome` failure).

## 3. Major Gaps (BLOCKERS)

### 3.1 Core Offline Service & Sync
- Offline action queue is not persisted (IndexedDB helpers exist but are not wired).
- No conflict resolution, retry policy, or resumable jobs.
- `EnhancedOfflineService.getStatus()` just reflects `offlineService`'s boolean; there is no real awareness of API health vs. filesystem availability.
- No background sync loop that replays queued actions when the backend/API becomes available.

### 3.2 Library & Search Data Flow
- Hooks (`useOfflineFirstSearch`, `useOfflineFirstMetadata`, etc.) still call network APIs immediately; cached results are not stored or returned.
- IndexedDB stores are not populated with library data, metadata, or embeddings beyond stubs.
- There is no client-side semantic/keyword search fallback when offline.

### 3.3 File-System Integration
- Electron build does not expose scoped file access APIs; React cannot enumerate folders or serve thumbnails without the Python server.
- No file watchers; external file changes do not invalidate caches or re-trigger indexing.
- Thumbnails are not generated locally; the UI still needs `/thumb`.

### 3.4 Service Worker & Background Sync
- No caching strategies for dynamic API responses (`/library`, `/search`, `/thumb`).
- No background sync or deferred requests when offline.

### 3.5 Security & IPC
- Placeholder IPC handlers lack path normalization and access controls.
- Electron preload layer needs enforced `contextIsolation`, root whitelists, and tests.

### 3.6 Performance & UX
- Virtualization is still backed by live API data; first paint is slow when the server is cold.
- Offline status indicators and graceful degradation UX are missing.

### 3.7 Testing & Tooling
- No unit/integration/E2E tests cover offline flows (cached library, offline search, reconnection).
- No packaging smoke tests for offline/online transitions in installers.

## 4. Pending Implementation (Prioritized)

### P1 – Unblock Real Offline Usage
1. **Persisted Offline Queue** – write queue to IndexedDB/local storage, replay with backoff, add conflict resolution hooks.
2. **Offline Library Cache** – snapshot library metadata + thumbnails into IndexedDB / enhanced storage; hydrate grid from cache before hitting `/library`.
3. **Offline Search Engine** – cache embeddings + metadata; implement client-side keyword/semantic search when offline.
4. **File Access via IPC** – expose Electron APIs for directory selection, file reads, thumbnail generation, and guard with path validation.

### P2 – Reliability & UX
5. **File Watchers** – detect external changes; invalidate caches; trigger background indexing.
6. **Service-Worker Strategies** – stale-while-revalidate for thumbnails/library, background sync for queued searches.
7. **Offline Hooks** – use React Query / caching to serve data immediately; rename existing hooks to match new behavior.
8. **UX Feedback** – UI badges for "AI-enhanced" vs "basic" modes; offline toast notifications, sync progress valves.

### P3 – Hardening & Distribution
9. **IPC Security** – audit allow-list, normalize paths, add tests.
10. **Python Supervisor** – auto-restart with exponential backoff, health endpoints, queue depth metrics.
11. **Installer Pipeline** – codesign/notarize, SmartScreen, on-demand model downloader with resume + hash check.
12. **Tests & Docs** – add unit/integration/E2E coverage, update developer/user docs accordingly.

## 5. Immediate Next Steps
- Decide ownership: dedicate time to implement P1 items (queue persistence, offline cache, search fallback, IPC hooks).
- Draft acceptance tests for "browse photos with backend down" and "search offline" to prevent regressions.
- Coordinate with Electron packaging team to expose file APIs required by the resolver (once available, extend `ThumbnailResolver` step 3).

## 6. Related References
- `photo-search-intent-first/webapp/src/services/ThumbnailResolver.ts`
- `photo-search-intent-first/webapp/src/components/VirtualizedPhotoGrid.tsx`
- `photo-search-intent-first/webapp/src/hooks/useOfflineFirst.ts`
- `photo-search-intent-first/webapp/src/services/EnhancedOfflineService.ts`
- `docs/offline_thumbnail_refinement.md`

---
Feedback welcome – expand this report as milestones complete or new blockers appear.
