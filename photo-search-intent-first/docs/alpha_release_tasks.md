# Alpha Release Task Board

_Updated: 2025-10-05_

This board captures the minimum work required before we can label the Photo Search "intent-first" build as an alpha-ready product. Each task is scoped to a single feature area so we can implement, test, and document sequentially. Keep the list in sync with `TODO_PLAN.md` once items move beyond the alpha milestone.

## Legend

- [ ] TODO — not started
- [~] In progress
- [x] Done

## 1. Frontend Stabilization

- [ ] Break down `webapp/src/App.tsx` into dedicated feature routers (Library, Search, People, Collections, Trips) with isolated Zustand slices.
- [ ] Refactor `webapp/src/components/AdvancedFilterPanel.tsx` into modular filter groups and cover with Vitest interaction tests.
- [ ] Introduce lazy route-based chunking to shrink the main bundle below 300 kB gzip and document the bundle report.

## 2. Backend Hardening

- [ ] Extract search orchestration from `api/original_server.py` into `usecases/search/` with unit tests for `api_search` and `api_search_paginated`.
- [ ] Add typed DTO layer between FastAPI routers and domain services; enforce Ruff clean slate on touched modules.
- [ ] Create integration tests covering collections, smart collections, trips, and faces endpoints.

## 3. Feature Parity Verification

- [ ] Implement Collections / Smart Collections / Trips UI flows in `webapp/src/views` to match existing API coverage.
- [ ] Reconcile documentation between `BACKEND_FRONTEND_INTEGRATION_STATUS.md` and `MISSING_FEATURES_ANALYSIS.md`; update once parity is proven.
- [ ] Deliver UX for face detection: trigger build + cluster naming with smoke tests.

## 4. Electron & Offline

- [ ] Harden `electron/main.ts` CSP and IPC allowlist, and validate via Playwright electron smoke test.
- [ ] Automate bundled model verification and expose status in Diagnostics drawer.
- [ ] Document offline troubleshooting paths in `docs/OFFLINE_MODE_IMPLEMENTATION.md` (append alpha notes).

## 5. Testing & CI

- [x] Convert `tests/smoke_dummy.py` into a real pytest test (importable by Pytest discovery).
- [ ] Wire Vitest + Playwright smokes into CI (documented in `TESTING_STRATEGY.md`).
- [ ] Ensure lint (Ruff, ESLint/Biome) runs cleanly in CI and record the commands in CONTRIBUTING docs.

## 6. Documentation & Release Process

- [ ] Draft alpha release checklist covering manual verification, rollback, telemetry opt-ins, and support expectations.
- [ ] Update README and `docs/` to reflect current setup (venv activation, npm scripts, Offline mode toggle).
- [ ] Capture alpha/beta acceptance criteria in `docs/release_playbook.md`.

---

_Active Task:_ Pending selection (next highest priority from this list).
