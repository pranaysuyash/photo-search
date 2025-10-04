# Webapp Status and V3 Direction (October 2025)

This document captures the current state of the production webapp, identifies gaps that remain for a production-ready offline-first experience, and records the complementary redesign direction underway in `webapp-v3/`. It consolidates recent audit findings so we can align engineering, design, and product priorities across both implementations.

## 1. Legacy Webapp (intent-first)

### 1.1 Offline Foundations
- **Shipped**
  - Bundled model workflow enabled across CLI, API, and Electron (`OFFLINE_MODE=1` flag, documented in `OFFLINE_MODE_IMPLEMENTATION.md`).
  - Offline UI indicators removed to match the “always offline-first” philosophy; Playwright suite updated to assert the badge stays absent.
  - Extensive documentation describing offline smoke, caching, and regression expectations (`webapp/tests/OFFLINE_TEST_DOCUMENTATION.md`).
  - Browser demo library seeds from an embedded manifest so the React app boots without the Python API.
- **Still Missing**
  - `OfflineService` requires retry/backoff tuning and visibility hooks (goal: exponential backoff with diagnostics surfacing).
  - Diagnostics drawer lacks offline telemetry (connection history, last `/api/health`, bundled model status).
  - CI automation: no packaged-offline Electron boot smoke, no CLI-driven `OFFLINE_MODE=1` regression, and `offline-pwa.test.ts` still depends on live responses.
  - Electron-specific docs (`ELECTRON_INTEGRATION_TEST_PLAN.md`) are pending the above instrumentation.

### 1.2 UI / UX Audit
- **Pain Points**
  - `AppChrome` stacks many layers (welcome, contextual help, jobs center, overlays) inside a single flex column, creating cognitive overload and cramped spacing.
  - Status surfaces remain utilitarian: CPU/memory text blocks, dense badges, and Tailwind overrides that fight the new token palette.
  - Collections and library pickers expose every action at once; controls mix legacy styles with new shadcn components.
  - Mobile bottom navigation duplicates secondary actions, consuming vertical space.
- **Opportunities**
  - Adopt shadcn primitives broadly (`webapp/src/components/ui`) to unify typography, spacing, and focus states.
  - Reorganize the shell into a tri-pane layout (sidebar + content + utility rail) inspired by `webapp-v3` instead of the all-in-one chrome.
  - Replace the status bar with contextual cards or drawers that can scale to tablets/Electron while keeping telemetry accessible.
  - Introduce progressive disclosure in collections/search so bulk tools live behind menus instead of inline buttons.

## 2. `webapp-v3/` Prototype

### 2.1 What Exists Today
- High-level shell with a glassmorphic sidebar, top bar, and responsive content area (`src/components/Sidebar.tsx`, `TopBar.tsx`).
- Photo grid built on shadcn cards, including skeleton loaders, empty states, and hover actions (`src/components/PhotoLibrary.tsx`).
- Store + API client stubs to load demo data or real search results (`src/store/photoStore.ts`, `src/services/api.ts`).
- Modern token usage through Tailwind + shadcn configuration (`tailwind.config.js`, `components/ui/*`).

### 2.2 Gaps to Production
- Routing only covers library/search; there is no parity for collections, people, jobs, onboarding, settings, or diagnostics.
- Offline capabilities are not wired—no `OfflineService`, caching, or service worker integration.
- Feature hooks (favorites, bulk actions, filters, smart albums) are purely visual; they do not connect to real stores or backend APIs yet.
- Accessibility and internationalization work (focus management, skip links, translations) are still inherited from the legacy app and must be reintroduced intentionally.
- Testing/QA infrastructure (Vitest, Playwright) is absent for v3.

### 2.3 Design Direction Highlights
- Collapsible navigation with badge counts and gradients gives a “pro photo hub” feel that should guide the legacy app refresh.
- Top bar quick actions (“Smart Search”, “Surprise Me”), view toggles, and dropdowns are good scaffolding for power-user flows.
- Empty states communicate value with iconography and succinct copy; porting these patterns will ease onboarding.
- The blurred/glassy aesthetic and consistent spacing should be the reference for all future shell work across platforms.

## 3. Consolidated Next Steps
1. **Close Phase‑1 Offline Gaps**: implement `OfflineService` retries, diagnostics surfacing, and CI smoke coverage before iterating on UI polish.
2. **Establish a Unified Design System**: promote shadcn primitives and v3 visual tokens into the legacy app to remove bespoke Tailwind mixes.
3. **Map Feature Parity to v3**: enumerate each legacy screen/component and plan its v3 counterpart, including state management, offline hooks, and tests.
4. **Design Sprint**: run a focused sprint aligning design + engineering on the tri-pane layout, status surfaces, and activity tray (reuse v3 as the baseline).

## 4. Phase 0 Tracker (AppChrome Foundations)

| Deliverable | Status | Owner | Notes |
| --- | --- | --- | --- |
| OfflineService backoff + status spec | Done | AI assistant + engineering follow-up | Exponential backoff landed Oct 2025; next step is exposing status telemetry. |
| Diagnostics telemetry schema & ActivityTray UX | Plan drafted | AI assistant + design | See `APPCHROME_PHASE0_IMPLEMENTATION_PLAN.md#1`; implementation tickets pending. |
| Offline CI smoke plan (CLI + Playwright) | Plan drafted | AI assistant | Steps in `APPCHROME_PHASE0_IMPLEMENTATION_PLAN.md#2`; wire into CI. |
| Component migration inventory | Done | AI assistant | Targets documented in `APPCHROME_REFACTOR_ANALYSIS.md`. |
| Baseline journey capture plan | Plan drafted | AI assistant | Approach in `APPCHROME_PHASE0_IMPLEMENTATION_PLAN.md#3`. |
| Design/dev workshop scheduling | In progress | AI assistant | Calendar invite requested; waiting on PM confirmation. |
| RFC outline for LayoutShell extraction | Outline ready | AI assistant | Structure in `APPCHROME_PHASE0_IMPLEMENTATION_PLAN.md#4`; full RFC next. |

Keeping this document updated whenever we land offline fixes or migrate screens into `webapp-v3/` will ensure the team stays aligned on progress toward the modern, offline-first experience.
