# Features — Have / Should / Could

This document lists a pragmatic feature map for Photo Search based on the current codebase and the research brief. It’s organized by what exists today (Have), what we should add next (Should), and what can follow as differentiators (Could).

## Have (Implemented)
- Embedding-based search: Local CLIP (transformers/sentence-transformers) with optional cloud providers (HF API, OpenAI captions+embeddings).
- Indexing and speed: Incremental per‑provider indices, optional FAISS/Annoy/HNSW fast search with exact re‑rank; workspace-wide aggregated index.
- OCR: EasyOCR-based text extraction, combined image+text similarity, exact-phrase filtering, snippets in UI.
- Metadata & filters: EXIF indexing (camera/ISO/f-number/exposure/focal/flash/WB/metering/GPS/alt/heading/dimensions) with offline reverse geocoding; date range filtering.
- People (faces): InsightFace-based clustering, naming, person filter (API + React UI wired; Streamlit parity pending).
- Organization: Favorites, per-photo tags (bulk ops), collections, saved searches, smart collections (rule storage + resolve), CSV export, file export/symlink, optional EXIF stripping on export.
- Duplicates/similar: Perceptual hash near-duplicate grouping, side-by-side compare and keep-best suggestion, batch copy/resolve.
- Map & timeline: GPS plotting with clustering; timeline histogram; paging and thumbnail precache.
- UIs/Infra: Streamlit desktop UI (intent-first), React web UI, FastAPI backend, Electron scaffolding, basic analytics & feedback logging.

## Should (Near-term essentials)
- People UI parity: Expose face clusters/person filter in Streamlit, improve cluster merge/rename flows in React.
- Smart Albums UX: Visual rule builder (query, favorites-only, tags, date range, EXIF filters), preview + "Save as Smart Album".
- Onboarding & guidance: First-run flow (choose folder, progress, sample queries), system file pickers, clear empty states, keyboard shortcuts.
- Timeline & calendar: Year/Month/Day drilldown, calendar picker, quick time windows (last 30/90 days), smoother scrolling.
- Workspace parity: Unified search toggles across UIs, diagnostics visibility, fast-index availability indicators.
- Packaging: Electron installers (macOS/Windows) with backend auto-start, icons/metadata, health checks.

## Could (Emerging/delighter features)
- Multi-modal queries: Image+text search (e.g., "like this but in snow"), crop-region similarity.
- Trips & events: Trip detection UI (already have backend trips), optional calendar integration or public-event inference.
- Aesthetic/quality filters: Local aesthetic scoring; filters like "sharp", "well-exposed", "eyes open" for fast culling.
- Pet albums: Pets clustering/tags alongside People.
- Conversational search: Optional assistant (local or BYO key) to compose complex queries and answer OCR-derived questions.
- Advanced attributes: Face attributes (age band, group size) and relationship queries ("person holding a…").

## Notes
- Maintain private-by-default posture; cloud is opt-in and clearly labeled.
- Keep performance budgets: preserve fast first result and indexing throughput; favor optional fast indices for large libraries.

