# Repository Guidelines

## Project Structure & Module Organization

The active code lives in `photo-search-intent-first/`, which houses layered domains: `api/` (FastAPI services), `webapp/` (Vite + React UI), `electron/` (desktop shell packaging), `usecases/` and `adapters/` (business logic), plus `tests/` for Python suites and `demo_photos/` sample assets. Legacy prototypes remain under `archive/`; reference-only docs live in `docs/` and root analysis reports. Keep new assets inside the intent-first tree unless explicitly extending archival examples.

## Build, Test, and Development Commands

**CRITICAL: Always activate the virtual environment before any Python commands:**

```bash
cd photo-search-intent-first
source .venv/bin/activate
```

Start the backend with: `uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload` (requires venv activated)
Launch the web UI via `npm --prefix photo-search-intent-first/webapp run dev`, or run the Electron shell with `npm --prefix photo-search-intent-first/electron run dev`. Python smoke tests use `PYTHONPATH=. pytest tests` (requires venv activated). Web unit tests run through `npm --prefix photo-search-intent-first/webapp run test`, and Playwright visual checks use `npm --prefix photo-search-intent-first/webapp run test:visual`.

## Coding Style & Naming Conventions

Follow Ruff-enforced Python style (PEP 8, 100-character lines, type hints) and keep module names snake_case. Frontend code targets strict TypeScript with Biome for formatting (`npm run lint:fix`) and ESLint for rule enforcement; prefer PascalCase for components, camelCase for hooks/utilities, and kebab-case for file-system routes. Avoid ad hoc fetch usage—use existing adapters or clients documented in `docs` when integrating APIs.

## Testing Guidelines

Unit and integration tests live beside their domains; mirror filenames with `_test.py` or `.test.tsx` suffixes. Maintain fast smoke coverage via `photo-search-intent-first/tests/smoke_dummy.py` before committing and add Vitest coverage when touching UI (`npm run test:coverage`). Visual diffs should be refreshed intentionally with `npm --prefix photo-search-intent-first/webapp run test:visual:update`, and Playwright E2E specs belong under `webapp/tests/e2e`. Document any skipped tests with actionable TODOs.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`) as seen in recent history, and keep subject lines under 72 characters. Commits should group related intent slices—avoid mixing backend and frontend changes without rationale. Pull requests must describe scope, link issues or TODO items, list local test commands executed, and include screenshots or terminal logs for UI or visual changes. Update relevant docs (blueprints, testing summaries) when altering cross-cutting behaviors.

## Security & Configuration Tips

Store local secrets in `.env` (never commit them) and use the documented `API_TOKEN` pairing when testing auth-sensitive flows. When bundling models, run `npm --prefix photo-search-intent-first/electron run prepare:models` to ensure hashes are recorded; verify Electron builds on a clean virtualenv to avoid leaking global state.
