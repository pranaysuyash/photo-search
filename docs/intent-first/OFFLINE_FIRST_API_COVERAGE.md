# Offline-First API Coverage (Intent-First)

Date: 2025-09-29 (supersedes 2025-09-23 revision)

This document summarizes which backend APIs support offline-first usage, which are partially supported via client/service-worker caching, and which require network. It now reflects the authoritative parity baseline taken from `api/original_server.py` (monolith) prior to/alongside modular router extraction.

Important parity note:
Previous documentation referenced a "47 endpoint" surface. The current monolith exposes 99 unique (method, path) route definitions (counted by decorator scan on 2025-09-29). Many earlier single conceptual endpoints (e.g., collections, favorites, smart collections, indexing controls, analytics, faces operations, video, OCR, metadata, workspace management, search variants) have expanded, and new maintenance/diagnostic routes were added. This file will track offline suitability at the granularity of these 99 route definitions while refactoring progress continues.

Refactor context:

- `original_server.py` remains the parity baseline until modular routers (e.g. health, shares, analytics, indexing) are fully extracted and tests guarantee identical semantics.
- Where a route family shares identical offline characteristics (e.g. POST mutators), they may be grouped for brevity; the count mapping is provided in the Summary section.

Summary of Route Counts by Category (99 total):

- Read/Listing GET routes (potentially cacheable): 39
- Mutating / action POST routes (network required): 55
- HTML/Diagnostic & status routes (dynamic / not cached): 5
  (Breakdown derived from decorator scan; exact numbers may shift slightly as modularization deduplicates legacy aliases.)

Legend:

- Fully Offline: Works without network once local indexes/state exist
- Conditionally Offline: Read-only GETs served from cache when available (TTL ~5 min), thumbnails cached; POSTs will fail offline
- Online Only: Requires network at call time

## App Shell and Static Assets

- index.html, JS/CSS, icons: Fully Offline (pre-cached app shell)

## Read APIs (GET)

Below, conceptual groups list representative paths. Unless otherwise stated, sibling GET routes in the same group inherit the same offline classification.

- Library & Pagination: `/library` (and planned `/library/paginated` if/when reintroduced) — Conditionally Offline (SW JSON cache)
- Collections & Organization: `/collections`, `/smart_collections`, `/presets`, `/trips` — Conditionally Offline (JSON cache)
- User Saved Entities: `/favorites`, `/tags`, `/saved` — Conditionally Offline (JSON cache)
- Metadata: `/metadata`, `/metadata/batch` (deprecated `/metadata/detail` no longer present; if restored treat identically) — Conditionally Offline
- Map / Geo: `/map` (cluster / photos sub-routes now consolidated; if re-split treat as Conditionally Offline) — Conditionally Offline
- Faces: `/faces/clusters`, `/faces/photos` — Conditionally Offline
- OCR Status: `/ocr/status` — Conditionally Offline
- Workspace: `/workspace` — Conditionally Offline
- Video: `/videos`, `/video/metadata` — Conditionally Offline
- Status & Diagnostics: `/status/{operation}`, `/diagnostics` — Online Only (dynamic, per-request computation)
- Auth / Health: `/auth/status`, `/api/ping`, `/health`, `/tech.json` — Online Only (live status / handshake)
- Shares (public-ish views): `/share`, `/share/detail`, `/share/{token}/view` — Conditionally Offline for previously fetched GET responses (HTML view & JSON); freshness requires network for revocation or new tokens.

## Media Thumbnails and Images (GET)

- `/thumb_face`, `/video/thumbnail` (and legacy `/thumb` if present) — Conditionally Offline
  - Strategy: stale-while-revalidate; once fetched, usable offline until eviction.

## Search APIs

- `/search`, `/search/cached`, `/search/paginated`, `/search_workspace`, plus similarity & video variants `/search_like`, `/search_like_plus`, `/search_video`, `/search_video_like` — Online Only (POST; not service-worker cached)
  - Future enhancement: optional client-side encrypted persistent cache keyed by normalized query + filters for last-known results offline recall.

## Indexing and Background Jobs (POST)

- Index Control: `/index`, `/index/pause`, `/index/resume`, `/index/status` — Online Only
- Builders: `/fast/build`, `/captions/build`, `/faces/build`, `/trips/build`, `/ocr/build`, `/metadata/build`, `/videos/index`, `/thumbs`, `/thumb/batch` — Online Only
- Utilities / Ops: `/open`, `/scan_count`, `/edit/ops`, `/edit/upscale`, `/export` — Online Only

## Collections, Tags, Favorites, Saved (POST)

- `/collections`, `/collections/delete` — Online Only
- `/smart_collections`, `/smart_collections/delete`, `/smart_collections/resolve` — Online Only
- `/favorites` — Online Only
- `/tags` — Online Only
- `/saved`, `/saved/delete` — Online Only

## Batch Operations (POST)

- `/batch/delete`, `/batch/tag`, `/batch/collections` — Online Only

## Faces Operations (POST)

- `/faces/name`, `/faces/merge`, `/faces/split` — Online Only

## Models and Config

- `/models/capabilities` (GET) — Online Only (runtime environment snapshot)
- `/models/download`, `/models/validate` — Online Only
- `/settings/excludes` (GET) — Online Only (not cached to avoid stale exclusion lists)
- `/workspace/add`, `/workspace/remove` — Online Only
- Data reset / destructive: `/data/nuke`, `/delete`, `/undo_delete`, `/autotag` — Online Only

## Sharing

- `/share` (POST), `/share/revoke` (POST) — Online Only
- `/share` (GET), `/share/detail` (GET), `/share/{token}/view` (GET HTML) — Conditionally Offline if previously fetched; revocations / new tokens require network.

## Analytics

- `/analytics` (GET) — Conditionally Offline (served from SW cache if previously fetched)
- `/analytics/log` (POST) — Online Only (write path)

## Additional Status / Diagnostics / Tech

- `/tech.json`, `/watch/status`, `/faces/clusters` (already covered), `/fast/status` — Online Only

## Summary

| Classification | Representative Routes (non-exhaustive) | Count (approx) |
|----------------|-----------------------------------------|----------------|
| Fully Offline  | App shell assets (HTML/CSS/JS), cached thumbnails once fetched | n/a |
| Conditionally Offline (GET cached) | library, collections, favorites, metadata, faces, videos, workspace, analytics, share (GET), thumbnails | ~39 |
| Online Only (POST/actions) | search variants, builders, mutations, model ops, batch ops, faces POST ops, share POST, analytics log, delete/export/edit | ~55 |
| Dynamic Status/Diag (Online) | health, ping, auth/status, diagnostics, status/{operation}, tech.json | 5 |

Total unique method+path pairs (baseline): 99

Note: Exact counts will be re-validated after each router extraction phase; if counts drop it is due to deduplication (e.g., removal of legacy aliases) not lost capability.

## Notes and Next Steps

- Client invalidates SW JSON cache when mutating endpoints are called (api.ts sends ps:invalidate-json-cache messages) — keeps offline views fresh.
- Possible enhancements:
  1. Persistent encrypted search result cache for last-known offline recall.
  2. Background Sync queue for favorites/tags/saved mutations.
  3. Per-route adaptive TTL (e.g., favorites 30s, metadata 10m, workspace 60m) instead of global 5m.
  4. ETag / If-None-Match integration for lighter conditional refresh.
  5. Pre-warm critical GET JSON on service worker install (collections, favorites, workspace) using a deferred warmup phase.

Change Log:

- 2025-09-29: Upgraded baseline from 47 conceptual endpoints to 99 concrete routes; reorganized grouping; added summary table; clarified refactor context.
