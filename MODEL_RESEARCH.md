# Model Research – Vision and VLM Options

Objective: select efficient, high‑quality models for on‑device and optional cloud add‑ons to power captioning, tagging, OCR boosts, and similar‑by‑example in Photo Search (across macOS, Windows, Web via Electron + FastAPI).

## Summary Recommendations
- Local captioning (VLM): Qwen2‑VL or Qwen2.5‑VL 2B/7B Instruct
  - Tradeoff: 2B runs on more CPUs/low‑VRAM; 7B is stronger with GPU, GGUF quant available
  - Use for: captions that improve recall, optional Q&A over photos
- Local image embeddings: SigLIP/CLIP (OpenCLIP ViT‑g/L‑14, SigLIP ViT‑SO400M)
  - Tradeoff: SigLIP has strong zero‑shot performance; CLIP is broadly compatible
  - Use for: indexing, search, neighbors (core path today)
- Cloud add‑ons (opt‑in): OpenAI (GPT‑4o mini) or Gemini 1.5 Flash for captions/tags
  - Use for: users who want top quality without local setup; always clearly labeled
- OCR: EasyOCR (local) with language list, Tesseract as fallback
  - Use for: text‑in‑image boosts merged into ranking

## Notable VLMs (Hugging Face quick scan)
- Qwen2‑VL (and 2.5‑VL)
  - `Qwen/Qwen2-VL-2B-Instruct` – small VLM, good for CPU-constrained
  - `Qwen/Qwen2-VL-7B-Instruct` – stronger quality, GPU recommended
  - `Qwen/Qwen2.5-VL-7B-Instruct` – latest iteration; active ecosystem; GGUF variants exist
- Apple FastVLM (new, Apple AML)
  - `apple/FastVLM-7B`, `apple/FastVLM-1.5B`, `apple/FastVLM-0.5B` (plus int8/int4/coreml/onnx)
  - Claim: single encoder, fast TTFT; early but promising; license: `apple-amlr`
  - Practical: watch for Transformers/ONNX runtimes and memory footprint on desktop
- Cambrian family (NYU VisionX)
  - `nyu-visionx/cambrian-13b` – research line; larger footprint
- Others worth tracking
  - MiniCPM‑V, LLaVA‑NeXT/OneVision, InternVL‑2, DeepSeek‑VL, Phi‑3.5‑Vision (smaller), Llava‑Qwen hybrids

## Image Embedding Models
- SigLIP
  - `google/siglip-base-patch16-224` and bigger ViT backbones; strong retrieval
- OpenCLIP
  - ViT‑L/14, ViT‑g/14 models; robust classic option; works with our CLIP flow
- EVA‑CLIP variants – stronger but heavier; consider for GPU

## Fit for Our Use Cases
- Captioning: prefer Qwen2‑VL‑2B (CPU viability) and 7B (GPU) local; cloud fallback via OpenAI/Gemini
- Tagging: derive tags from captions via light noun phrase extraction; optional label sets
- Similar‑by‑example: stick to CLIP/SigLIP embeddings (exact/ANN already shipped)
- OCR: EasyOCR now wired; weight blending implemented in IF; parity for Classic planned (done: build)

## Integration Plan
- Intent‑First
  - Add adapter: `adapters/embedding_vlm_caption_hf.py` to run `image-text-to-text` pipeline for Qwen2‑VL
  - Surface toggle in Advanced: “Local VLM captions (Qwen2‑VL)” with model select (2B/7B)
- Classic
  - Mirror adapter behind a thin service; gate via optional extras and clear UI toggle
  - Ensure timeouts and cancelation; never persist keys
- Add‑ons Marketplace
  - Cloud providers listed with friendly copy and usage caps; defaults to local disabled

## Benchmarks To Run (Backlog)
- Caption quality on mixed library (indoor/outdoor/people/text) – manual rated top‑N
- Latency: TTFT and per‑image caption throughput CPU vs. GPU
- Memory: peak RAM/VRAM for 2B vs. 7B; GGUF quant gains
- Impact on search recall when blending captions into index

## Risks
- Model size and cold‑start may frustrate CPU‑only users → default off, explain clearly
- Licenses vary: Apple AML vs. Apache‑2.0; ensure redistribution clauses understood
- WebGPU/WebNN not reliable across platforms yet; stick to desktop Electron runtime
