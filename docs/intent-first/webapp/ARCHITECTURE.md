# Intent-First Webapp Architecture

## Navigation & Routing
- Router: React Router v6 via `HashRouter` (robust for SPA deep links without server rewrites).
- Routes: `#/library`, `#/search`, `#/people`, `#/collections`, `#/settings`.
- URL state: search query in `q` (`#/search?q=beach+sunset`); additional filters can extend query params.
- Back/forward: browser history integrated via `navigate` calls on state changes.

## Contexts (State Design)
- `SearchContext`
  - State: `query`, `results`, `filters` (tags, favOnly, dateFrom/To, person(s), place, hasText)
  - Actions: `setQuery`, `setResults`, `setFilters`
  - Bridge: mirrors to existing zustand actions when available.
- `LibraryContext`
  - State: `paths`, `hasMore`, `isIndexing`
  - Actions: `index()`, `load()`; thin wrappers around existing API helpers.
- `UIContext`
  - State: `sidebarOpen`, `theme`, `modals:{help,onboarding}`
  - Actions: `toggleSidebar`, `setTheme`, modal open/close.
- `SettingsContext`
  - State: `engine`, `useFast`, `fastKind`, `useCaptions`, `useOcr`, `topK`
  - Actions: setters for each.

All contexts are composed in `RootProviders` and wrapped around the app in `src/main.tsx`.

## Component Hierarchy (High-Level)
- `RootProviders`
  - `HashRouter`
  - `SimpleStoreProvider` (legacy zustand store)
  - `SettingsProvider`
  - `UIProvider`
  - `LibraryProvider`
  - `SearchProvider`
    - `App` (legacy composite UI)
      - TopBar (search input, actions)
      - Sidebar (navigation)
      - Content area
        - Results grid / Library browser / People view / Collections / Tasks
      - Lightbox, Drawers, Modals

## Data Flow Patterns
- Actions mutate zustand store and/or contexts; UI reads via hooks.
- URL is source-of-truth for view selection and search query.
- Effects sync route -> view and view -> route to keep navigation coherent.

## State Persistence Strategy
- Theme persisted to `localStorage: ps_theme`.
- Onboarding flag persisted to `localStorage: hasSeenOnboarding`.
- URL encodes search inputs for deep links and shareable state.

## Interface Specs (Selected)
- `SearchContext`:
  - `state.query: string`
  - `state.filters: { tags?: string[]; favOnly?: boolean; dateFrom?: number|null; dateTo?: number|null; ... }`
  - `actions.setQuery(q: string)`; `actions.setFilters(partial)`; `actions.setResults(results)`
- `LibraryContext`:
  - `actions.index({ dir?, provider? })` -> runs `/index`
  - `actions.load({ limit?, offset?, append? })` -> runs `/library`

