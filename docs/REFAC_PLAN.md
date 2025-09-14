# UI Library Migration Plan & Comparison

This section documents options and a migration plan for adopting a modern UI component library, with checklists and best practices for future reference.

## 1. Library Comparison

| Feature           | shadcn/ui                         | MUI (Material UI)          | Chakra UI             | Radix UI                |
| ----------------- | --------------------------------- | -------------------------- | --------------------- | ----------------------- |
| Styling           | Tailwind (headless, customizable) | CSS-in-JS, themeable       | CSS-in-JS, themeable  | Headless, unstyled      |
| Accessibility     | Good (Radix under the hood)       | Good                       | Excellent             | Excellent               |
| Component Breadth | Growing, focused                  | Very broad                 | Broad                 | Primitives only         |
| Customizability   | High (headless)                   | Medium-High                | High                  | High                    |
| Design System     | None (bring your own)             | Material Design            | Themeable             | None                    |
| Community/Support | New, fast-growing                 | Mature, large              | Mature, growing       | Dev-focused             |
| Best for          | Tailwind, custom design           | Out-of-the-box, enterprise | Accessible, themeable | Custom, a11y primitives |

## 2. Migration Plan Checklist

### A. Preparation

- [ ] Audit current UI: List all custom and legacy components.
- [ ] Choose a target library (shadcn/ui, MUI, Chakra UI, Radix UI).
- [ ] Review library docs and install dependencies.

### B. Setup

- [ ] Install the library and peer dependencies.
- [ ] Set up theming (if needed):
  - shadcn/ui: Tailwind config
  - MUI/Chakra: ThemeProvider
  - Radix: Use with your styling solution

### C. Incremental Migration

- [ ] Identify low-risk/common components to migrate first (e.g., buttons, inputs, modals).
- [ ] Replace or wrap legacy components with library equivalents.
- [ ] Refactor layouts to use new primitives (e.g., Flex, Grid, Stack).
- [ ] Update forms, dialogs, and overlays for accessibility and consistency.
- [ ] Test for visual and functional regressions after each step.

### D. Advanced Integration

- [ ] Migrate complex components (tables, menus, popovers) using new library.
- [ ] Refactor custom logic to use headless primitives if needed (Radix/shadcn).
- [ ] Ensure all interactive elements are accessible (keyboard, screen reader).

### E. Theming & Customization

- [ ] Apply your brand/theme to the new library.
- [ ] Standardize spacing, typography, and color tokens.
- [ ] Add dark mode/high-contrast support if needed.

### F. Documentation & QA

- [ ] Document new component usage patterns and best practices.
- [ ] Update Storybook (or similar) with new components.
- [ ] Add/expand component tests.
- [ ] Solicit feedback from users/developers.

### G. Cleanup

- [ ] Remove unused legacy components and styles.
- [ ] Update documentation and onboarding guides.

## 3. Example Migration Steps

### shadcn/ui

1. Install shadcn/ui and Tailwind CSS.
2. Configure Tailwind and import shadcn/ui components.
3. Replace legacy Button, Input, Modal, etc. with shadcn/ui equivalents.
4. Refactor layouts to use shadcn/ui’s headless primitives.
5. Test and document.

### MUI

1. Install @mui/material and @emotion/react.
2. Wrap app in `<ThemeProvider>`.
3. Replace legacy components with MUI’s Button, TextField, Dialog, etc.
4. Use MUI’s Grid/Flex for layout.
5. Customize theme as needed.

## 4. Documentation Example

- **Component Usage:**
  - Use `<Button />` from shadcn/ui for all actions.
  - Use `<Dialog />` for modals, with accessibility props.
- **Theming:**
  - All colors and spacing use Tailwind tokens.
- **Accessibility:**
  - All interactive elements must be keyboard accessible and have ARIA labels.

---

# Refactor Plan – App.tsx Modularization (Intent-First)

This document tracks the modularization of the monolithic `App.tsx` into focused modules, routes, hooks and contexts. The goal is to improve maintainability, testability, and developer velocity while preserving user value and deep-link behavior.

## Route Map

App uses `HashRouter` with the following routes:

- `/library` → `LibraryContainer` (`src/views/LibraryView.tsx`)
- `/search` → `ResultsView` (`src/views/ResultsView.tsx`)
- `/people` → `PeopleViewContainer` (`src/views/PeopleViewContainer.tsx`)
- `/collections` → `CollectionsViewContainer` (`src/views/CollectionsViewContainer.tsx`)
- `/saved` → `SavedViewContainer` (`src/views/SavedViewContainer.tsx`)
- `/` → redirect to `/library`

Utility: `viewToPath(view)` in `src/utils/router.ts` centralizes view→path mapping.

## Containers and Components

