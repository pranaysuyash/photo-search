# PhotoVault Implementation & Parity Summary (Refactored Baseline)

## 🎯 Project Status: PARITY MAINTENANCE IN PROGRESS

**Revised**: September 29, 2025  
**Baseline**: 99 unique (method, path) routes in monolith (`api/original_server.py`)  
**Refactor Goal**: Preserve 100% functional parity while extracting modular routers and reducing complexity.

Historical note: Earlier milestone documentation (Sept 7) referred to "47 endpoints" (conceptual groups). Since then the surface expanded (or was fully enumerated) to 99 concrete FastAPI route definitions including: indexing controls, search variants, analytics logging, faces operations, video indexing, metadata batch & build actions, workspace management, sharing endpoints, diagnostics/status, and model management. This summary supersedes that earlier snapshot.

## 🗂️ Historical Baseline Snapshot (Immutable Reference)

Purpose: Preserve the prior milestone context ("47 endpoints" conceptual grouping) as a fixed comparison point after the refactor regression / parity recovery work. This section is ARCHIVAL; it must not be edited to reflect future changes. For current state see the parity sections below.

Key figures at that snapshot (conceptual, not raw method+path count):

| Metric | Value (Legacy Snapshot) | Notes |
|--------|-------------------------|-------|
| Conceptual endpoint groups | 47 | Grouped (some umbrella endpoints hiding multiple HTTP routes) |
| Frontend service async methods | 48 | `PhotoVaultAPI.ts` methods (some multi-route) |
| Feature/UI modules (primary) | 3 + 1 composite | Collections, Faces, Image Editing + Comprehensive UI shell |
| Added LOC (cumulative) | ~4,000 | Approx diff vs initial skeleton |

Architecture tree (legacy snapshot):

```text
photo-search-intent-first/
├── api/
│   └── server.py              # FastAPI backend with 47 conceptual endpoint groups
├── webapp/src/
│   ├── ModularApp.tsx         # Main modular application
│   ├── services/
│   │   └── PhotoVaultAPI.ts   # Comprehensive API service layer
│   ├── modules/
│   │   ├── CollectionsManager.tsx  # Collections CRUD UI
│   │   ├── FaceDetection.tsx       # Face clustering & recognition
│   │   └── ImageEditor.tsx         # Image editing tools
│   └── components/
│       └── ComprehensiveUI.tsx     # All features integrated UI
```

Archived conceptual grouping & UI component notes (verbatim, retained for diffing future deprecations):

```text
Search & AI (7) – /search, /search_workspace, /search_like, /search_like_plus, /index, /fast/build, /captions/build
Collections & Org (9) – /collections (GET+POST), /collections/delete, /smart_collections (GET+POST+delete+resolve), /trips/build, /trips
Faces (3) – /faces/build, /faces/clusters, /faces/name
OCR (2) – /ocr/build, /ocr/snippets
Metadata & Tags (6) – /metadata, /metadata/detail, /metadata/build, /tags (GET+POST), /map
Favorites & Saved (5) – /favorites (GET+POST), /saved (GET+POST), /saved/delete
Image Ops (4) – /edit/ops, /edit/upscale, /export, /open
File Management (6) – /library, /workspace, /workspace/add, /workspace/remove, /delete, /undo_delete
Similarity (2) – /lookalikes, /lookalikes/resolve
System & Feedback (3) – /diagnostics, /feedback, /todo
Utilities (1) – /autotag

Core Service Layer (legacy claims): PhotoVaultAPI.ts (11,208 bytes) – singleton, wraps 47 conceptual endpoints, typed, config-driven.
Feature Modules: CollectionsManager.tsx, FaceDetection.tsx, ImageEditor.tsx
Composite Apps: ModularApp.tsx (navigation, builders), ComprehensiveUI.tsx (all integrated)
```

Rationale for earlier removal: Live duplication of large enumerations caused drift risk and markdown lint churn. Reinstated here as frozen context to satisfy auditability after refactor regression recovery. Future diffs should treat this as read-only provenance data.

### API Coverage & Parity

- **Backend Routes (method+path)**: 99 (decorator scan 2025-09-29)
- **Conceptual Endpoint Groups** (legacy counting style): ~47 (explains earlier figure)
- **Frontend Service Methods**: 48 (some methods map to multiple backend routes, and some backend maintenance routes are intentionally not exposed in UI)
- **Feature Modules**: Core search/indexing + collections + faces + metadata + workspace + media ops
- **Lines of Code Added (since initial modularization effort)**: ~4,000+

Planned tracking:

- A parity checklist will accompany each router extraction PR (health, sharing, analytics, indexing, search) ensuring identical inputs/outputs & error codes.
- Complexity reduction (very large functions) deferred until after stable modular parity is confirmed.

```text
│   └── server.py / original_server.py   # FastAPI monolith (parity baseline, 99 routes)
```

