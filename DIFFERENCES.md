Photo Search – Approach Differences

Summary
- Both folders implement the same functionality: local photo indexing and text-based search using CLIP.
- They differ in architecture and documentation per the Intent-First methodology.

Folders
- `photo-search-classic`: Straightforward, minimal structure; logic centralized in `engine.py`; Streamlit UI in `app.py`.
- `photo-search-intent-first`: Intent-driven structure; layers for domain, adapters, infra, usecases, and UI; explicit `INTENT.md`.

Key Differences
- Intent Articulation:
  - Classic: Described briefly in README.
  - Intent-First: `INTENT.md` captures context, intents, acceptance criteria, risks, and metrics.
- Architecture:
  - Classic: Single engine module handling indexing, storage, and search.
  - Intent-First: Clear separation of concerns:
    - domain/ – models and constants
    - adapters/ – filesystem and embedding integration
    - infra/ – index storage and persistence
    - usecases/ – IndexPhotos, SearchPhotos orchestrations
    - ui/ – Streamlit app consuming usecases
- Testability:
  - Both include a dummy-embedder smoke test that validates indexing/search without downloading models.
  - Intent-First’s separation enables easier unit-level testing per layer.
- Extensibility:
  - Classic: Faster to read and modify for small features.
  - Intent-First: Easier to extend (e.g., swap embedder, add ANN, multi-folder index) with minimal ripple. Includes provider options (Local CLIP fast/compat, Hugging Face Inference API, OpenAI caption+embed) and provider-specific index namespaces, and multiple ANN engines (Annoy, FAISS, HNSW).

UX/Features
- Classic: Index preview, search with Top-K and min-score, CSV export, Reveal in OS, Browse with pagination and grid column control.
- Intent-First: All of the above, plus provider selection and date filter, per-provider indexes, env var support for keys, and CLI.
- Intent-First: Workspace tools (Build all, Prepare fast search, Show per-folder data), Map, Favorites (♥), Tags (filter + editor), Saved searches, Export (copy/symlink), Compact/List modes, Zoom, OCR (languages), look-alike detection (beta), Preflight diagnostics. ANN engines include Annoy, FAISS, HNSW.

Operational Parity
- Index location, file formats, and UI behaviors are equivalent across both apps.

When to Choose Which
- Use Classic for quick prototypes or single-developer utilities.
- Use Intent-First when collaborating, scaling, or planning iterative growth with clear intent and boundaries.