- App Shell: `src/components/AppShell.tsx` (sidebar, header, main slot)
- Results: `src/views/ResultsView.tsx`
- Library: `src/views/LibraryView.tsx`
- People: `src/views/PeopleViewContainer.tsx`
- Collections: `src/views/CollectionsViewContainer.tsx`
- Saved: `src/views/SavedViewContainer.tsx`
- Modal Centralization: `src/components/ModalManager.tsx`
- Busy/Toast Overlay: `src/components/OverlayLayer.tsx`

## Hooks & Contexts

- Global side-effects:

  - `src/hooks/useConnectivityAndAuth.ts` – connectivity ping + auth-required probe
  - `src/hooks/useGlobalShortcuts.ts` – global keyboard shortcuts
  - `src/hooks/useResultsShortcuts.ts` – results grid/timeline navigation shortcuts
  - `src/hooks/useOnboardingActions.ts` – tour-action event wiring

- View-local state:
  - `src/contexts/ResultsUIContext.tsx` – selection, focus, detail, layout rows for results
  - `src/contexts/ResultsConfigContext.tsx` – `resultView` (grid/timeline) and `timelineBucket`

## Migration Notes

- Routes are now the source of truth for view selection. All legacy `selectedView`→route sync effects have been removed. Navigation uses `navigate(viewToPath(view))`.
- Results config/state are provided via context to reduce prop drilling:
  - Use `useResultsUI()` for selection/focus/detail/layout
  - Use `useResultsConfig()` for `resultView`/`timelineBucket`
- Saved search runs navigate to `/search` and include `?q=…` in URL; App continues to parse search params for deep links.

## How to Add a New Container Route

1. Create a `src/views/MyFeatureContainer.tsx` that owns rendering and view-specific logic, using stores/contexts as needed.
2. Add a `<Route path="/my-feature" element={<MyFeatureContainer />} />` in `src/App.tsx` under the providers.
3. Add a mapping in `viewToPath()` if the view participates in view-based navigation helpers.

## Current Status

- Phase 1 (MVP Extraction):
  - Major views extracted and routed; AppShell integrated.
  - Modals/overlays centralized.
- Phase 2 (Iterative Enhancement):
  - Global side-effects moved to hooks.
  - Results view-local state moved to contexts.
  - Router drives view; remaining non-routed views are legacy-only.
- Phase 3 (Next):
  - Shared UI primitives, performance profiling, accessibility rounds.

## Next Targets

- Migrate any remaining non-routed views or remove them if deprecated.
- Increase unit/integration tests for containers and hooks.
- Continue reducing prop drilling by introducing focused contexts where helpful.
Final Route-Driven Migration Plan
=================================

Highlights
- Standardized path-to-view mapping with a single helper.
- Routed or removed remaining legacy views that depended on selectedView.
- Eliminated vestigial selectedView state in favor of URL-driven navigation.
- Updated sidebar/header interactions to use router navigation helpers.

Router Utilities
- File: `photo-search-intent-first/webapp/src/utils/router.ts`
- Exports:
  - viewToPath(view: string): maps logical views to app paths.
  - pathToView(pathname: string): maps location path to a logical view.
- pathToView("/search") yields "results" for consistent UI/guards.
- Removed legacy "memories" and duplicate "map" from View.

Routed/Removed Legacy Views
- Added routes:
  - /map → MapView wrapper
  - /smart → SmartCollections wrapper
  - /trips → TripsView wrapper
  - /videos → VideoManager wrapper
  - /saved → SavedViewContainer (existing)
- Removed legacy conditional blocks that rendered these based on selectedView.
- Removed memories view from UI and router types.

selectedView Removal
- No local selectedView state in App.tsx.
- Derive the active view from the location: const currentView = pathToView(location.pathname).
- Sidebar highlight now uses canonical View names (e.g., "results"), not raw segments.
- Navigation uses navigate(viewToPath(...)) exclusively.

Touched Files
- photo-search-intent-first/webapp/src/App.tsx
  - useLocation precedes pathToView usage; currentView derives from URL.
  - Replaced selectedView references with currentView.
  - Added Routes for map/smart/trips/videos; removed legacy conditional blocks.
  - AppShell now receives selectedView={currentView}; onViewChange navigates for all views.
  - Onboarding/help logic uses currentView.
- photo-search-intent-first/webapp/src/components/ModernSidebar.tsx
  - Removed memories; normalized item id for results.
- photo-search-intent-first/webapp/src/components/Sidebar.tsx
  - Already uses canonical ids; no behavior change.
- photo-search-intent-first/webapp/src/utils/router.ts
  - Cleaned View; kept pathToView/viewToPath helpers.

Follow-Ups (Optional)
- Convert any remaining raw segment usage to canonical View names everywhere.
- Update tests to align with route-driven context; add missing environment mocks (e.g., IntersectionObserver).

Summary
The app is now fully route-driven: active view derives from the URL, navigation uses helpers, and remaining legacy selectedView branches are removed. This simplifies state, unifies routing, and makes deep-linking and guards consistent.
