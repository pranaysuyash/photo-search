# AppChrome Phase 0 Implementation Plan

This document captures the concrete follow-up work needed before the shell refactor (Phase 1). It expands on the items listed in the Phase 0 tracker and provides actionable guidance for engineering, QA, and design.

---

## 1. Diagnostics Telemetry Schema

**Objective:** capture offline/network health data so the upcoming ActivityTray and diagnostics drawer can surface meaningful status.

### Event Streams
1. **connectivity_status_changed**
   - `status`: "online" | "offline"
   - `source`: "navigator" | "monitoring-endpoint" | "manual"
   - `latency_ms`: optional numeric, ping duration if available
   - `retry_count`: number of retries attempted before the state change
   - `timestamp`
2. **offline_queue_update**
   - `queue_length`
   - `ready_length`: actions eligible for sync (nextAttemptAt <= now)
   - `deferred_length`: actions waiting for backoff window
   - `next_retry_in_ms`
   - `last_action_type`: optional string
   - `timestamp`
3. **sync_cycle_summary**
   - `duration_ms`
   - `synced_count`
   - `failed_count`
   - `max_retries_exhausted`: number of actions dropped after MAX_RETRIES
   - `next_retry_in_ms`
   - `timestamp`

### Storage & Surfacing
- Persist the most recent N entries (default 50) in `IndexedDBStorage` (new store `diagnostics`).
- Event ingestion happens in `OfflineService` (Phase 0 follow-up), but visualization waits for ActivityTray (Phase 1).
- Add an optional in-memory subscriber hook (`offlineService.onDiagnostics`) so UI widgets can stream updates without polling.

---

## 2. CI Offline Smoke Strategy

**Objective:** ensure core offline behaviours don’t regress.

### Web (Playwright) Job
1. Pre-build the React app (`npm --prefix webapp run build`).
2. Serve static assets with a lightweight server (no API).
3. Playwright script:
   - Open `/` → select “Demo Library (Web)”.
   - Assert that the grid renders ≥ 6 demo thumbnails (data URI images).
   - Trigger a search (keyword) and confirm results reuse the manifest.
   - Verify no network calls hit `/api/` via page route interception.

### CLI / Python Job
1. Activate venv (`source .venv/bin/activate`).
2. Run `OFFLINE_MODE=1 python cli.py index --dir demo_photos --provider local`.
3. Run `OFFLINE_MODE=1 python cli.py search --dir demo_photos --query beach`.
4. Store logs + exit status in CI artifact.

### Electron Smoke (follow-up)
- Use existing Spectron/Playwright-lite plan: package electron app, run with `app://` assets, simulate offline env var, run minimal interaction test.

---

## 3. Baseline Capture Plan

**Goal:** capture reference screenshots before refactoring the chrome.

### Tooling
- Use Playwright screenshot API (headless Chromium) with deterministic viewport (1440×900, dark/light cuts).

### Scenarios
1. **Library landing (no directory)** – ensure welcome/onboarding layout recorded.
2. **Library with demo assets** – load demo library, capture results grid.
3. **Search results with filters open** – to preserve current filter panel layout.
4. **Collections view** – to measure future progressive disclosure improvements.
5. **Jobs/Diagnostics drawer open** – highlight current state before ActivityTray.

### Storage
- Commit baseline PNGs under `webapp/tests/visual/baseline/` (or publish to artifact storage) with metadata: viewport, theme, data source.

---

## 4. LayoutShell RFC Outline

**Purpose:** align engineering on architecture changes before implementation.

### Sections
1. **Problem Statement** – summarize limitations of current `AppChrome`.
2. **Goals / Non-Goals** – tie back to modernization targets.
3. **Proposed Architecture** – reference LayoutShell diagram; detail contexts passed to each region.
4. **State Ownership** – describe which contexts move out of `AppChrome` into dedicated providers.
5. **Routing & Navigation** – document any changes to React Router setup, lazy boundaries.
6. **Activity & Diagnostics** – how telemetry hooks feed the new ActivityTray (integration with Section 1).
7. **Testing Strategy** – unit/Playwright coverage for the shell.
8. **Migration Plan** – feature freeze, incremental steps, rollback considerations.

### Deliverable
- Draft as `docs/RFC-layout-shell.md` (Phase 1 blocker). Link to this plan.

---

Updating the Phase 0 tracker after each deliverable lands will keep the modernization effort on schedule.
