# Technical Debt Boundaries & Refactor Phases

This document tracks the progressive decomposition of monolithic modules into cohesive, testable units.

## Motivation

`api/server.py` and `webapp/src/App.tsx` accumulated mixed responsibilities (routing, business logic, wiring, utilities). High cyclomatic complexity impedes onboarding, increases regression risk, and hides extension seams.

## Phase Overview

### Phase 0 – Discovery (Complete / Ongoing)

- Inventory of endpoint groups and implicit globals.
- Baseline test runs (Python + web) to ensure behavioral snapshot.

### Phase 1 – Server Decomposition (In Progress)

| Slice                                | Status   | Notes                                  |
| ------------------------------------ | -------- | -------------------------------------- |
| Health & Monitoring                  | DONE     | Extracted to `api/routes/health.py`    |
| Share Endpoints                      | DONE     | Extracted to `api/routes/shares.py`    |
| Search (core + cached + paginated)   | TODO     | Planned: `api/routes/search.py`        |
| Attention / Adaptive surfacing       | EXISTING | Already modular (`api/attention.py`)   |
| Indexing & Config                    | EXISTING | Already separate routers               |
| Media (thumbs, ocr, captions, faces) | TODO     | Consolidate into `api/routes/media.py` |
| Collections/Tags/Favorites           | TODO     | Consider `api/routes/library.py`       |
| Auth helpers                         | TODO     | Slim + dependency injection            |

Support refactors:

- Introduce `api/bootstrap.py` for app factory pattern (`create_app()` returning FastAPI).
- Utility extraction for EXIF/meta filtering & expression parsing.

### Phase 2 – Frontend App Shell

Planned creation of `webapp/src/app-shell/` with:

- `RootProviders.tsx`
- `AppRouter.tsx` (React Router integration)
- `lifecycle/` effect hooks (telemetry, onboarding, accessibility)
- Decomposition of large stateful logic into feature coordinators.

### Phase 3 – Cleanup & Hardening

- Remove legacy inlined helpers from `server.py` and `App.tsx`.
- Add unit tests for newly extracted utilities (expression parser, meta filters).
- Update docs & architecture diagrams.

## Dependency Injection Plan

Introduce lightweight provider functions (e.g. `get_index_store(dir: str) -> IndexStore`) and use `Depends` in new route modules to decouple from module-level instantiation.

## Testing Strategy

- Maintain existing smoke & cached search tests after each extraction.
- Add focused tests for new utility modules (pure functions, no I/O) to accelerate feedback.

## Complexity Reduction Targets

| Component            | Current | Target                       |
| -------------------- | ------- | ---------------------------- |
| `api/server.py` LOC  | >3700   | <1200 (post full extraction) |
| Largest function CCN | 141     | <25 (after splitting)        |

## Risks & Mitigations

- Hidden side effects: mitigate via incremental extraction + regression tests.
- Import cycles: enforce one-way dependency (routes -> infra/usecases, never infra -> routes).
- Performance regressions: measure cold start after app factory introduction.

## Next Increment

- Extract search endpoints & shared filter logic.
- Add `api/bootstrap.py` with `create_app()` used by tests & CLI.

---

Document will evolve per refactor PRs.
