import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple, Optional

import numpy as np
from PIL import Image, UnidentifiedImageError

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff"}
MODEL_NAME = "clip-ViT-B-32"


def list_images(root: Path) -> List[Path]:
    images = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden directories and index folder
        dirnames[:] = [d for d in dirnames if not d.startswith('.') and d != '.photo_index']
        for fn in filenames:
            ext = Path(fn).suffix.lower()
            if ext in SUPPORTED_EXTS:
                images.append(Path(dirpath) / fn)
    images.sort()
    return images


def safe_open_image(path: Path) -> Optional[Image.Image]:
    try:
        img = Image.open(path)
        # Convert to RGB for model compatibility
        if img.mode != "RGB":
            img = img.convert("RGB")
        return img
    except (UnidentifiedImageError, OSError):
        return None


def load_model(device: Optional[str] = None):
    # Import lazily to avoid hard dependency during dummy tests
    from sentence_transformers import SentenceTransformer  # type: ignore
    model = SentenceTransformer(MODEL_NAME, device=device)
    return model


@dataclass
class IndexPaths:
    paths: List[str]
    mtimes: List[float]


from typing import Optional


class IndexStore:
    def __init__(self, photo_root: Path, index_key: Optional[str] = None):
        self.photo_root = Path(photo_root).expanduser().resolve()
        key = (index_key or MODEL_NAME).replace("/", "_").replace(" ", "-")
        self.index_dir = self.photo_root / ".photo_index" / key
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.paths_file = self.index_dir / "paths.json"
        self.embeddings_file = self.index_dir / "embeddings.npy"
        self.ocr_texts_file = self.index_dir / "ocr_texts.json"
        self.ocr_embeds_file = self.index_dir / "ocr_embeddings.npy"
        self.cap_texts_file = self.index_dir / "cap_texts.json"
        self.cap_embeds_file = self.index_dir / "cap_embeddings.npy"

        self.paths: list[str] = []
        self.mtimes: list[float] = []
        self.embeddings: Optional[np.ndarray] = None

    def load(self) -> None:
        if self.paths_file.exists() and self.embeddings_file.exists():
            with open(self.paths_file, "r") as f:
                data = json.load(f)
            self.paths = data.get("paths", [])
            self.mtimes = data.get("mtimes", [0.0] * len(self.paths))
            try:
                self.embeddings = np.load(self.embeddings_file)
            except Exception:
                self.embeddings = None
        else:
            self.paths, self.mtimes, self.embeddings = [], [], None

    # --- Fast search (Annoy) ---
    def _ann_path(self) -> Path:
        return self.index_dir / "annoy.index"

    def ann_status(self) -> dict:
        p = self._ann_path()
        exists = p.exists()
        dim = int(self.embeddings.shape[1]) if (self.embeddings is not None and self.embeddings.ndim == 2) else None
        return {"exists": exists, "path": str(p), "dim": dim}

    def build_annoy(self, trees: int = 50) -> bool:
        self.load()
        if self.embeddings is None or len(self.embeddings) == 0:
            return False
        try:
            from annoy import AnnoyIndex  # type: ignore
        except Exception:
            return False
        dim = int(self.embeddings.shape[1])
        idx = AnnoyIndex(dim, metric='angular')
        for i, v in enumerate(self.embeddings):
            idx.add_item(i, v.tolist())
        idx.build(trees)
        idx.save(str(self._ann_path()))
        return True

    def search_annoy(self, model, query: str, top_k: int = 12) -> List[Tuple[str, float]]:
        self.load()
        if not self.paths or self.embeddings is None or len(self.embeddings) == 0:
            return []
        try:
            from annoy import AnnoyIndex  # type: ignore
        except Exception:
            return []
        dim = int(self.embeddings.shape[1])
        idx = AnnoyIndex(dim, metric='angular')
        if not idx.load(str(self._ann_path())):
            return []
        # Embed query
        try:
            q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        except Exception:
            if hasattr(model, "embed_text"):
                q_emb = model.embed_text(query)
            else:
                q_emb = model.encode([query])[0]
        k = max(1, min(top_k, len(self.paths)))
        ids, dists = idx.get_nns_by_vector(q_emb.tolist(), k, include_distances=True)
        out: List[Tuple[str, float]] = []
        for i, dist in zip(ids, dists):
            # Convert Annoy angular distance to cosine similarity: cos = 1 - d^2/2
            sim = 1.0 - float(dist) * float(dist) / 2.0
            out.append((self.paths[i], sim))
        return out

    # --- Fast search (FAISS) ---
    def _faiss_path(self) -> Path:
        return self.index_dir / "faiss.index"

    def faiss_status(self) -> dict:
        p = self._faiss_path()
        exists = p.exists()
        dim = int(self.embeddings.shape[1]) if (self.embeddings is not None and self.embeddings.ndim == 2) else None
        return {"exists": exists, "path": str(p), "dim": dim}

    def build_faiss(self) -> bool:
        self.load()
        if self.embeddings is None or len(self.embeddings) == 0:
            return False
        try:
            import faiss  # type: ignore
        except Exception:
            return False
        dim = int(self.embeddings.shape[1])
        index = faiss.IndexFlatIP(dim)
        index.add(self.embeddings.astype('float32'))
        faiss.write_index(index, str(self._faiss_path()))
        return True

    def search_faiss(self, model, query: str, top_k: int = 12) -> List[Tuple[str, float]]:
        self.load()
        if not self.paths or self.embeddings is None or len(self.embeddings) == 0:
            return []
        try:
            import faiss  # type: ignore
        except Exception:
            return []
        try:
            q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        except Exception:
            q_emb = model.embed_text(query) if hasattr(model, 'embed_text') else model.encode([query])[0]
        index = faiss.read_index(str(self._faiss_path()))
        k = max(1, min(top_k, len(self.paths)))
        D, I = index.search(q_emb.reshape(1, -1).astype('float32'), k)
        # Re-rank with exact to be safe
        sims = (self.embeddings @ q_emb).astype(float)
        cand = [(i, float(sims[i])) for i in I[0].tolist()]
        cand.sort(key=lambda x: -x[1])
        return [(self.paths[i], s) for i, s in cand[:k]]

    # --- Fast search (HNSW) ---
    def _hnsw_path(self) -> Path:
        return self.index_dir / "hnsw.index"

    def hnsw_status(self) -> dict:
        p = self._hnsw_path()
        exists = p.exists()
        dim = int(self.embeddings.shape[1]) if (self.embeddings is not None and self.embeddings.ndim == 2) else None
        return {"exists": exists, "path": str(p), "dim": dim}

    def build_hnsw(self, M: int = 16, ef_construction: int = 200) -> bool:
        self.load()
        if self.embeddings is None or len(self.embeddings) == 0:
            return False
        try:
            import hnswlib  # type: ignore
        except Exception:
            return False
        dim = int(self.embeddings.shape[1])
        E = self.embeddings.astype('float32')
        p = hnswlib.Index(space='cosine', dim=dim)
        p.init_index(max_elements=E.shape[0], ef_construction=ef_construction, M=M)
        p.add_items(E)
        p.set_ef(50)
        p.save_index(str(self._hnsw_path()))
        return True

    def search_hnsw(self, model, query: str, top_k: int = 12) -> List[Tuple[str, float]]:
        self.load()
        if not self.paths or self.embeddings is None or len(self.embeddings) == 0:
            return []
        try:
            import hnswlib  # type: ignore
        except Exception:
            return []
        try:
            q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        except Exception:
            q_emb = model.embed_text(query) if hasattr(model, 'embed_text') else model.encode([query])[0]
        dim = int(self.embeddings.shape[1])
        p = hnswlib.Index(space='cosine', dim=dim)
        p.load_index(str(self._hnsw_path()))
        p.set_ef(max(50, top_k))
        labels, distances = p.knn_query(q_emb.astype('float32'), k=max(1, min(top_k, len(self.paths))))
        labs = labels[0].tolist(); dists = distances[0].tolist()
        # Convert cosine distance to similarity
        sims_exact = (self.embeddings @ q_emb).astype(float)
        labs = sorted(labs, key=lambda i: -sims_exact[i])[:top_k]
        return [(self.paths[i], float(sims_exact[i])) for i in labs]

    def save(self) -> None:
        with open(self.paths_file, "w") as f:
            json.dump({"paths": self.paths, "mtimes": self.mtimes}, f)
        if self.embeddings is not None:
            np.save(self.embeddings_file, self.embeddings)

    def _embed_images(self, model, img_paths: List[Path], batch_size: int = 32) -> np.ndarray:
        images: list[Image.Image] = []
        valid_idx: list[int] = []
        for i, p in enumerate(img_paths):
            img = safe_open_image(p)
            if img is not None:
                images.append(img)
                valid_idx.append(i)
        if not images:
            return np.zeros((len(img_paths), model.get_sentence_embedding_dimension()), dtype=np.float32)
        embs = model.encode(images, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False, normalize_embeddings=True)
        # Map back to original order; non-openable images become zero vectors
        result = np.zeros((len(img_paths), embs.shape[1]), dtype=np.float32)
        for j, i in enumerate(valid_idx):
            result[i] = embs[j]
        return result

    def build_or_update(self, model, allowed_paths: Optional[Iterable[Path]] = None, batch_size: int = 32) -> Tuple[int, int]:
        """
        Returns (new_count, updated_count)
        """
        self.load()
        existing_map = {p: i for i, p in enumerate(self.paths)}

        if allowed_paths is None:
            all_paths = list_images(self.photo_root)
        else:
            all_paths = sorted([Path(p) for p in allowed_paths])

        # Detect new or modified files
        new_paths: list[Path] = []
        modified_idx: list[int] = []
        path_new_mtime: dict[str, float] = {}
        for p in all_paths:
            try:
                mtime = p.stat().st_mtime
            except FileNotFoundError:
                continue
            sp = str(p)
            path_new_mtime[sp] = mtime
            if sp not in existing_map:
                new_paths.append(p)
            else:
                i = existing_map[sp]
                if i < len(self.mtimes) and mtime > float(self.mtimes[i]) + 1e-6:
                    modified_idx.append(i)

        # Re-embed modified
        updated_count = 0
        if modified_idx and self.embeddings is not None and len(self.embeddings) == len(self.paths):
            paths_to_update = [Path(self.paths[i]) for i in modified_idx]
            new_embs = self._embed_images(model, paths_to_update, batch_size=batch_size)
            # Filter out any failures (zero vectors) by norm
            for j, i in enumerate(modified_idx):
                v = new_embs[j]
                if np.linalg.norm(v) > 0:
                    self.embeddings[i] = v
                    sp = self.paths[i]
                    self.mtimes[i] = path_new_mtime.get(sp, Path(sp).stat().st_mtime)
            updated_count = len(modified_idx)

        # Embed new
        new_count = 0
        if new_paths:
            new_embs = self._embed_images(model, new_paths, batch_size=batch_size)
            # Keep only non-zero vectors
            mask = [i for i in range(len(new_embs)) if np.linalg.norm(new_embs[i]) > 0]
            kept_embs = new_embs[mask] if len(mask) > 0 else np.zeros((0, new_embs.shape[1] if new_embs.ndim == 2 else 0), dtype=np.float32)
            kept_paths = [new_paths[i] for i in mask]
            kept_mtimes = [p.stat().st_mtime for p in kept_paths]
            if kept_embs.size > 0:
                if self.embeddings is None or len(self.paths) == 0:
                    self.embeddings = kept_embs
                    self.paths = [str(p) for p in kept_paths]
                    self.mtimes = kept_mtimes
                else:
                    self.embeddings = np.vstack([self.embeddings, kept_embs])
                    self.paths.extend([str(p) for p in kept_paths])
                    self.mtimes.extend(kept_mtimes)
                new_count = len(kept_paths)

        # Clean up removed files
        existing_set = {str(p) for p in all_paths}
        if self.paths and existing_set:
            keep: list[int] = [i for i, p in enumerate(self.paths) if p in existing_set]
            if len(keep) != len(self.paths):
                self.paths = [self.paths[i] for i in keep]
                self.mtimes = [self.mtimes[i] for i in keep]
                if self.embeddings is not None:
                    self.embeddings = self.embeddings[keep]

        self.save()
        return new_count, updated_count

    def search(self, model, query: str, top_k: int = 12) -> List[Tuple[str, float]]:
        if not self.paths or self.embeddings is None or len(self.embeddings) == 0:
            return []
        # Support ST encode or shim with embed_text
        try:
            q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        except Exception:
            if hasattr(model, "embed_text"):
                q_emb = model.embed_text(query)
            else:
                # fallback using encode without kwargs
                q_emb = model.encode([query])[0]
        sims = (self.embeddings @ q_emb).astype(np.float32)
        top_k = max(1, min(top_k, len(sims)))
        idx = np.argpartition(-sims, top_k - 1)[:top_k]
        idx = idx[np.argsort(-sims[idx])]
        return [(self.paths[i], float(sims[i])) for i in idx]

    def search_like(self, path: str, top_k: int = 12) -> List[Tuple[str, float]]:
        if not self.paths or self.embeddings is None or len(self.embeddings) == 0:
            return []
        try:
            i = self.paths.index(path)
        except ValueError:
            return []
        qv = self.embeddings[i]
        sims = (self.embeddings @ qv).astype(np.float32)
        k = max(1, min(top_k, len(sims)))
        idx = np.argpartition(-sims, k - 1)[:k]
        idx = idx[np.argsort(-sims[idx])]
        return [(self.paths[j], float(sims[j])) for j in idx]

    # --- OCR support (optional; uses EasyOCR if available) ---
    def ocr_available(self) -> bool:
        return self.ocr_texts_file.exists() and self.ocr_embeds_file.exists()

    def _embed_texts(self, model, texts: List[str]) -> np.ndarray:
        # Support both ST.encode and provider.embed_text
        try:
            # Batch encode
            arr = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return arr.astype('float32')
        except Exception:
            vecs = []
            for t in texts:
                if hasattr(model, 'embed_text'):
                    v = model.embed_text(t)
                else:
                    v = model.encode([t])[0]
                vecs.append(v)
            return np.vstack(vecs).astype('float32') if vecs else np.zeros((0, self.embeddings.shape[1] if self.embeddings is not None else 0), dtype='float32')

    def build_ocr(self, model, languages: Optional[List[str]] = None) -> int:
        try:
            import easyocr  # type: ignore
        except Exception:
            return 0
        self.load()
        if not self.paths or self.embeddings is None:
            return 0
        # Load existing texts if present
        texts = {}
        if self.ocr_texts_file.exists():
            try:
                import json
                with open(self.ocr_texts_file, 'r') as f:
                    d = json.load(f)
                texts = {p: t for p, t in zip(d.get('paths', []), d.get('texts', []))}
            except Exception:
                texts = {}
        reader = easyocr.Reader(languages or ['en'], gpu=False)
        updated = 0
        out_texts: List[str] = []
        for p in self.paths:
            tp = texts.get(p)
            if tp is not None:
                out_texts.append(tp)
                continue
            try:
                res = reader.readtext(p, detail=0)
                txt = " ".join(res).strip()
            except Exception:
                txt = ""
            texts[p] = txt
            out_texts.append(txt)
            updated += 1
        # Save texts and vectors
        try:
            import json
            with open(self.ocr_texts_file, 'w') as f:
                json.dump({"paths": self.paths, "texts": out_texts}, f)
        except Exception:
            pass
        try:
            O = self._embed_texts(model, out_texts)
            np.save(self.ocr_embeds_file, O)
        except Exception:
            pass
        return updated

    # --- Captions (optional; uses HF VLM pipeline) ---
    def captions_available(self) -> bool:
        return self.cap_texts_file.exists() and self.cap_embeds_file.exists()

    def build_captions(self, vlm, model) -> int:
        self.load()
        if not self.paths or self.embeddings is None:
            return 0
        import json
        texts = {}
        if self.cap_texts_file.exists():
            try:
                d = json.loads(self.cap_texts_file.read_text())
                texts = {p: t for p, t in zip(d.get('paths', []), d.get('texts', []))}
            except Exception:
                texts = {}
        updated = 0
        out_texts: List[str] = []
        for p in self.paths:
            tp = texts.get(p)
            if tp is not None:
                out_texts.append(tp)
                continue
            try:
                txt = vlm.caption_path(Path(p))
            except Exception:
                txt = ""
            texts[p] = txt
            out_texts.append(txt)
            updated += 1
        try:
            self.cap_texts_file.write_text(json.dumps({"paths": self.paths, "texts": out_texts}))
        except Exception:
            pass
        # Embed texts
        vecs: list[np.ndarray] = []
        for t in out_texts:
            if t:
                try:
                    vecs.append(model.embed_text(t))
                except Exception:
                    vecs.append(model.encode([t])[0])
            else:
                vecs.append(np.zeros((self.embeddings.shape[1],), dtype=np.float32))
        C = np.stack(vecs).astype(np.float32)
        np.save(self.cap_embeds_file, C)
        return updated
