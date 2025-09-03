Photo Search – Roadmap (Intent‑First)

Short‑term (1–2 releases)
- Dupes UI: Visual diff and batch resolution; “Keep best” heuristics
- Favorites quick filters everywhere; bulk actions for collections
- HNSW option (added) alongside FAISS/Annoy; user choice in Advanced
- Tag management: autocomplete, rename/merge tags
- Better timeline and map clustering; hover popovers with thumb + open

Mid‑term
- Auto‑tagging (local first): broad categories; optional cloud captioning
- People (opt‑in): local face detection/embedding and clustering; name mapping
- Albums & Projects: light hierarchy; drag‑and‑drop when UI supports it
- Bulk rename/move/copy safely with templates; soft delete → system trash
- Similar photo finder from a seed (CLIP/SigLIP neighbors)

Performance & Indexing
- ANN menu: Exact / Annoy / FAISS / HNSW; evaluate ScaNN/NMSLIB if needed
- Workspace fast search: keep unified indices updated after builds
- Thumbnails: background precache with smart throttling

Model Exploration
- Embeddings: CLIP variants (ViT‑B/16, ViT‑L/14), SigLIP, OpenCLIP
- VLMs: local captioners (LLaVA family) + optional cloud; store captions
- OCR: multi‑language EasyOCR + Tesseract fallback

Principles
- Private by default; cloud is always opt‑in
- Friendly language and safe defaults; no destructive actions
- Intent‑first: prioritize flows that deliver real user outcomes

