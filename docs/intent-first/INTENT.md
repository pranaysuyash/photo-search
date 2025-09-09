Intent-First Analysis – Photo Search

Context Discovery
- Users have thousands of local photos and need a fast way to find a specific moment (e.g., “friends having tea”) without manually browsing folders or remembering capture dates.
- Platform: local desktop app delivered via Streamlit UI.
- Constraints: Local-only file access, privacy preserved; run on CPU; minimal setup.

Intent & Desired Outcomes
- Core Intent 1: Index Photos – Efficiently build/update a semantic index for a directory of images.
- Core Intent 2: Search Photos – Let users type natural language and retrieve relevant images quickly.
- Outcomes: Reduce time-to-find; preserve privacy (no uploads); keep index incremental and portable.

Priority Assessment
- User Value: High – saves significant time and frustration.
- Business Value: High – foundational utility to extend into richer personal media tools.
- Technical Effort: Medium – CLIP-based embeddings, local index storage, basic UI.
- Operational Risk: Low – local app; primary risks are performance and model download time.

MVP Scope
- Index selected folder recursively for common image formats.
- Store CLIP-ViT-B-32 embeddings next to folder in `.photo_index/clip-ViT-B-32`.
- Incremental re-index based on modified time.
- Text search returning top K results with inline previews.

Acceptance Criteria
- Index builds successfully on a folder with >1k images.
- Re-running index updates only new/modified images.
- Query returns top results ordered by cosine similarity.
- App runs fully offline after initial model download.

Risks & Mitigations
- Model download size/time: clearly communicate on first run; cache weights.
- Non-image files or corrupt images: skip safely; do not crash.
- Large folders: allow adjustable batch size; incremental updates.
- Provider switching: index stored per provider (`.photo_index/<provider-id>`) to avoid mixups.

Success Metrics (initial)
- Time to first result < 2s after index exists (for 1k images, CPU).
- Index update re-embeds < 5% when only a small set changed.
- Zero crashes on unsupported/corrupt files.

Future Enhancements (out of MVP)
- Multi-folder unified index and tagging.
- Captions and OCR to improve recall.
- FAISS or ANN for very large libraries.

Applied Handbook (All 14 Philosophies)

1) Development
- Clear intent boundaries with use cases: IndexPhotos, SearchPhotos.
- Swappable embedding providers (Local CLIP, HF API, OpenAI caption+embed).
- MVP scope prioritizes local/offline first; remote providers optional.

2) Testing
- Dummy embedder smoke tests per folder to avoid model downloads.
- E2E script used CLIP to verify queries map to expected images.
- Next: add tests for provider selection and unreadable-image handling.

3) UX Design
- Primary flows: set folder, index, search; fast preview grid after indexing.
- Error handling: corrupt/unsupported images shown as “Unreadable” not crash.
- Clarity: Provider choice in sidebar with guidance and tradeoffs.
 - Workspace: Manage multiple folders under "More folders"; toggle cross-folder search.
 - Collections: Star results into named collections; export or delete under Browse.
 - Preferences: Remember key choices; auto-thumbnails for small libraries.
- Favorites & Undo: One‑click favorites and session undo for tag/favorite/selection changes.
- Map: Plot GPS‑tagged photos with a simple map; include workspace folders.

4) Code Review
- Separation of concerns across domain/adapters/infra/usecases/ui.
- Minimize coupling to any single provider; factory pattern.

5) Deployment
- Local app via Streamlit; no server dependencies.
- Remote providers gated by user tokens; safe fallback to local model.

6) Data
- Index stored locally beside the folder; no uploads by default.
- Minimal PII; users control directories; tokens are user-provided at runtime.

7) Security
- Never persist API keys to disk; accept via UI only for session.
- Recommend environment variables or Streamlit secrets for long-term use.

8) Performance
- Incremental re-index by mtime; adjustable batch size.
- Local vector search via dot product; consider ANN for >100k images.
- Provider-cached resources and embedder caching reduce re-instantiation.
 - Workspace fast index: optional unified Annoy/FAISS index in `~/.photo_search/workspace_index/<provider-id>`.
 - Auto-prepare: after building all folders, auto-build workspace fast index when enabled.
- ANN engines: support Annoy, FAISS, and HNSW; expose choice in Advanced.

9) Documentation
- README for setup; this INTENT applied; differences documented at repo root.
 - In-app Help & About renders differences and a handbook summary.
- Roadmap: `ROADMAP.md` tracks near/mid-term intent-aligned features and model exploration.

10) Product
- Core job: “find my photo fast by idea not date.”
- Differentiators: privacy-first local indexing; optional cloud models.

11) Content
- Plain, helpful copy in UI; concise captions and guidance for providers.

12) Customer Success
- Common issues surfaced inline (model download time, unreadable files).
- Troubleshooting tips to be added to README.

13) Sales
- N/A for open-source utility; value framing in docs.

14) Operations
- No backend infra; version pinning in requirements; optional HF/OpenAI.
- Provider-specific index namespaces keep deployments deterministic.
