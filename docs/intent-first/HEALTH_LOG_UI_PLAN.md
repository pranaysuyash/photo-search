# Engine Health & Log Surface – Stage 1 TODOs

Context: Stage 1 requires the Electron renderer to surface backend health and log state via the diagnostics drawer without bypassing the new engine IPC façade. Below checklist tracks the remaining work items and verification steps.

## TODO Checklist

- [x] Create a renderer-side bridge utility that abstracts `window.engine` subscriptions and normalises health/log payloads.
- [x] Extend the simple store with slices for engine health snapshots and log buffers (including lifecycle-safe subscription management).
- [x] Wire the diagnostics drawer to display live backend health status, recent transitions, and streaming log entries with filtering controls.
- [ ] Capture connectivity service events alongside engine health transitions to avoid regressions in the history view.
- [x] Add Vitest coverage that exercises the health/log hooks with mocked bridge events.
- [x] Document the renderer guardrails (no direct fetch, engine façade usage) in the diagnostics drawer docstring and update QA checklist.

## Verification

- Lint: `npm run lint:eslint` and `npm run lint:types` dedicated to diagnostics components.
- Tests: `npm run test -- Health` (or `npm run test -- Diagnostics` once the suite lands).
- Manual: Launch Electron build, open diagnostics drawer, confirm health status updates on backend restart and recent logs stream without console noise.
