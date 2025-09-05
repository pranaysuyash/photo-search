# Privacy & Data Flow (Local‑First)

This document describes how data moves through the app and what choices users have. Default stance: local‑first, explicit consent for any cloud use.

## Indexing
- Inputs: image files from user‑chosen folders.
- Processing: local CLIP embeddings, optional OCR (EasyOCR), EXIF extraction and offline reverse geocoding.
- Outputs: `.photo_index/<provider-id>/` containing `paths.json`, `embeddings.npy`, optional ANN indices, OCR/captions caches.
- Privacy: images are never uploaded. Index files remain on the same disk and can be deleted by the user.

## Search
- Text queries are embedded locally by default (transformers/sentence‑transformers CLIP).
- Results computed against local vectors; optional ANN accelerators used when available.
- Optional OCR/captions: if built locally, search uses local text embeddings; otherwise, disabled.

## Optional Cloud Add‑ons (Opt‑in)
- Providers: Hugging Face Inference API, OpenAI captions/embeddings.
- Data sent (when enabled): minimal content to produce captions or embeddings (image bytes or text) over TLS to the chosen provider.
- Keys: accepted in UI per session; not persisted unless user explicitly chooses (documented clearly in UI copy).
- Control: users can switch back to local at any time; cloud add‑ons are labeled in UI and landing.

## Faces (People & Pets)
- Local-only (InsightFace) clustering and embeddings.
- Storage: `.photo_index/<provider-id>/faces/` for state + `faces_embeddings.npy`.
- Privacy: no face data leaves the device.

## Map & Places
- GPS EXIF read locally; optional offline reverse geocoder used to derive “place” strings.
- No map tiles are fetched by default in the Electron desktop app. In web demo, any tiles or libraries used will be disclosed.

## Analytics & Telemetry
- Application: none collected. No usage analytics or tracking in the desktop app.
- Landing page: optional privacy‑respecting analytics may be added later (see LANDING_MEDIA_AND_GROWTH_NOTES.md) and will be disclosed in Privacy.

## Exports
- CSV and file copy/symlink exports are local operations.
- EXIF stripping is performed locally if chosen.

## Deletion
- Index folders are removable by the user. Deleting `.photo_index` removes all derived data.

## User Controls Summary
- Engine selector clearly labels Local vs Cloud.
- Session‑only keys; no persistence by default.
- Clear privacy copy in landing and in‑app Help.
