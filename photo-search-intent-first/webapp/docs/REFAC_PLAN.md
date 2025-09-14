# Final Route-Driven Migration Plan

This document summarizes the final phase of the intent‑first, route‑driven migration and the concrete changes made.

## Highlights

- Standardized path-to-view mapping with a single helper.
- Routed or removed remaining legacy views that depended on `selectedView`.
- Eliminated vestigial `selectedView` state in favor of URL‑driven navigation.
- Updated sidebar/header interactions to use router navigation helpers.

## Router Utilities

- File: `photo-search-intent-first/webapp/src/utils/router.ts`
- Exports:
  - `viewToPath(view: string): string` — maps logical views to app paths.
  - `pathToView(pathname: string): View` — maps location path to a logical view.

Notes:
- `pathToView("/search")` yields `"results"` for consistent UI/guards.
- Removed legacy `"memories"` and duplicate `"map"` from `View`.

## Routed/Removed Legacy Views

- Added routes:
  - `/map` → MapView wrapper
  - `/smart` → SmartCollections wrapper
  - `/trips` → TripsView wrapper
  - `/videos` → VideoManager wrapper
  - `/saved` → SavedViewContainer (already present)
- Removed legacy conditional blocks that previously rendered these based on `selectedView`.
- Removed `memories` view (not implemented) from UI and router types.

## `selectedView` Removal

- No local `selectedView` state in `App.tsx`.
- Derive the active view from the location: `const currentView = pathToView(location.pathname)`.
- Sidebar highlight uses the first path segment for compatibility with existing item ids (e.g., `"search"`).
- Navigation uses `navigate(viewToPath(...))` exclusively.

Touched files:
- `photo-search-intent-first/webapp/src/App.tsx`
  - Fixed ordering: `useLocation()` precedes `pathToView` usage.
  - Replaced `selectedView` references with `currentView`.
  - Added `Routes` for map/smart/trips/videos; removed legacy conditional view blocks.
  - Standardized TopBar/AppShell props to use `currentView` or path segment.
  - Updated onboarding/help logic to use `currentView`.
- `photo-search-intent-first/webapp/src/components/ModernSidebar.tsx`
  - Removed `memories` item.
- `photo-search-intent-first/webapp/src/utils/router.ts`
  - Added/confirmed `pathToView` helper; removed `memories`, duplicate `map` in type.

## Migration Notes

1) Route/Remove Legacy Views
- Map, Smart, Trips, Videos now have `<Route>` entries with focused wrappers.
- `memories` removed. If needed later, implement as a proper container and add a route.

2) Remove `selectedView` State
- Do not pass or mutate `selectedView` for view control.
- Use `navigate(viewToPath(view))` for all navigation and `pathToView(location.pathname)` for derivation.

3) Standardize Path‑to‑View Logic
- Use `pathToView(location.pathname)` wherever the UI/guards need the current logical view.
- Avoid manual `split('/')` except where raw segment ids are required for legacy item keys (sidebar); consider migrating those to `View` ids in a follow‑up.

4) Validate Routing & UI
- Deep links to `/library`, `/search`, `/people`, `/collections`, `/saved`, `/map`, `/smart`, `/trips`, `/videos` render the correct containers.
- Header/Sidebar actions now drive the router and stay in sync with URL.

5) Follow‑Ups (Optional)
- Convert sidebar item ids to `View` names (`"results"` vs `"search"`) to remove the last raw segment usage.
- Add minimal placeholders/tests for new routes if desired.

## Summary

The app is now fully route‑driven: active view derives from the URL, navigation uses helpers, and remaining legacy `selectedView` branches are removed. This simplifies state, unifies routing, and makes deep‑linking and guards consistent going forward.

