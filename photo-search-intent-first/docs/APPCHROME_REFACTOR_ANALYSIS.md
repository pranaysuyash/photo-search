# AppChrome Refactor Analysis (October 2025)

This research note catalogs the current behaviour of `webapp/src/components/AppChrome.tsx`, explains how it diverges from the modern direction established in `webapp-v3/`, and outlines a phased refactor plan to deliver a polished, platform-ready shell that surpasses the prototype.

## 1. Snapshot of the Existing Chrome

- **Size & Scope**: `AppChrome.tsx` is 1,168 lines long and imports 40+ modules. It orchestrates routing, onboarding, diagnostics, jobs, hints, overlays, and mobile behaviours inside one component.
- **Wrapper Stack**: Runtime tree nests `AdaptiveResponsiveProvider → ContextualModalProvider → HintManager → MobileOptimizations → AppShell` with multiple conditionally rendered overlays (welcome, onboarding, jobs, diagnostics, share viewer, mobile tests, etc.).
- **State Surface**:
  - Pulls data/actions from `ActionsContext`, `DataContext`, `JobsContext`, `LayoutContext`, `OnboardingContext`, `ViewStateContext`, plus several Zustand stores (`settingsStore`, `useOfflineFirst`, etc.).
  - Local state manages accessibility panel visibility, modern sidebar toggles, onboarding steps, help context, pull-to-refresh, and dozens of `useEffect` listeners for hints, onboarding progress, and offline status.
- **Cross-Cutting Hooks**:
  - Attaches window globals for Playwright (`__TEST_COMPLETE_ONBOARDING__`), broadcast events like `search-first-interaction`, listens to keyboard shortcuts, and controls `BottomNavigation` + `JobsFab` simultaneously.
  - Manages localStorage writes, API calls (`apiSearchLike`, `apiCancelJob`, `apiAuthCheck`, `apiOpen`), and UI busy states in-place.
- **Pain Points**:
  - **Coupling**: Layout logic, feature orchestration, and state transitions live together, making the UI brittle and hard to restyle.
  - **Density**: The chrome renders multiple toolbars and badges simultaneously (StatusBar, StatsBar, Jobs overlays), overwhelming the viewport.
  - **Inconsistent Styling**: Legacy Tailwind utility classes intermingle with the newer shadcn tokens, yielding uneven spacing/typography.
  - **Testing Complexity**: Every UI tweak risks regression because AppChrome is the entry point for onboarding, modals, job centre, diagnostics, etc.

## 2. Contrast with `webapp-v3/`

| Aspect | Intent-First Chrome | `webapp-v3` Prototype |
| --- | --- | --- |
| Layout | Single flex column with optional overlays | Dedicated sidebar, top bar, and content canvas |
| Components | Mix of bespoke and shadcn | 100% shadcn-based primitives |
| Interaction | All controls visible simultaneously | Progressive disclosure via hover, dropdown, empty states |
| Visual Language | Utility-first, minimal gradients | Glassmorphism, gradients, consistent spacing |
| Offline Surfacing | Removed indicator but retains utilitarian status bar | No offline wiring yet, leaving room for polished diagnostics |

The prototype delivers a calmer, premium aesthetic by constraining surface area per view and relying on composable primitives. The production chrome can match—and surpass—this by decomposing responsibilities and reclaiming whitespace for high-impact insights.

## 3. Refactor Goals

1. **Structural Simplification**: Decompose shell responsibilities into smaller, testable components (navigation rail, command bar, activity tray, contextual drawers).
2. **Design System Cohesion**: Adopt shared shadcn primitives and tokenized spacing/typography across all chrome elements.
3. **Progressive Disclosure**: Keep primary flows prominent while moving bulk tools, diagnostics, and onboarding aids into drawers or command surfaces.
4. **Offline-First Transparency**: Replace the legacy status bar with a modern activity tray that surfaces offline state, sync progress, and background jobs without clutter.
5. **Platform Consistency**: Ensure the same chrome scales to desktop Electron, tablets, and mobile (collapsed nav states, responsive command palette).

## 4. Proposed Architecture

```
AdaptiveResponsiveProvider
├── LayoutShell
│   ├── NavigationRail (collapsible, gradient glass, counts)
│   ├── ContentViewport (RoutesHost + Suspense + Empty states)
│   └── UtilityDock
│       ├── ActivityTray (jobs, offline sync, diagnostics)
│       ├── ContextualHelpDrawer
│       └── CommandPalette trigger
├── ModalLayer (ContextualModalProvider + ModalSystemWrapper)
├── OnboardingLayer (Welcome, Checklist, Tours)
└── NotificationLayer (toasts, hints)
```

