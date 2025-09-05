import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np

from domain.models import MODEL_NAME, Photo, SearchResult


@dataclass
class IndexState:
    paths: list[str]
    mtimes: list[float]
    embeddings: Optional[np.ndarray]


def _sanitize_key(key: str) -> str:
    return (
        key.replace("/", "_")
        .replace(" ", "-")
        .replace(":", "-")
        .replace("|", "-")
    )


class IndexStore:
    def __init__(self, root: Path, index_key: Optional[str] = None) -> None:
        self.root = Path(root).expanduser().resolve()
        key = _sanitize_key(index_key or MODEL_NAME)
        self.index_dir = self.root / ".photo_index" / key
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.paths_file = self.index_dir / "paths.json"
        self.embeddings_file = self.index_dir / "embeddings.npy"
        self.ann_file = self.index_dir / "annoy.index"
        self.ann_meta_file = self.index_dir / "annoy.meta.json"
        self.faiss_file = self.index_dir / "faiss.index"
        self.faiss_meta_file = self.index_dir / "faiss.meta.json"
        self.hnsw_file = self.index_dir / "hnsw.index"
        self.hnsw_meta_file = self.index_dir / "hnsw.meta.json"
        self.ocr_texts_file = self.index_dir / "ocr_texts.json"
        self.ocr_embeds_file = self.index_dir / "ocr_embeddings.npy"
        self.cap_texts_file = self.index_dir / "cap_texts.json"
        self.cap_embeds_file = self.index_dir / "cap_embeddings.npy"

        self.state = IndexState(paths=[], mtimes=[], embeddings=None)

    def load(self) -> None:
        if self.paths_file.exists() and self.embeddings_file.exists():
            with open(self.paths_file, "r") as f:
                data = json.load(f)
            self.state.paths = data.get("paths", [])
            self.state.mtimes = data.get("mtimes", [0.0] * len(self.state.paths))
            try:
                self.state.embeddings = np.load(self.embeddings_file)
            except Exception:
                self.state.embeddings = None

    def save(self) -> None:
        with open(self.paths_file, "w") as f:
            json.dump({"paths": self.state.paths, "mtimes": self.state.mtimes}, f)
        if self.state.embeddings is not None:
            np.save(self.embeddings_file, self.state.embeddings)

    def upsert(self, embedder, photos: List[Photo], batch_size: int = 32) -> Tuple[int, int]:
        self.load()
        existing_map = {p: i for i, p in enumerate(self.state.paths)}

        new_items: list[Photo] = []
        modified_idx: list[int] = []
        path_new_mtime: dict[str, float] = {}
        for i, photo in enumerate(photos):
            sp = str(photo.path)
            path_new_mtime[sp] = photo.mtime
            if sp not in existing_map:
                new_items.append(photo)
            else:
                j = existing_map[sp]
                if j < len(self.state.mtimes) and photo.mtime > float(self.state.mtimes[j]) + 1e-6:
                    modified_idx.append(j)

        # Update modified
        updated_count = 0
        if modified_idx and self.state.embeddings is not None and len(self.state.embeddings) == len(self.state.paths):
            paths_to_update = [Path(self.state.paths[i]) for i in modified_idx]
            new_embs = embedder.embed_images(paths_to_update, batch_size=batch_size)
            for j, idx in enumerate(modified_idx):
                v = new_embs[j]
                if np.linalg.norm(v) > 0:
                    self.state.embeddings[idx] = v
                    sp = self.state.paths[idx]
                    self.state.mtimes[idx] = path_new_mtime.get(sp, Path(sp).stat().st_mtime)
            updated_count = len(modified_idx)

        # Insert new
        new_count = 0
        if new_items:
            new_embs = embedder.embed_images([p.path for p in new_items], batch_size=batch_size)
            # Keep only non-zero vectors
            mask = [i for i in range(len(new_embs)) if np.linalg.norm(new_embs[i]) > 0]
            kept_embs = new_embs[mask] if len(mask) > 0 else np.zeros((0, new_embs.shape[1] if new_embs.ndim == 2 else 0), dtype=np.float32)
            kept_items = [new_items[i] for i in mask]
            if kept_embs.size > 0:
                if self.state.embeddings is None or len(self.state.paths) == 0:
                    self.state.embeddings = kept_embs
                    self.state.paths = [str(p.path) for p in kept_items]
                    self.state.mtimes = [p.mtime for p in kept_items]
                else:
                    self.state.embeddings = np.vstack([self.state.embeddings, kept_embs])
                    self.state.paths.extend([str(p.path) for p in kept_items])
                    self.state.mtimes.extend([p.mtime for p in kept_items])
                new_count = len(kept_items)

        # Prune removed files
        photo_set = {str(p.path) for p in photos}
        if self.state.paths and photo_set:
            keep = [i for i, p in enumerate(self.state.paths) if p in photo_set]
            if len(keep) != len(self.state.paths):
                self.state.paths = [self.state.paths[i] for i in keep]
                self.state.mtimes = [self.state.mtimes[i] for i in keep]
                if self.state.embeddings is not None:
                    self.state.embeddings = self.state.embeddings[keep]

        self.save()
        return new_count, updated_count

    def search(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None) -> List[SearchResult]:
        if not self.state.paths or self.state.embeddings is None or len(self.state.embeddings) == 0:
            return []
        q = embedder.embed_text(query)
        E = self.state.embeddings
        if subset is not None and len(subset) > 0:
            E = E[subset]
        sims = (E @ q).astype(float)
        top_k = max(1, min(top_k, len(sims)))
        idx = np.argpartition(-sims, top_k - 1)[:top_k]
        idx = idx[np.argsort(-sims[idx])]
        if subset is not None and len(subset) > 0:
            idx = [subset[i] for i in idx]
            sims_sorted = [float((self.state.embeddings @ q)[i]) for i in idx]
            return [SearchResult(path=Path(self.state.paths[i]), score=sims_sorted[j]) for j, i in enumerate(idx)]
        return [SearchResult(path=Path(self.state.paths[i]), score=float((self.state.embeddings @ q)[i])) for i in idx]

    def search_like(self, embedder, path: str, top_k: int = 12, subset: Optional[list[int]] = None) -> list[SearchResult]:
        if self.state.embeddings is None or not self.state.paths:
            return []
        try:
            i = self.state.paths.index(path)
        except ValueError:
            return []
        q = self.state.embeddings[i]
        import numpy as _np
        E = self.state.embeddings if subset is None else self.state.embeddings[subset]
        sims = (E @ q).astype(float)
        k = max(1, min(top_k, len(sims)))
        idx = _np.argpartition(-sims, k - 1)[:k]
        idx = idx[_np.argsort(-sims[idx])]
        if subset:
            idx = [subset[i] for i in idx]
        return [SearchResult(path=Path(self.state.paths[i]), score=float((self.state.embeddings @ q)[i])) for i in idx]

    # OCR support (optional, uses EasyOCR if available; caches text and text-embeddings)
    def ocr_available(self) -> bool:
        return self.ocr_texts_file.exists() and self.ocr_embeds_file.exists()

    def build_ocr(self, embedder, languages: Optional[List[str]] = None) -> int:
        try:
            import easyocr  # type: ignore
        except Exception:
            return 0
        self.load()
        if not self.state.paths:
            return 0
        texts = {}
        if self.ocr_texts_file.exists():
            try:
                with open(self.ocr_texts_file, "r") as f:
                    d = json.load(f)
                texts = {p: t for p, t in zip(d.get("paths", []), d.get("texts", []))}
            except Exception:
                texts = {}
        reader = easyocr.Reader(languages or ["en"], gpu=False)
        updated = 0
        ocr_texts: list[str] = []
        for p, mtime in zip(self.state.paths, self.state.mtimes):
            t_prev = texts.get(p)
            if t_prev:
                ocr_texts.append(t_prev)
                continue
            try:
                res = reader.readtext(p, detail=0)
                txt = " ".join(res).strip()
            except Exception:
                txt = ""
            texts[p] = txt
            ocr_texts.append(txt)
            updated += 1
        # Save texts
        with open(self.ocr_texts_file, "w") as f:
            json.dump({"paths": self.state.paths, "texts": ocr_texts}, f)
        # Build text embeddings
        vecs: list[np.ndarray] = []
        for t in ocr_texts:
            if t:
                vecs.append(embedder.embed_text(t))
            else:
                vecs.append(np.zeros((self.state.embeddings.shape[1],), dtype=np.float32))
        O = np.stack(vecs).astype(np.float32)
        np.save(self.ocr_embeds_file, O)
        return updated

    def search_with_ocr(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None, weight_img: float = 0.5, weight_ocr: float = 0.5) -> List[SearchResult]:
        # Combine image similarity with OCR-text similarity
        base = self.search(embedder, query, top_k=top_k, subset=subset)
        if not self.ocr_available() or not self.state.paths:
            return base
        try:
            q = embedder.embed_text(query)
            E = self.state.embeddings
            T = np.load(self.ocr_embeds_file)
            if subset is not None and len(subset) > 0:
                E = E[subset]
                T = T[subset]
            sims_img = (E @ q).astype(float)
            sims_txt = (T @ q).astype(float)
            sims = weight_img * sims_img + weight_ocr * sims_txt
            k = max(1, min(top_k, len(sims)))
            idx = np.argpartition(-sims, k - 1)[:k]
            idx = idx[np.argsort(-sims[idx])]
            if subset is not None and len(subset) > 0:
                idx = [subset[i] for i in idx]
                sims_sorted = [float((weight_img * (self.state.embeddings @ q) + weight_ocr * np.load(self.ocr_embeds_file) @ q)[i]) for i in idx]
                return [SearchResult(path=Path(self.state.paths[i]), score=sims_sorted[j]) for j, i in enumerate(idx)]
            return [SearchResult(path=Path(self.state.paths[i]), score=float((self.state.embeddings @ q)[i] * weight_img + (np.load(self.ocr_embeds_file) @ q)[i] * weight_ocr)) for i in idx]
        except Exception:
            return base

    # Captions support (optional, uses VLM HF pipeline via adapters; caches text and text-embeddings)
    def captions_available(self) -> bool:
        return self.cap_texts_file.exists() and self.cap_embeds_file.exists()

    def build_captions(self, vlm, embedder) -> int:
        self.load()
        if not self.state.paths:
            return 0
        texts = {}
        if self.cap_texts_file.exists():
            try:
                d = json.loads(self.cap_texts_file.read_text())
                texts = {p: t for p, t in zip(d.get("paths", []), d.get("texts", []))}
            except Exception:
                texts = {}
        updated = 0
        out_texts: list[str] = []
        for p in self.state.paths:
            t_prev = texts.get(p)
            if t_prev:
                out_texts.append(t_prev)
                continue
            try:
                txt = vlm.caption_path(Path(p))
            except Exception:
                txt = ""
            texts[p] = txt
            out_texts.append(txt)
            updated += 1
        # Save text file
        try:
            self.cap_texts_file.write_text(json.dumps({"paths": self.state.paths, "texts": out_texts}))
        except Exception:
            pass
        # Save embeddings
        import numpy as _np
        vecs: list[_np.ndarray] = []
        for t in out_texts:
            if t:
                vecs.append(embedder.embed_text(t))
            else:
                dim = int(self.state.embeddings.shape[1]) if self.state.embeddings is not None else 0
                vecs.append(_np.zeros((dim,), dtype=_np.float32))
        C = _np.stack(vecs).astype(_np.float32)
        _np.save(self.cap_embeds_file, C)
        return updated

    def search_with_captions(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None, weight_img: float = 0.5, weight_cap: float = 0.5) -> List[SearchResult]:
        base = self.search(embedder, query, top_k=top_k, subset=subset)
        if not self.captions_available() or not self.state.paths:
            return base
        try:
            import numpy as _np
            q = embedder.embed_text(query)
            E = self.state.embeddings
            T = _np.load(self.cap_embeds_file)
            if subset is not None and len(subset) > 0:
                E = E[subset]
                T = T[subset]
            sims_img = (E @ q).astype(float)
            sims_txt = (T @ q).astype(float)
            sims = weight_img * sims_img + weight_cap * sims_txt
            k = max(1, min(top_k, len(sims)))
            idx = _np.argpartition(-sims, k - 1)[:k]
            idx = idx[_np.argsort(-sims[idx])]
            if subset is not None and len(subset) > 0:
                idx = [subset[i] for i in idx]
            # Return exact weighted scores for final ranking
            full_T = _np.load(self.cap_embeds_file)
            exact_img = (self.state.embeddings @ q).astype(float)
            exact_txt = (full_T @ q).astype(float)
            return [SearchResult(path=Path(self.state.paths[i]), score=float(weight_img * exact_img[i] + weight_cap * exact_txt[i])) for i in idx]
        except Exception:
            return base

    # HNSW (hnswlib) support
    def hnsw_status(self) -> dict:
        import json
        status = {"exists": self.hnsw_file.exists() and self.hnsw_meta_file.exists()}
        if status["exists"]:
            try:
                meta = json.loads(self.hnsw_meta_file.read_text())
                status.update(meta)
            except Exception:
                status["exists"] = False
        return status

    def build_hnsw(self, M: int = 16, ef_construction: int = 200) -> bool:
        try:
            import hnswlib  # type: ignore
        except Exception:
            return False
        if self.state.embeddings is None:
            self.load()
        if self.state.embeddings is None or len(self.state.embeddings) == 0:
            return False
        dim = int(self.state.embeddings.shape[1])
        import numpy as _np
        E = self.state.embeddings.astype('float32')
        p = hnswlib.Index(space='cosine', dim=dim)
        p.init_index(max_elements=E.shape[0], ef_construction=ef_construction, M=M)
        p.add_items(E)
        p.set_ef(50)
        p.save_index(str(self.hnsw_file))
        import json
        self.hnsw_meta_file.write_text(json.dumps({"dim": dim, "size": len(E), "M": M, "ef_construction": ef_construction}))
        return True

    def search_hnsw(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None) -> List[SearchResult]:
        # Subset not supported efficiently; fall back to exact if subset provided
        if subset:
            return self.search(embedder, query, top_k=top_k, subset=subset)
        try:
            import hnswlib  # type: ignore
        except Exception:
            return self.search(embedder, query, top_k=top_k)
        status = self.hnsw_status()
        if not status.get('exists'):
            return self.search(embedder, query, top_k=top_k)
        q = embedder.embed_text(query).astype('float32')
        p = hnswlib.Index(space='cosine', dim=status.get('dim', q.shape[0]))
        p.load_index(str(self.hnsw_file))
        p.set_ef(max(50, top_k))
        labels, distances = p.knn_query(q, k=min(top_k, status.get('size', top_k)))
        labs = labels[0].tolist()
        dists = distances[0].tolist()
        # Convert cosine distance to similarity
        sims = [1.0 - float(d) for d in dists]
        # Re-rank with exact dot-product for stability
        if self.state.embeddings is not None:
            exact = (self.state.embeddings @ q).astype(float)
            labs = sorted(labs, key=lambda i: -exact[i])[:top_k]
            return [SearchResult(path=Path(self.state.paths[i]), score=float(exact[i])) for i in labs]
        return [SearchResult(path=Path(self.state.paths[i]), score=sims[k]) for k, i in enumerate(labs)]

    # FAISS (optional) support
    def faiss_status(self) -> dict:
        import json
        status = {"exists": self.faiss_file.exists() and self.faiss_meta_file.exists()}
        if status["exists"]:
            try:
                meta = json.loads(self.faiss_meta_file.read_text())
                status.update(meta)
            except Exception:
                status["exists"] = False
        return status

    def build_faiss(self) -> bool:
        try:
            import faiss  # type: ignore
        except Exception:
            return False
        if self.state.embeddings is None:
            self.load()
        if self.state.embeddings is None or len(self.state.embeddings) == 0:
            return False
        dim = int(self.state.embeddings.shape[1])
        # Use inner product (cosine, since embeddings are normalized)
        index = faiss.IndexFlatIP(dim)
        index.add(self.state.embeddings.astype('float32'))
        faiss.write_index(index, str(self.faiss_file))
        import json
        self.faiss_meta_file.write_text(json.dumps({"dim": dim, "size": len(self.state.embeddings)}))
        return True

    def search_faiss(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None) -> List[SearchResult]:
        try:
            import faiss  # type: ignore
        except Exception:
            return self.search(embedder, query, top_k=top_k, subset=subset)
        status = self.faiss_status()
        if not status.get("exists"):
            return self.search(embedder, query, top_k=top_k, subset=subset)
        q = embedder.embed_text(query).astype('float32')
        dim = status.get("dim") or (self.state.embeddings.shape[1] if self.state.embeddings is not None else None)
        if dim is None:
            return []
        index = faiss.read_index(str(self.faiss_file))
        D, I = index.search(q.reshape(1, -1), min(max(1, top_k), status.get("size", top_k)))
        candidates = I[0].tolist()
        # Apply subset filter if provided
        if subset:
            cand_set = set(subset)
            candidates = [i for i in candidates if i in cand_set]
        if not candidates:
            return []
        # Re-rank with exact scores to be safe
        if self.state.embeddings is not None:
            sims = (self.state.embeddings @ q).astype(float)
            cand_scores = [(i, float(sims[i])) for i in candidates]
            cand_scores.sort(key=lambda x: -x[1])
            candidates = [i for i, _ in cand_scores[:top_k]]
        return [SearchResult(path=Path(self.state.paths[i]), score=float((self.state.embeddings @ q)[i])) for i in candidates]

    # Annoy (optional) support
    def ann_status(self) -> dict:
        import json
        status = {"exists": self.ann_file.exists() and self.ann_meta_file.exists()}
        if status["exists"]:
            try:
                meta = json.loads(self.ann_meta_file.read_text())
                status.update(meta)
            except Exception:
                status["exists"] = False
        return status

    def build_annoy(self, trees: int = 50) -> bool:
        try:
            from annoy import AnnoyIndex  # type: ignore
        except Exception:
            return False
        if self.state.embeddings is None:
            self.load()
        if self.state.embeddings is None or len(self.state.embeddings) == 0:
            return False
        E = self.state.embeddings.astype('float32')
        dim = int(E.shape[1])
        index = AnnoyIndex(dim, metric='angular')
        for i in range(E.shape[0]):
            index.add_item(i, E[i].tolist())
        index.build(max(1, int(trees)))
        index.save(str(self.ann_file))
        import json
        self.ann_meta_file.write_text(json.dumps({"dim": dim, "size": int(E.shape[0]), "trees": int(trees)}))
        return True

    def search_annoy(self, embedder, query: str, top_k: int = 12, subset: Optional[List[int]] = None) -> List[SearchResult]:
        # Subset not supported efficiently; fall back to exact for subset
        if subset:
            return self.search(embedder, query, top_k=top_k, subset=subset)
        try:
            from annoy import AnnoyIndex  # type: ignore
        except Exception:
            return self.search(embedder, query, top_k=top_k)
        status = self.ann_status()
        if not status.get('exists'):
            return self.search(embedder, query, top_k=top_k)
        dim = int(status.get('dim') or 0)
        if dim <= 0:
            return self.search(embedder, query, top_k=top_k)
        q = embedder.embed_text(query).astype('float32')
        idx = AnnoyIndex(dim, metric='angular')
        idx.load(str(self.ann_file))
        k = min(max(1, top_k), int(status.get('size', top_k)))
        # get_nns_by_vector returns labels (indices)
        labs = idx.get_nns_by_vector(q.tolist(), k, include_distances=False)
        # Re-rank using exact similarities if embeddings available
        if self.state.embeddings is not None:
            sims = (self.state.embeddings @ q).astype(float)
            labs = sorted(labs, key=lambda i: -sims[i])[:k]
            return [SearchResult(path=Path(self.state.paths[i]), score=float(sims[i])) for i in labs]
        # Fallback without exact rerank
        return [SearchResult(path=Path(self.state.paths[i]), score=1.0) for i in labs]

