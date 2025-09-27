# Feature Parity Checklist

Use this to keep Classic and Intent‑First aligned on shared features while documenting intentional differences.

Legend: [x] implemented, [ ] not yet, (IF) intent‑first only, (CL) classic only

Core
- [x] Index folder (per‑provider namespace) — Classic, Intent‑First
- [x] Search by text (Top‑K) — Classic, Intent‑First
- [x] Favorites toggle + filter — Classic, Intent‑First
- [x] Tags editor + filter — Classic, Intent‑First
- [x] Saved searches (list/run/save/delete) — Classic, Intent‑First
- [x] Reveal/Open in OS — Classic, Intent‑First
- [x] Thumbnails cache + /thumb endpoint — Classic, Intent‑First
- [x] Map (EXIF GPS points) — Classic, Intent‑First
- [x] Diagnostics (index counts, OS, free disk) — Classic, Intent‑First
- [x] Feedback logging + ranking boost — Classic, Intent‑First

Advanced (both; implement with optional flags in Classic)
- [x] Annoy fast search — Classic (done), Intent‑First (done)
- [x] FAISS fast search — Classic (done; optional dep), Intent‑First (done)
- [x] HNSW fast search — Classic (done; optional dep), Intent‑First (done)
- [x] OCR build + search boosting — Classic (build endpoint/UI done), Intent‑First (done)
- [x] Look‑alikes (dupe grouping) — Classic (done), Intent‑First (done)
- [x] Workspace (multi‑folder) + cross‑folder search — Classic (done), Intent‑First (done)
- [x] Diagnostics: show fast‑index availability — Classic (provider param), Intent‑First (done)

Frontend (React)
- [x] Tabs (Search, Saved, Map, Diagnostics) — Classic, Intent‑First
- [x] Details drawer with EXIF + actions — Classic, Intent‑First
- [x] Keyboard shortcuts (navigate, favorite, reveal) — Classic, Intent‑First
- [x] CSV export (results; selected) — Classic, Intent‑First
- [ ] Tag chips + autocomplete — Both (planned)
- [ ] Bulk tag editing — Both (planned)

Electron
- [x] Dev wrapper that launches API and opens UI — Classic, Intent‑First
- [ ] electron‑builder packaging for macOS/Windows — Both (planned)
- [ ] app icons/metadata — Both (planned)
- [ ] backend health‑check/retry on boot — Both (planned)

Docs & Tests
- [x] Dummy smoke tests — Classic, Intent‑First
- [ ] API parity CI check — Both (planned)
- [ ] Developer runbooks per platform — Both (planned)
- [ ] Privacy & engine guidance — Both (planned)

Files to compare
- Classic API: `archive/photo-search-classic/api/server.py:1`
- Intent‑First API: `photo-search-intent-first/api/server.py:1`
- Classic App: `archive/photo-search-classic/webapp/src/App.tsx:1`
- Intent‑First App: `photo-search-intent-first/webapp/src/App.tsx:1`