The application now maintains a broader 99-route surface with a clear parity strategy rather than a fixed "complete" milestone. Future updates will emphasize measurable parity guarantees (schema snapshots, latency SLOs, offline coverage) over static endpoint counts.

[Legacy section removed: superseded earlier "Complete Implementation Summary" that referenced 47 conceptual endpoints. All legacy per-endpoint enumeration removed to reduce noise and fix markdown lint warnings.]

## ✅ Route Surface Overview (99 Routes)

Below sections still list conceptual groups (legacy style). Where lists omit newer maintenance/status/model routes they are documented in Parity Addendum further below.

### Conceptual Grouping Snapshot (Legacy Style)

Groups (Search, Collections, Faces, OCR, Metadata/Tags, Favorites/Saved, Image Ops, Workspace, Similarity, System/Status, Utilities) retained conceptually; detailed per-route lists removed to avoid duplication with generated OpenAPI docs.

## 🚦 Current Status

### ✅ Completed / Stable

- Functional parity restoration for helper schemas (e.g., media scan counts)
- Duplicate route removal and consolidation (earlier duplicate fast index & share definitions addressed)
- Share endpoints prepared for modular extraction
- Search caching layer (TTL + hash key) implemented

### 🔄 In Progress

- Router extraction (shares, health, analytics first wave)
- Parity test harness for route-by-route JSON schema & status codes
- Documentation alignment (this document + offline coverage updated for 99-route baseline)

### ⏳ Deferred (Post-Parity)

- Function complexity reduction (very high CCN routines in monolith)
- Offline enhancement (persistent search result cache, background sync queue)
- Security hardening (MD5 legacy usage migration)

### 🟢 Running Services

- Backend API (monolith or refactored staging): Port 5001
- Frontend Dev: Port 5173
- Electron App: Active (connects to same backend)

## 📌 Parity Addendum (2025-09-29)

Additional routes present in the 99-route baseline not enumerated in legacy conceptual lists above (examples):

- Index control: `/index/status`, `/index/pause`, `/index/resume`
- Model management: `/models/capabilities`, `/models/download`, `/models/validate`
- Analytics logging: `/analytics/log`
- Fast index status: `/fast/status`
- Workspace mutation: `/workspace/add`, `/workspace/remove`
- Media building & maintenance: `/thumbs`, `/thumb/batch`, `/videos/index`, `/metadata/build`
- Data maintenance: `/data/nuke`
- Sharing HTML view: `/share/{token}/view`

Removed / Not Present vs earlier conceptual draft:

- `/lookalikes`, `/lookalikes/resolve` (folded into similarity/search flows)
- `/feedback`, `/todo` (not implemented)
- `/metadata/detail` (superseded by batch & aggregate endpoints)

This document will transition to auto-generated sections once routers are extracted and OpenAPI diff tooling is integrated into CI.

---
The application now maintains a broader 99-route surface with a clear parity strategy rather than a fixed "complete" milestone. Future updates will emphasize measurable parity guarantees (schema snapshots, latency SLOs, offline coverage) over static endpoint counts.

## 🖥️ Frontend & Service Layer (Current Snapshot)

| Layer | Approx Count | Notes |
|-------|--------------|-------|
| Backend routes | 99 | Source-of-truth monolith (`api/original_server.py`) |
| Service methods | 48 | Some map to multiple backend routes; maintenance/admin routes intentionally unmapped |
| React feature modules | 8 | Collections, Faces, Editing, Search, Workspace, Metadata, Trips, System Diagnostics |

Service layer (e.g. `PhotoVaultAPI.ts`) will be regenerated once routers are extracted and OpenAPI schema stabilization + diff tooling are in place. Legacy references to “47 endpoints” have been removed to prevent drift and confusion.

## 🔧 Technical Implementation (Concise)

### Backend

FastAPI monolith pending router extraction (health, shares, analytics first). Embedding/provider abstraction intact. Helper regressions repaired (media scan counts, default photo dir candidates).

### Frontend

React + TypeScript with modular feature folders. Gradual migration toward lighter service wrapper that is schema-derived rather than hand-maintained.

### Caching & Performance

Search caching (TTL + SHA-256 key) live. ANN / index build endpoints unchanged during parity phase. Performance tuning deferred until after automated parity harness lands.

## 🧪 Testing & Quality Status

- Smoke tests: Passing (dummy embedder path unchanged)
- Manual parity spot checks: Key media + indexing + search routes verified after helper restoration
- Pending: Automated parity harness (route presence + status code + JSON schema snapshot)
- Pending: Favorites-only cached search instrumentation (cache correctness edge case)

## 📈 Roadmap (Near-Term)

