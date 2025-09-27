# UI Library Evaluation for Photo Search

This document evaluates UI libraries (shadcn/ui, MUI Core + MUI X, and adjacent options) against the project’s stack, features, and the Intent‑First Handbook. It includes a repo fit check and concrete integration steps.

## 1) Context & Constraints (Repo Check)
- Frontend stack: React 18 + Vite + TypeScript in `photo-search-intent-first/webapp`.
- Styling: Tailwind configured (`tailwind.config.js`) with CSS variables; custom design tokens and global styles in `src/styles-modern.css` and `src/styles.css`. Dark mode via class.
- UI components: Custom, colocated in `src/components/` (e.g., dialogs, drawers, grids, lightbox, tours, onboarding). No third‑party UI kit is in use today.
- Accessibility: Dedicated a11y work and checklists exist (ACCESSIBILITY_IMPLEMENTATION_*). Multiple modal/dialog patterns exist; ensuring consistent, accessible primitives is valuable.
- Virtualization/perf: `react-window` present; large, virtualized grids exist (JustifiedResults, VirtualizedPhotoGrid). PWA and service worker enabled.
- Icons & popper: `lucide-react` and `@floating-ui/react` are already in dependencies.
- Tests: Vitest + RTL, Playwright, and visual regression tests in place.
- shadcn status: `components.json` exists at `photo-search-intent-first/webapp/components.json` (initialized), but there’s no `src/index.css` referenced by shadcn default config and no shadcn components checked in under `src/components/ui`. Integration is not completed yet.

Key user flows from docs/PROJECT_PLAN.md and code:
- Search with filters (favorites, tags, date range), saved searches, collections, map, diagnostics.
- Heavy image/result views (lightbox, look‑alikes, timeline), keyboard shortcuts, toasts, drawers.

Summary constraints:
- Tailwind is the primary design system. Introducing a second styling runtime (e.g., Emotion) would increase bundle size and complexity.
- Accessibility and performance are first‑class requirements.

## 2) Intent‑First Alignment (from docs/intent_first_handbook.md)
Relevant principles to drive selection:
- Design for the experience, not the pixels: choose primitives that make core flows accessible and consistent across modals, popovers, lists, and controls.
- Optimize what users feel: keep runtime light, interactions fast, and virtualized grids smooth.
- Test what matters: predictable, component‑level testing; stable DOM and ARIA patterns.

These translate to evaluation criteria:
- Accessibility: keyboard operability, focus management, ARIA correctness, screenreader support.
- Performance: minimal runtime, tree‑shakeable usage, compatibility with virtualization.
- Theming: fits Tailwind + CSS variables and dark mode class without duplicate systems.
- Ownership: ability to own/modify components to match product needs.
- DX/Testing: predictable APIs, SSR safety, good TypeScript, community docs.
- Scope fit: tables vs grids, dialogs/drawers, popovers, command palettes, date pickers.

## 3) Candidates

### A) shadcn/ui (+ Radix primitives)
- What it is: A generator that vendoring‑in Tailwind‑styled components that wrap Radix UI primitives.
- Pros
  - Tailwind‑native; uses existing tokens. No extra runtime or styling engine.
  - Accessible by default via Radix primitives (dialogs, popovers, menus, etc.).
  - Ship only what we import; easy to customize since code lives in repo.
  - Aligns with existing `lucide-react` and `@floating-ui/react` usage.
  - Good fit for dialogs, drawers (sheet), popovers, command palette, toasts, tabs, skeletons.
- Cons
  - We own the code; upgrades are by re‑adding components or manually diffing.
  - No enterprise DataGrid; tables are basic (best with TanStack Table).

Repo fit check
- Tailwind present and customized: ✅ aligns.
- `components.json` present: ✅ init ran; integration incomplete (missing `src/index.css`, no generated components).
- Modal/Popover unification: ✅ valuable (current app has many custom modals). Radix patterns would standardize focus traps, aria‑labels, and ESC handling.
- Perf impact: ✅ minimal; components are local, no heavy runtime.

Recommended usage in this app
- Base components: button, input, textarea, select, checkbox, switch, tabs, tooltip, skeleton.
- Primitives for overlays: dialog, drawer/sheet, popover, dropdown‑menu, hover‑card.
- Command palette: `command` for quick‑action search.
- Toasts: shadcn toaster or keep the existing portal with a11y tweaks.
- Tables: pair shadcn table styles with TanStack Table for sorting/pagination.

### B) MUI Core + MUI X (Data Grid)
- What it is: Component library (MUI Core) plus advanced grid (MUI X Data Grid; Pro/Premium features are commercial).
- Pros
  - Huge breadth of components and patterns; polished DataGrid (column pinning, row grouping, aggregation with Pro/Premium).
  - Mature docs and ecosystem.
- Cons
  - Styling runtime (Emotion or styled‑components) runs alongside Tailwind; two systems to theme.
  - Larger runtime cost than Tailwind‑only; increased CSS/JS.
  - Visual/theming integration with existing CSS variables requires adapters.
  - Many DataGrid features need paid license if required (pinning, row grouping, Excel export, etc.).

Repo fit check
- Tailwind + custom CSS variables: ⚠️ dual styling model if adding MUI; would require theme bridges.
- Advanced DataGrid need: uncertain; current UI is photo‑grid oriented and list/cards UI; few table‑heavy screens (Jobs, Diagnostics) likely fine with lighter solutions.
- Bundle/perf budgets: ⚠️ MUI adds non‑trivial weight.

