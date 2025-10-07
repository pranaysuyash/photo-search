# Decisions: Offline-First + Auto Indexing (v3)

Date: 2025-10-06

Status: Accepted

## Context

- The app targets both web and Electron. Electron must work offline and render images locally when possible.
- Users expect selecting a folder to “just work” without running CLI commands.
- Our backend already exposes index endpoints (`POST /api/index`, `GET /api/index/status`) and a file watcher API.

## Decision

1. Auto-index on folder select (frontend-driven)

   - When a user selects a folder in v3, the UI triggers `POST /api/index` once.
   - The UI polls `GET /api/index/status` briefly and refreshes library + analytics/trips on completion.
   - Provider defaults to `local` to avoid remote dependency and support offline-first.

2. Client-side media rendering

   - Web: use `/api/photo` and `/api/thumb` endpoints for images; React renders the content.
   - Electron: prefer `file://` paths for `getPhotoUrl`/`getThumbnailUrl` to maximize offline capability.

3. Generated assets
   - Use `scripts/gen_brand_assets.sh` (FAL) to create v3-specific icons/backgrounds.
   - Store assets under `webapp-v3/public/generated/` and reference them in UI (e.g., `Sidebar.tsx`).

## Consequences

- No manual CLI step is required in production; indexes are created from the UI.
- Counts in the sidebar are populated from `/analytics` and `/trips` once indexing completes.
- The UI remains responsive; heavy work runs on the backend.

## Implementation Notes

- Frontend changes:
  - `src/services/api.ts`: add `startIndex()` and `getIndexStatus()`.
  - `src/services/api_v1_adapter.ts`: implement the same methods for v1 mode.
  - `src/App.tsx`: on directory set, call `startIndex()` once; poll `getIndexStatus()`; refresh data.
  - Background uses icons from `/public/generated` and a subtle canvas background in `styles/generated-bg.css`.
- Backend already has endpoints under the `indexing` router: `/api/index`, `/api/index/status`.

## Rollback Plan

- If auto-index causes issues, disable the call in `App.tsx` and revert to manual CLI (`cli.py index`).

## Follow-ups

- Wire Places and Tags views to live data instead of placeholders.
- Optionally enable `/api/watch/start` after index to incrementally pick up new files.
