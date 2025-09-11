# Testing Strategy (Intent‑First)

This plan improves confidence without slowing teams down. We prioritize tests that reduce time‑to‑first‑value (TTFV), build user trust, and are transparent, local‑only, and reversible.

Guiding principles
- Intent‑First coverage: test what users rely on first (onboarding, search, results, export), then depth.
- Fast feedback: unit + component stories run in seconds; e2e visual runs on key flows only.
- Deterministic & local: no network; stable seeds; mask dynamic regions in visuals.
- Reversible: golden image updates are explicit; story variations document states.

Layers
- Unit: pure functions, stores, hooks (Vitest).
- Component: Storybook stories for critical components (SearchBar, TopBar, Results grid, Timeline block, Modals).
- Visual/E2E: Playwright screenshot assertions for key, user‑visible flows.
- API: FastAPI endpoint tests for contracts (/index/status, /ocr/status, /metadata/detail).

Phase 1 (this week)
1) Storybook scaffolding + initial stories
   - Setup SB with Vite.
   - Add stories for SearchBar, TopBar (idle/indexing), FirstRunSetup, JustifiedResults (small fixture), TimelineResults (month bucket).
2) Playwright visual sanity
   - Add 2 visuals: First‑Run modal and Indexed chip (idle/indexing with determinate bar).
   - Use expect(page).toHaveScreenshot() with masking unstable regions.
3) API contract tests
   - Add tests for /index/status, /ocr/status with temp dirs (pytests exist in api/tests; extend).

Phase 2
- Expand story coverage (modals: AdvancedSearch, Help; list chips; OCR pill; Jobs).
- Add e2e flows: Quick Start, Search/NL, Fielded boolean, Timeline jumps.
- Introduce a11y checks (axe) in Storybook and Playwright (basic rules).

Phase 3
- Visual stability rules: masks for timestamps, counts; per‑theme screenshots.
- CI integration (optional): run unit + component + a small visual subset on PRs.

Tooling
- Unit: Vitest (already configured)
- Storybook: @storybook/react-vite
- Visual/E2E: @playwright/test (configured in webapp/playwright.config.ts)

How to run (local)
- Unit: `npm run test`
- Storybook: `npm run storybook` (after adding deps)
- Visual/E2E: `npm run test:e2e` (dev server auto‑starts per config)

Notes
- Keep visual tests few and meaningful to avoid brittleness.
- Prefer Storybook stories for rich states over deep RTL tests.
- Use small, local fixtures (demo_photos) for visuals.

