# API/Client Contract Alignment – JSON Body for POST Endpoints

Intent: I need a working development and deployment pipeline. The client (webapp) sends JSON request bodies for POST endpoints; the API must accept JSON while preserving existing query param compatibility.

## Current Status
- Completed (accept JSON body + query fallback):
  - /index (already JSON via Pydantic model)
  - /search
  - /search_workspace
  - /captions/build
  - /faces/build
  - /faces/name
  - /trips/build
- Pending (still query-params only; client posts JSON):
  - Search variants: /search_like, /search_like_plus
  - OCR: /ocr/build, /ocr/snippets
  - Fast index: /fast/build
  - Favorites/Tags/Saved: /favorites (POST), /tags (POST), /saved (POST), /saved/delete
  - Collections: /collections, /collections/delete
  - Smart Collections: /smart_collections, /smart_collections/delete, /smart_collections/resolve
  - Feedback & Analytics: /feedback, /analytics/log
  - Lookalikes: /lookalikes/resolve
  - Open/Edit/Export: /open, /edit/ops, /edit/upscale, /export
  - Sharing: /share, /share/revoke
  - Workspace: /workspace/add, /workspace/remove
  - Metadata & Auto: /metadata/build, /autotag
  - File ops: /delete, /undo_delete

## Approach
- Add optional `body: dict | None = Body(None)` to each POST handler.
- Coalesce values from `body` when query args are missing using a helper (done): `_pick(body, current, key, default)`.
- Keep response schemas unchanged; maintain backward compatibility with existing query callers.

## Acceptance Criteria
- All POST endpoints used in `webapp/src/api.ts` accept JSON bodies without 422 errors.
- GET endpoints remain unchanged.
- Existing query-style POST requests still work.
- Basic tests cover at least: /search_like, /ocr/build, /export, /share, /favorites, /tags.

## Test Plan
- Unit/Integration (FastAPI TestClient):
  - POST each endpoint with JSON body; assert 200/expected schema (use tmp dirs and small fixtures where needed).
  - Backward-compat: issue same requests via query args where practical.
- Webapp sanity: trigger flows that call the updated endpoints (search like, export, favorites) and verify no 422s.

## Effort & Timeline
- Estimated effort: ~2–4 hours for code + tests.
- Low risk; purely additive and backward-compatible.

## Rollout
- Patch endpoints in small groups (search, media ops, collections, sharing).
- Land and run tests after each group.
- Verify e2e navigation and job flows still function.

