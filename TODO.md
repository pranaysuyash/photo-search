# Photo Search – Feature TODOs

This backlog lists high‑value features for a best‑in‑class, private‑first photo manager across macOS, Windows, and Web (Electron + React + FastAPI). Items are grouped by area with concise acceptance criteria.

## Core Enhancements
- Search speed telemetry: record query latency; surface in Diagnostics
  - Acceptance: avg/95p latency visible per engine
- Exact/ANN switch per query with “Auto” heuristic
  - Acceptance: UI toggle + persisted preference
- Bulk operations: move/copy/delete (to OS trash), rename with templates
  - Acceptance: non‑destructive, confirmation + undo
- Preferences sync (local JSON) with export/import
  - Acceptance: export/import file round‑trip works

## Filters & Organization
- Smart filters: camera, lens, ISO, dominant color, aspect ratio, orientation
  - Acceptance: filters narrow results correctly on a seeded dataset
- People & faces (opt‑in, local): detect, cluster, and name; filter by person
  - Acceptance: face clusters view + rename; search filter “Person: <name>”
- Smart albums: rule‑based collections (e.g., “Beach in 2021, favorites”)
  - Acceptance: rule editor + background refresh updating contents
- Map upgrades: real tiles + clustering; hover thumb previews
  - Acceptance: responsive up to 10k points

## Editing (Non‑destructive)
- Inline crop/rotate/flip; exposure/contrast/temperature sliders
  - Acceptance: edits saved as sidecar; reset to original
- AI upscaling (Real‑ESRGAN) 2×/4× with preview
  - Acceptance: compare view; output saved to sibling folder
- Enhance/denoise/deblur (open‑source models)
  - Acceptance: deterministic presets with progress feedback
- Background removal (Rembg) + subject cutout export
  - Acceptance: mask preview; PNG export with transparency
- Colorize old photos (DeOldify) + intensity slider
  - Acceptance: side‑by‑side preview + export

## AI Discovery & Captioning
- Local VLM captions (e.g., Qwen‑VL, LLaVA) via Ollama/gguf
  - Acceptance: caption file per image; search boosts with captions
- Cloud caption add‑on (OpenAI, Gemini, HF) with cost prompts
  - Acceptance: per‑provider toggles; never persist keys; usage limits
- Similar‑by‑example (“More like this”) neighbors using CLIP/SigLIP
  - Acceptance: click result to open neighbors panel
- Auto‑tagging (broad concepts) locally; cloud as optional fallback
  - Acceptance: tag suggestions list + one‑click apply

## Sharing & Collaboration
- Quick share export: copy selected to a new folder; strip EXIF or watermark optional
  - Acceptance: export dialog; success toast; log action
- Static web gallery export (zip): minimal HTML with thumbs + captions
  - Acceptance: exported gallery opens locally; shareable via any host
- Direct share link (local server): ephemeral token + expiry
  - Acceptance: share recipient can open read‑only grid; no write access
- Cloud share (optional): S3/Drive uploader with pre‑signed links
  - Acceptance: progress + result links; retries/backoff

## Sync & Backup (Optional)
- Watch folders for changes; incremental index automatically
  - Acceptance: background watcher updates counts without UI blocking
- Backup index to local DB/SQLite; restore path when moving libraries
  - Acceptance: rebuild index metadata from backup mapping

## UX & Accessibility
- Virtualized grids for large results; skeleton loader; debounce inputs
  - Acceptance: smooth scroll with 25k items on mid‑range laptop
- Keyboard shortcuts everywhere (+ cheat sheet overlay)
  - Acceptance: tested shortcuts for navigate/favorite/reveal/edit
- Tag chips + autocomplete + bulk edit (both apps)
  - Acceptance: chip UX + multi‑select update in one go

## Packaging & Distribution
- Electron packaging (electron‑builder) for macOS/Windows + icons/signing
  - Acceptance: DMG/EXE artifacts; auto‑update toggle for later
- Release pipeline: CI build artifacts per tag; upload to S3/Drive
  - Acceptance: one‑click release draft with checksums

## Monetization & Add‑ons
- Add‑on marketplace UI: list optional AI engines (OpenAI, Gemini, HF)
  - Acceptance: install switches per provider; usage caps; per‑feature paywall friendly copy
- Billing: Gumroad link embed (MVP) + optional Razorpay checkout
  - Acceptance: purchase opens in modal/new tab; app unlock key captured locally (file) without servers

## Compliance & Legal (for Razorpay or similar)
- Public pages: Terms of Service, Privacy Policy, Refund Policy (no refunds)
  - Acceptance: pages linked in footer; copy reviewed; versioned

## Research Queue (Evaluate and choose)
- Upscaling: Real‑ESRGAN vs. SwinIR
- Denoise/deblur: GFPGAN, DeblurGAN‑v2
- Segmentation: Rembg vs. MODNet
- Local VLMs: Qwen‑VL, LLaVA, MiniCPM‑V, Phi‑3‑vision; via Ollama
- Text OCR: EasyOCR vs. Tesseract + language packs
- Vector DB: FAISS+SQLite hybrid vs. Milvus/pgvector (optional)

## Implementor Notes
- Keep Classic minimal in deps; gate heavy features with optional extras and graceful fallbacks. Intent‑First can host layered integrations first, then uplift to Classic once stable.
- Maintain private‑by‑default posture: local models first; cloud add‑ons explicit and never persisted.

