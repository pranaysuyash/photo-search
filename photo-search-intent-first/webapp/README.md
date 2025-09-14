# Photo Search Webapp (Intent‑First)

This is the React + Vite web UI for the intent‑first implementation.

Docs
- Error Logging + Deep‑Links: `docs/error-logging-and-deeplinks.md`
- Visual tests and tooling live under `tests/` and `.storybook/`.

Testing
- Run unit tests: `npm test`
- If new components rely on browser APIs not available in jsdom (e.g., `IntersectionObserver`), add a safe polyfill to `src/test/setup.ts`.

Notes
- The app posts error events to the backend analytics log (`POST /analytics/log`) when `handleError({ logToServer: true, ... })` is used.
- Deep‑links encode search query + filters in the URL for shareable state.