1. Extract first router trio (health, shares, analytics) with parity checklist
2. Implement parity harness (generate baseline OpenAPI + per-route schema hash)
3. Add instrumentation for favorites-only cache path
4. Introduce markdown lint & doctest CI gate (enforce formatting & baseline freshness)
5. Begin controlled complexity reduction (split oversized functions) once harness green

## ♻️ Removed Legacy Content

All legacy enumerations anchored to the outdated “47 endpoints” conceptual snapshot have been excised. This file now serves as a living parity + roadmap overview. Historical granular UI component byte-size listings were removed (noise, quickly stale). For historical archaeology, refer to repository history (git log) rather than this evolving summary.

---

End of current parity-focused summary (2025-09-29).

## 🛠️ API Review Remediation Plan (Actionable Tasks)

Derived from the outstanding gaps you cited (exception policy done; remaining items below). Each item defines intent, approach, acceptance criteria, and sequencing.

### 1. Response Model Standardization

Goal: All non-stream JSON responses use explicit Pydantic models (SuccessResponse / ErrorResponse + domain payload wrapper).

Actions:

1. Inventory endpoints still returning raw dict (scripted grep for `return {` patterns outside schemas usage).
2. Add /api/schemas/response_fragments.py with composable data models (e.g., CollectionList, FaceClusters, SearchResultsEnvelope).
3. Update endpoints incrementally (1 PR per feature domain) adding `response_model` declarations.

Acceptance: 0 endpoints (excluding legacy compatibility aliases) returning bare dict; OpenAPI schema shows typed models; CI check enforces via script.

### 2. API Versioning Completion (/api/v1)

Goal: Real endpoints available under /api/v1/*; unversioned routes marked deprecated but retained until client migration completes.

Actions:

1. Introduce `api/routers/v1/` with submodules (search, index, collections, faces,...).
2. Mount at `/api/v1` while continuing to mount legacy root.
3. Add `Deprecation` header & warning JSON field on legacy root routes once parity verified.

Acceptance: 80%+ traffic (instrumented) hits versioned paths; documentation primary examples use /api/v1; deprecation banner logged for legacy usage.

### 3. Request Validation Consistency

Goal: Eliminate `_from_body` ad hoc parsing in favor of Pydantic request bodies & query params.

Actions:

1. Create `request_models.py` containing SearchRequest, IndexRequest, FaceBuildRequest, etc.
2. Replace manual extraction; rely on FastAPI validation.
3. Add test asserting 400 on invalid payload for at least one field per model.

Acceptance: `_from_body` no longer imported in production code; lint rule (grep) passes; tests cover invalid input paths.

### 4. Authentication Centralization

Goal: Single dependency controlling auth (or explicit anonymous allowance) instead of scattered checks.

Actions:

1. Define `auth.py` with `get_current_user_or_guest()` and `require_token()`.
2. Apply via router-level dependencies; remove per-route inline token logic.
3. Middleware only handles header extraction + context injection.

Acceptance: No `if token:` style auth branches inside endpoint bodies; all guarded by dependencies; unauthorized tests return consistent 401 JSON shape.

### 5. Search Endpoint Decomposition

Goal: Reduce 300+ line `/search` to orchestrator calling pure helpers.

Actions:

1. Extract phases: parse_query, build_embedding, filter_candidates, rank_results, enrich_metadata, serialize.
2. Each helper pure & unit-testable (deterministic given seeded random if needed).
3. Add micro-bench harness capturing per-phase timing.

Acceptance: Orchestrator <120 LOC; unit tests for each phase; timing log shows phase breakdown; no behavior change (parity harness passes).

### 6. Documentation & OpenAPI Hygiene

Goal: Consistent docstrings and rendered schema stability.

Actions:

1. Enforce docstring presence via custom lint (fail if endpoint missing summary).
2. Generate schema hash snapshot committed under `docs/snapshots/openapi_<date>.json`.
3. PR check diff: if hash changes and not annotated with `#schema-change` label, fail.

Acceptance: All endpoints have non-empty summary; snapshot updated only with intentional change.

### 7. Parity Harness (Foundational)

Goal: Machine-verifiable parity between monolith baseline & extracted routers.

Actions:

1. Script enumerates (method,path) + status codes + JSON schema shapes for representative success/error.
2. Store baseline snapshot; compare nightly & in CI.
3. Allow approved exceptions via whitelist file.

Acceptance: Green harness before large refactors; diff report human-readable.

### 8. Sequencing & Risk Notes

Order: (7 Parity Harness) → (1 Response Models) → (3 Request Models) → (2 Versioned Routes) → (4 Auth Centralization) → (5 Search Decomposition) → (6 Documentation Hardening final polish).

Rationale: Harden verification before structural change; introduce models early to stabilize versioned layer.

---

Tracking: Each item gets its own PR label (e.g., `remediate:response-models`) and checklist in description. This plan supersedes ad hoc cleanup attempts.
