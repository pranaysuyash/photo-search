Photo Search (Classic)

Overview
- A simple Streamlit app to index photos in a folder and search them by natural language using CLIP embeddings via `sentence-transformers`.
- Includes quality-of-life tools: Favorites, Saved searches, Tags, Collections, CSV export, and a map view.

Key Features
- Index a chosen directory recursively for common image formats.
- Store persistent index beside the folder (`.photo_index/clip-ViT-B-32`).
- Fast text search over images using cosine similarity.
- Display top results inline with paths.
- Favorites (♥): mark results and filter by Favorites.
- Saved searches: name and reuse your queries.
- Tags: add and filter by tags.
- Collections: select results and save as named sets.
- Export: CSV for results/collections; copy/symlink files to a folder.
- Reveal/Open: open top results in your OS file browser.
- Map: plot photos with GPS EXIF.
- Look‑alikes: find similar photos via perceptual hash and resolve groups.
- Workspace: search across multiple folders you add in Preferences.
- OCR (optional): extract text in images and boost recall for text‑heavy photos.
- Multi-folder: add extra folders; build indexes and search across all.
- Thumbnails cache: faster browsing and search result rendering.
- Engines: choose On-device (default), On-device (Fast, transformers), Hugging Face Cloud, or OpenAI (Captions) — cloud options are opt-in and may be slower/paid.
- Date filters + timeline: filter search by a date range and view a tiny year histogram of results.
 - Fast search (optional): Annoy, FAISS, and HNSW indices for large libraries. If a library is missing, search falls back to exact automatically. Build from the Search tab > Speed.

Quick Start
1. Create a virtual environment and install requirements:
   - `python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Run the app:
   - `streamlit run app.py`
4. Optional engines
   - Hugging Face Cloud: `pip install requests`
   - On-device (Fast): `pip install transformers`
   - OpenAI (Captions): `pip install openai`
   - Fast search (optional): `pip install annoy` (for Annoy), `pip install faiss-cpu` (platform dependent), `pip install hnswlib`
   - OCR (optional): `pip install easyocr` (language packs may be required)
3. In the sidebar:
   - Provide the photo directory path.
   - Click “Index / Update Photos” to build or refresh the index.
   - Use the Search tab to type queries like: "friends having tea" (supports Top-K, min-score filter, Favorites, Saved searches, Tags, Date range, CSV export, and “Reveal” in OS).
   - Use the Browse tab to page through all indexed images (choose grid columns), and “Show only Favorites”. Thumbnails are cached for speed.
   - In the sidebar > More folders: add extra folders (one per line). Use “Build / Update (all folders)” and enable “Search across all folders” in the Search tab.
   - Use “Clear Index” to remove the saved index for the folder.

Preferences
- The app remembers your last folder, batch size, and grid columns in `~/.photo_search/classic_prefs.json`.

Index Storage
- Each indexed folder gets a subfolder `.photo_index/clip-ViT-B-32` containing:
  - `paths.json`: ordered list of file paths and modified times.
  - `embeddings.npy`: float32 CLIP image embeddings aligned to `paths.json` order.

Notes
- First run downloads the CLIP model; allow time and network access.
- CPU works; GPU (if present) is used automatically by PyTorch.
- For thousands of photos, indexing can take time; it’s incremental based on file modified times.
