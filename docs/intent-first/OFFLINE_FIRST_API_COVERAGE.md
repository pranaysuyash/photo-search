# Offline-First API Coverage (Intent-First)

Date: 2025-09-23

This document summarizes which backend APIs support offline-first usage, which are partially supported via client/service-worker caching, and which require network. It reflects the current `api/server.py` and the webapp service worker as of this commit.

Legend:

- Fully Offline: Works without network once local indexes/state exist
- Conditionally Offline: Read-only GETs served from cache when available (TTL ~5 min), thumbnails cached; POSTs will fail offline
- Online Only: Requires network at call time

## App Shell and Static Assets

- index.html, JS/CSS, icons: Fully Offline (pre-cached app shell)

## Read APIs (GET)

- /library, /library/paginated: Conditionally Offline (SW JSON cache)
- /collections, /smart_collections, /presets: Conditionally Offline (SW JSON cache)
- /favorites, /tags, /saved: Conditionally Offline (SW JSON cache)
- /metadata, /metadata/detail, /metadata/batch: Conditionally Offline (SW JSON cache)
- /map, /map/clusters, /map/clusters/photos: Conditionally Offline (SW JSON cache)
- /faces/clusters, /faces/photos: Conditionally Offline (SW JSON cache)
- /ocr/status: Conditionally Offline (SW JSON cache)
- /trips: Conditionally Offline (SW JSON cache)
- /workspace: Conditionally Offline (SW JSON cache)
- /videos, /video/metadata: Conditionally Offline (SW JSON cache)
- /status/{operation}, /diagnostics: Online Only (dynamic system status)
- /auth/status: Online Only (auth handshake)
- /api/ping, /health: Online Only

## Media Thumbnails and Images (GET)

- /thumb, /thumb_face, /video/thumbnail: Conditionally Offline
  - Stale-while-revalidate caching of image responses. Cached when fetched; usable offline thereafter.

## Search APIs

- /search, /search/cached, /search/paginated, /search_workspace: Online Only
  - These are POSTs and not cached by SW. If desired, a client-side cache could store last successful results keyed by query+filters for offline recall, but current impl is network-first.

## Indexing and Background Jobs (POST)

- /index, /index/pause, /index/resume, /index/status: Online Only (server-side actions)
- /fast/build, /captions/build, /faces/build, /trips/build, /ocr/build, /videos/index: Online Only
- /thumbs, /thumb/batch: Online Only (batch API)
- /open, /scan_count, /edit/ops, /edit/upscale, /export: Online Only

## Collections, Tags, Favorites, Saved (POST)

- /collections (set), /collections/delete: Online Only
- /smart_collections (set), /smart_collections/delete, /smart_collections/resolve: Online Only
- /favorites (set): Online Only
- /tags (set): Online Only
- /saved (add), /saved/delete: Online Only

## Batch Operations (POST)

- /batch/delete, /batch/tag, /batch/collections: Online Only

## Faces Operations (POST)

- /faces/name, /faces/merge, /faces/split: Online Only

## Models and Config

- /models/capabilities (GET): Online Only (reflects environment)
- /models/download (POST), /models/validate (POST): Online Only
- /settings/excludes (GET/POST): Online Only
- /config/set (POST): Online Only
- /workspace/add, /workspace/remove (POST): Online Only (mutating)

## Sharing

- /share (POST), /share/revoke (POST), /share (GET), /share/detail (GET): Conditionally Offline for GET if cached, but semantics require network for fresh tokens/state.
- /share/{token}/view (GET HTML): Conditionally Offline if previously visited; otherwise Online Only.

## Analytics

- /analytics (GET recent): Conditionally Offline (events stored on disk server-side; if app is offline from server, cannot fetch)
- /analytics/event (POST granular), /analytics/log (POST): Online Only

## Notes and Next Steps

- Client now invalidates SW JSON cache when mutating endpoints are called (api.ts sends ps:invalidate-json-cache messages). This keeps offline views fresh after changes.
- Consider adding optional client-side persistent caches for search results to make last-known results available offline.
- Consider background sync for POSTs (e.g., favorites/tags) when the app is offline to queue and retry when back online.
- Tune JSON TTL per route (currently 5 minutes globally).
