Progress UI Parity: OCR, Metadata, Fast Indexes

Summary
- Added backend status files and API endpoints for Metadata and Fast builds.
- Wired JobsCenter to show progress/ETA for OCR and Metadata, and show running/completion for Fast.
- Enhanced Index chip to display inline coverage percentage.

Backend Changes
- Metadata
  - Status file: `<index_dir>/metadata_status.json` updated during `_build_exif_index`.
  - Endpoint: `GET /metadata/status` returns `{ state, start/end, total, done, updated }` (or idle).
- Fast (ANN)
  - Status file: `<index_dir>/fast_status.json` written at start and completion of `/fast/build`.
  - Endpoint: `GET /fast/status` returns `{ state, kind, start|end, ok }`.
- OCR (previous step)
  - Status file: `<index_dir>/ocr_status.json` updated during `build_ocr`.
  - Endpoint: `GET /ocr/status` returns status + `count` and `ready` when complete.

Frontend Changes
- JobsCenter wiring (App.tsx)
  - OCR: creates a job and polls `/ocr/status` every second; updates `progress/total` and ETA. Marks completed when `/ocr/build` returns.
  - Metadata: creates a job and polls `/metadata/status` similarly; marks completion afterward.
  - Fast: creates a job and polls `/fast/status` for state until complete (no determinate progress available).
- Index chip inline coverage
  - Polling of `/index/status` now stores `coverage` and passes it to `TopBar`.
  - TopBar displays count and percentage: `Indexed N (P%)`.

Compatibility & Safety
- New endpoints are additive and do not break existing callers.
- JobsCenter updates are internal UI changes; no changes to app flows.
- Fast build progress is indeterminate by design; we surface running/completed states.

Testing Tips
- Start builds from the UI (Settings/Indexing):
  - OCR: Observe job progress counts and ETA updating; chip hover shows OCR count.
  - Metadata: Observe job progress counts and ETA.
  - Fast: Observe a running job then completion.
- Index chip shows coverage percentage while indexing; tooltip lists processed/target/indexed/coverage/drift/ETA.
