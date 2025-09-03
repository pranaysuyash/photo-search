Photo Search (Intent-First)

Overview
- Same functionality as the classic app, structured around explicit intents and layers following the Intent-First handbook. Core intents:
  - Index Photos: build/update an embedding index for a folder
  - Search Photos: retrieve top images matching a natural-language query

Architecture
- `domain/`: Core models and types (framework-agnostic)
- `adapters/`: Integration with embedding model and filesystem
- `infra/`: Persistence and index storage
- `usecases/`: Intent-focused application services (IndexPhotos, SearchPhotos)
- `ui/`: Streamlit UI consuming use cases

Quick Start
1. Create a virtual environment and install requirements:
   - `python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Run the UI:
   - `streamlit run ui/app.py`

Providers
- Local (Transformers CLIP, fast) – default: Uses `openai/clip-vit-base-patch32` via `transformers` with a fast image processor.
- Local (SentenceTransformers, compat): Uses `clip-ViT-B-32` via `sentence-transformers` (offline after first download).
- Hugging Face Inference API: Set your token in the sidebar when selected.
- Hugging Face (Caption): Captions each image (BLIP) and embeds the text (MiniLM). Good fallback when CLIP image features aren’t available via API.
- OpenAI (Caption + Embed): Enter your API key; this captions each image and embeds the caption (slow/$$ for large folders).

Notes
- First local run downloads CLIP weights; allow time and network.
- Index stored per-photo-folder in `.photo_index/clip-ViT-B-32`.
- Each provider has its own index folder under `.photo_index/<provider-id>` to avoid mixing embeddings.
- API keys entered in the sidebar are used in-session only and not saved to disk.
- OCR (optional): Install extras with `pip install -e .[ocr]` to enable EasyOCR-powered text-in-image search boosting.
- HNSW (optional): Install extras with `pip install -e .[hnsw]` to enable HNSW-based fast search.

UI
- Index tab: build/update the index; preview items; thumbnails; OCR (optional) with language selection.
- Search tab: natural language, EXIF filters + timeline chart, Favorites (♥), Tags (filter + editor), Collections, Recent, Saved searches, Export (copy/symlink), Compact/List modes, Zoom, “Open top N in Files”.
- Browse tab: page through all indexed images (grid columns selectable) with cached thumbnails.
- Map tab: plot photos with GPS EXIF; include added folders; limit plotted count.
- Preflight tab: engine/device status, diagnostics export, reset settings, look‑alike photos (beta).
- Clear Index: remove the current folder’s saved search data.
- Preferences: remembers your last folder, engine, layout, and advanced toggles.
- Auto‑thumbnails: after build, small libraries (≤500 photos) auto‑precache thumbnails.
- Multi-folder workspace: add/remove folders under “More folders”, toggle cross-folder search, and run workspace‑wide build and fast‑search actions.
- Collections & Favorites: star results; manage and export collections from Browse.

Help & Troubleshooting
- Private by default: On-device engine keeps your photos on your computer.
- Cloud engines: When selected, images/queries go to that provider (HF/OpenAI). Keys are used in‑session only and not saved.
- Model downloads: First run may download a model; allow time and network.
- Unreadable images: Corrupt/unsupported files are skipped and won’t crash the app.
- Faster search: Enable in Advanced; click “Prepare Faster Search” to build the index. If Annoy/FAISS are missing, the app falls back to standard search automatically.
- Engine status: In Help & About, enable “Show engine status” to see if Annoy/FAISS are available.
- FAISS install: Optional; try `pip install faiss-cpu` (macOS/Linux). On Windows, follow official FAISS wheels/docs.
- Hugging Face: Add `HF_API_TOKEN` env or paste into the sidebar when using HF Cloud.
- OpenAI: Add `OPENAI_API_KEY` env or paste into the sidebar when using OpenAI (Captions).

ANN (optional)
- Faster search engines (Advanced): Annoy, FAISS, and HNSW. If a library is missing, the app falls back to exact search automatically.
- For workspace‑wide fast search, use “Prepare faster search (all)”.

See `INTENT.md` for the intent analysis, priorities, and acceptance criteria.
