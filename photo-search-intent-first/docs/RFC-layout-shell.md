# RFC: LayoutShell & AppChrome Refactor

**Status:** Draft  
**Author:** AI assistant  
**Date:** 2025-10-04

## 1. Problem Statement

The existing `AppChrome` (≈1,100 lines) blends layout, orchestration, diagnostics, and onboarding logic, making the UI difficult to evolve. The goal is to introduce a composable `LayoutShell` that separates navigation, content, and utilities while preserving offline-first behaviour.

## 2. Goals / Non-Goals

- **Goals**
  - Decompose `AppChrome` into sidebar/navigation, content viewport, and utility dock layers.
  - Provide a home for ActivityTray/diagnostics without cluttering core views.
  - Maintain current feature parity (onboarding, jobs, contextual help) during migration.
  - Keep offline-first behaviours intact and surface new telemetry.
- **Non-Goals**
  - Rewriting business logic in contexts/stores.
  - Introducing new navigation paradigms beyond the planned tri-pane layout.
  - Finalizing visual polish (Phase 2 handles detailed styling).

## 3. Proposed Architecture

See `APPCHROME_REFACTOR_ANALYSIS.md#4` for the diagram. Key components:

- `LayoutShell` wraps adaptive providers and slots child regions.
- `NavigationRail` handles main routes, active state, and collapse behaviour.
- `ContentViewport` hosts route content (existing `RoutesHost`).
- `UtilityDock` presents ActivityTray, contextual drawers (diagnostics, hints), and notifications.
- Modal, onboarding, and notification layers remain, but are hoisted out of core layout.

## 4. State Ownership

- `LayoutShell` receives read-only state from contexts (`DataContext`, `JobsContext`, etc.) and dispatches via explicit props.
- ActivityTray subscribes to new diagnostics feed (`OfflineService.onDiagnostics`) plus existing job metrics.
- Navigation state (current view, highlight counts) migrates from `AppChrome` to a dedicated hook (Phase 1 deliverable).

## 5. Routing & Navigation

- Continue using React Router; `LayoutShell` wraps `<RoutesHost />`.
- Lazy boundaries remain per-route; ensure navigation rail uses route metadata instead of duplicated enums.
- Update deep-link handling (e.g., `/share`, `/mobile-test`) to toggle visibility within the new layout.

## 6. Activity & Diagnostics

- Phase 0 telemetry (connectivity, queue snapshots, sync cycles) powers ActivityTray.
- Diagnostics drawer consumes `offlineService.getDiagnostics()` and renders event timeline.
- Surface connection health using new `queue-snapshot` metrics (ready vs deferred actions).

## 7. Testing Strategy

- Component unit tests for `NavigationRail`, `UtilityDock`, `ActivityTray` interactions.
- Playwright smoke covering desktop + mobile breakpoints (baseline screenshots defined in Phase 0 plan).
- Existing offline tests updated to target ActivityTray instead of deprecated status bar.

## 8. Migration Plan

1. Introduce `LayoutShell` alongside existing chrome under feature flag / environment toggle.
2. Gradually route traffic through new shell per view (library → search → collections).
3. Remove legacy status bar & overlays once ActivityTray/diagnostics stable.
4. Clean-up + delete defunct components (`StatusBar`, `StatsBar`, etc.).
5. Keep rollback path by preserving original `AppChrome` until Phase 1 complete.

---

Next steps: pair with design on utility dock visuals, implement shell scaffolding, and schedule merge milestones.