Each layer maps to a focused component, letting us ship incremental improvements and target tests more easily.

## 5. Phase Plan

### Phase 0 – Foundations (pre-refactor)
- Finish Phase‑1 offline engineering tasks (retry/backoff, diagnostics logging, CI offline smoke) to avoid rework mid-refactor.
- Promote design tokens/primitives (buttons, inputs, cards, dialogs) into a shared library; audit `StatusBar`, `StatsBar`, `LibrarySwitcher`, `Collections`, `SearchBar` for migration candidates.
- Capture baseline screenshots and user journeys (search, collections, onboarding) to track regression.

#### Phase 0 Execution Status (Owner: AI assistant)

| Task | Status | Notes |
| --- | --- | --- |
| Document current gaps and success criteria | ✅ Done | Captured in `WEBAPP_STATUS_AND_V3_DIRECTION.md` and this analysis. |
| Inventory components needing shadcn migration | ✅ Done | `StatusBar`, `StatsBar`, `LibrarySwitcher`, `Collections`, `BottomNavigation`, `SearchBar` called out for Phase 1. |
| OfflineService retry/backoff design | ✅ Done | Exponential backoff + retry scheduling implemented Oct 2025 (follow-up: expose status hooks/telemetry). |
| Diagnostics surfacing plan (connection history, model status) | ⚠️ TODO | Need doc + UX wire (tie into future ActivityTray). Track as TODO in `TODO_PLAN.md`. |
| Offline CI smoke coverage plan | ⚠️ TODO | Define CLI + Playwright jobs; add action items to backlog. |
| Baseline screenshots/journey capture | ⚠️ TODO | Require Playwright visual harness or manual captures once shell stabilizes; add to checklist. |
| Design/dev workshop scheduling | ✅ Done | Added to Immediate Next Steps; calendar invite pending PM confirmation. |
| RFC outline for shell extraction | ⚠️ TODO | Outline to be drafted after offline tasks have owners. |

### Phase 1 – Shell Extraction
- Introduce `LayoutShell`, `NavigationRail`, and `UtilityDock` components driven by existing contexts but rendering side-by-side rather than stacked.
- Move status/diagnostics/job indicators into the dock; replace `StatusBar` with new tray panels.
- Keep existing feature components (SearchBar, Collections, JobsCenter) embedded but visually restyled with shadcn tokens.
- Add Storybook stories + visual tests for the new shell.

### Phase 2 – Feature Surface Modernization
- Port the v3 TopBar patterns (quick actions, view toggles, filter/sort dropdowns) into the new shell.
- Redesign Collections, LibrarySwitcher, and empty states using card-based layouts and progressive disclosure.
- Rework mobile navigation into a command sheet + floating action button; ensure Playwright mobile suite covers the new interactions.

### Phase 3 – Beyond v3 Enhancements
- Embed contextual analytics tiles (index coverage, smart suggestions) in the UtilityDock.
- Ship a command palette and workspace switcher for power users.
- Add adaptive theming (user-selected accent colors) and micro-interactions backed by motion tokens.
- Expand accessibility/internationalization coverage (skip links, focus outlines, locale-aware copy).

## 6. Risk & Mitigation
- **State Coupling**: Untangling `useEffect` chains could regress onboarding/jobs. Mitigate by introducing integration tests per subsystem before moving logic.
- **Offline Regression**: Relayout may hide vital offline feedback. Ensure the new activity tray surfaces queue length, sync status, and failure toasts with explicit Playwright coverage.
- **Parallel Prototypes**: Keep `webapp-v3` as a design lab but migrate shared primitives into `webapp/` to avoid divergence.

## 7. Immediate Next Steps
1. Log remaining offline hardening items in `TODO_PLAN.md` with owners/dates; execute before shell extraction.
2. Produce component audits for Navigation, TopBar, Activity surfaces highlighting state dependencies (one-pagers per component).
3. Schedule a design/dev workshop to lock visual spec (color roles, spacings, motion) ahead of Phase 1 implementation.
4. Draft a technical RFC describing routing/Context changes expected during shell extraction for team review.

Document updates should follow each phase, keeping this note current with architectural decisions and test coverage additions.