When to use
- If we truly need enterprise DataGrid features (pinning, grouping, aggregation, virtualization) with minimal engineering time.
- Otherwise, the costs outweigh benefits for this project’s image‑centric UI.

### C) Headless + Utility Options (for completeness)
- Radix UI alone: accessible primitives without styles; pair with Tailwind. Similar to shadcn but with more assembly.
- Headless UI: headless components for React; works with Tailwind; smaller scope than Radix for popover/menus.
- Mantine, Chakra, Ant Design: full UI kits with their own styling approaches; less natural with Tailwind tokens; heavier than shadcn.
- TanStack Table: not a UI kit, but a best‑in‑class table engine; ideal with shadcn table styles.

## 4) Recommendation

Primary: Adopt shadcn/ui for primitives and common controls. It matches our Tailwind + CSS variable system, improves a11y consistency, and keeps bundle/runtime lean.

Targeted add‑ons:
- Tables: TanStack Table + shadcn table styles.
- Date picker: `react-day-picker` or shadcn calendar (Radix‑based) for robust keyboard/a11y.
- Keep `react-window` for grid virtualization.

Conditional: If a future requirement truly needs advanced DataGrid features, consider MUI X Data Grid (Community first; Pro/Premium only if the value is clear). Use it in isolation to avoid pulling broader MUI Core into the design system.

## 5) Integration Plan (shadcn/ui)

Current status
- `components.json` exists but no generated components and the default Tailwind CSS entry file (`src/index.css`) referenced by shadcn config doesn’t exist. Tailwind is already integrated via `styles.css` and `styles-modern.css` using CSS variables.

Steps
1. Finalize Tailwind CSS entry
   - Create `src/index.css` to host Tailwind directives:
     - `@tailwind base;`
     - `@tailwind components;`
     - `@tailwind utilities;`
   - Import `src/index.css` in `src/main.tsx` after global styles, or merge directives into an existing CSS entry if preferred.
2. Run shadcn init (already done). Validate `components.json` paths:
   - Aliases point `ui` to `@/components/ui` (works with current tsconfig/vite aliases).
3. Add initial components (scoped to real usage):
   - `button`, `input`, `label`, `select`, `checkbox`, `switch`, `tabs`, `tooltip`.
   - Overlays: `dialog`, `drawer (sheet)`, `popover`, `dropdown-menu`.
   - Utilities: `command`, `toast`, `skeleton`, `separator`.
4. Replace bespoke overlays incrementally:
   - Migrate `HelpModal`, `SettingsModal`, `OnboardingModal`, `JobsDrawer`, `DiagnosticsDrawer` to Radix‑backed `Dialog`/`Sheet` for consistent focus trapping, ESC/overlay close, aria‑labelling.
5. Compose complex pieces
   - Filter panel: inputs + select + date picker within `Dialog`/`Sheet`.
   - Command palette: implement via shadcn `command` for quick actions (open settings, toggle filters, jump views).
6. Tables
   - Use TanStack Table for results lists and admin screens; apply shadcn table styles for consistency.
7. Testing & a11y checks
   - Update Playwright snapshots and RTL tests for dialogs and focus management.
   - Validate color contrast and focus rings match our tokens; ensure `aria-*` labels are present and deterministic.

Rollback/exit
- shadcn components are local files; we can adjust or remove selectively without vendor lock‑in.

## 6) Integration Plan (MUI, only if needed)

Scope control
- Prefer using only `@mui/x-data-grid` for a one‑off grid page if absolutely necessary; avoid bringing in broad MUI Core styles.

If adopting MUI Core (not recommended as primary)
- Install `@mui/material`, `@emotion/react`, `@emotion/styled`; map core palette to our CSS variables (custom theme). Keep Tailwind for layout/utilities; use MUI components sparingly.
- Monitor bundle size via existing `analyze-bundle.js` and protect perf budgets.

Licensing
- Data Grid Community is MIT with limited features. Pinning, row grouping, Excel export, pivoting require Pro or Premium licenses.

## 7) Risks & Mitigations
- Dual styling systems (MUI + Tailwind): risk of bloat and inconsistent theming → prefer shadcn; keep MUI isolated only if required.
- A11y drift across custom overlays: unify on Radix via shadcn to standardize focus/aria.
- Maintenance of vendored components (shadcn): track upstream; limit local deviations; document patterns.

## 8) Acceptance Criteria (Intent‑First)
- UX: Core flows use consistent, accessible primitives (Dialog/Sheet/Popover) with correct focus management and keyboard support.
- Perf: No regressions in initial load or grid interactions; virtualization remains smooth.
- Theming: Components honor existing CSS variables and dark mode class.
- Tests: Updated RTL/Playwright coverage for dialogs, menus, and command palette interactions.
- Documentation: This file and a short README section describing component usage patterns and a11y guarantees.

## 9) Quick Start Commands (Local)
- Ensure Tailwind entry exists: add `src/index.css` with Tailwind directives, then import it in `src/main.tsx`.
- Generate components incrementally (examples):
  - `pnpm dlx shadcn@latest add button input dialog dropdown-menu select switch tabs command toast skeleton`
- Keep change surface small: swap one dialog/drawer at a time and run existing tests.

## 10) Final Recommendation
- Adopt shadcn/ui as the base component approach for this repo.
- Use TanStack Table for any table needs; keep `react-window` for image grids.
- Consider MUI X Data Grid only if specific enterprise grid features are mandatory, and isolate it to the grid page.

