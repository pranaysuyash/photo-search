# OCR Progress + UX Enhancements

Summary
- Added backend progress tracking for OCR builds and exposed richer `/ocr/status`.
- Enhanced the UI TopBar OCR chip with hover details and a one‑click “Extract text (OCR)” action.
- Preserved backwards compatibility; no existing flows are broken.

Backend
- File: `infra/index_store.py`
  - During `build_ocr`, the store now writes `ocr_status.json` in the index directory:
    - On start: `{ state: 'running', start, total, done: 0, updated: 0 }`.
    - After each image: updates `done` and `updated`.
    - On completion: `{ state: 'complete', end, total, done, updated }`.
- File: `api/server.py`
  - `GET /ocr/status` now:
    - Returns the contents of `ocr_status.json` when present, enriched with `count` (number of non‑empty OCR texts) and `ready: true` when `state == 'complete'`.
    - Falls back to the original `{ ready, count }` response when no status file exists.
  - This is a non‑breaking superset of the previous response shape.

Frontend
- File: `webapp/src/App.tsx`
  - Tracks `ocrReady` and new `ocrCount` state.
  - After `buildOCR` completes, refreshes `/ocr/status` and updates `ocrReady`/`ocrCount`.
  - Passes `ocrCount` and `onBuildOCR` handler down to `TopBar`.
- File: `webapp/src/components/TopBar.tsx`
  - Replaced the simple OCR chip with a hoverable chip that:
    - Shows current text count.
    - When not ready, shows a one‑click “Extract text (OCR)” button (invokes `onBuildOCR`).
  - Uses the existing tooltip styling from the index chip for consistent UX.

Regression Safety
- `/ocr/status` remains compatible; existing consumers of `{ ready, count }` continue to work.
- UI changes are additive; the OCR chip exists previously, now with improved hover details.
- No changes were made to unrelated endpoints or UI features.

Follow‑ups (optional)
- Surface running OCR progress/ETA in JobsCenter using the new `ocr_status.json` fields.
- Add pause/resume for OCR similar to indexing if desired.
