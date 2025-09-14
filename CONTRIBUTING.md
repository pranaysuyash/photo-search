Contributing

Thanks for your interest in improving Photo Search. This project contains two implementations; most active development is under `photo-search-intent-first/`.

Basics
- Use small, focused PRs.
- Include a brief description and rationale for changes.
- Keep changes consistent with the existing code style and structure.

Testing
- Webapp unit tests live under `photo-search-intent-first/webapp`.
  - Run tests: `cd photo-search-intent-first/webapp && npm test`
  - If you add components that rely on browser APIs not present in jsdom (e.g., `IntersectionObserver`), update `src/test/setup.ts` with a safe polyfill.

Error Logging & Deep‑Links
- See `photo-search-intent-first/webapp/docs/error-logging-and-deeplinks.md` for best practices on:
  - Using `handleError` to capture and optionally send errors to the backend (`/analytics/log`).
  - When to log to server (indexing, builds, mutations, exports, search, etc.).
  - Full list of deep-link parameters and encode/decode examples.

Security
- Do not log secrets or PII. `handleError` is best‑effort; prefer context like `{ action, component, dir }` and avoid sensitive payloads.

Questions
- Open a discussion or tag your PR with questions. We’re happy to help.

