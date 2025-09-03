from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

import numpy as np

from infra.index_store import IndexStore
from domain.models import SearchResult


APP_DIR = Path.home() / ".photo_search"


class WorkspaceIndex:
    def __init__(self, provider_id: str) -> None:
        safe = provider_id.replace("/", "_").replace(" ", "-").replace(":", "-")
        self.base = APP_DIR / "workspace_index" / safe
        self.base.mkdir(parents=True, exist_ok=True)
        self.paths_file = self.base / "paths.json"
        self.emb_file = self.base / "embeddings.npy"
        self.ann_file = self.base / "annoy.index"
        self.ann_meta = self.base / "annoy.meta.json"
        self.faiss_file = self.base / "faiss.index"
        self.faiss_meta = self.base / "faiss.meta.json"
        self.hnsw_file = self.base / "hnsw.index"
        self.hnsw_meta = self.base / "hnsw.meta.json"

    def build_from_stores(self, stores: List[IndexStore]) -> Tuple[int, int]:
        paths: List[str] = []
        embs: List[np.ndarray] = []
        for s in stores:
            if s.state.embeddings is not None and len(s.state.embeddings) > 0:
                paths.extend(s.state.paths)
                embs.append(s.state.embeddings)
        if not embs:
            # Clear any previous index
            try:
                if self.paths_file.exists():
                    self.paths_file.unlink()
                if self.emb_file.exists():
                    self.emb_file.unlink()
            except Exception:
                pass
            return (0, 0)
        E = np.vstack(embs).astype("float32")
        self.paths_file.write_text(json.dumps({"paths": paths}))
        np.save(self.emb_file, E)
        return (len(paths), E.shape[1])

    def _load_paths(self) -> List[str]:
        if self.paths_file.exists():
            try:
                return json.loads(self.paths_file.read_text()).get("paths", [])
            except Exception:
                return []
        return []

    def annoy_status(self) -> dict:
        ok = self.ann_file.exists() and self.ann_meta.exists()
        meta = {}
        if ok:
            try:
                meta = json.loads(self.ann_meta.read_text())
            except Exception:
                ok = False
        return {"exists": ok, **meta}

    def faiss_status(self) -> dict:
        ok = self.faiss_file.exists() and self.faiss_meta.exists()
        meta = {}
        if ok:
            try:
                meta = json.loads(self.faiss_meta.read_text())
            except Exception:
                ok = False
        return {"exists": ok, **meta}

    def build_annoy(self, trees: int = 50) -> bool:
        try:
            from annoy import AnnoyIndex
        except Exception:
            return False
        if not self.emb_file.exists():
            return False
        E = np.load(self.emb_file)
        if E.size == 0:
            return False
        dim = int(E.shape[1])
        ann = AnnoyIndex(dim, metric="angular")
        for i, v in enumerate(E):
            ann.add_item(i, v.tolist())
        ann.build(trees)
        ann.save(str(self.ann_file))
        self.ann_meta.write_text(json.dumps({"dim": dim, "size": len(E), "trees": trees}))
        return True

    def search_annoy(self, embedder, query: str, top_k: int = 12) -> List[SearchResult]:
        try:
            from annoy import AnnoyIndex
        except Exception:
            return []
        status = self.annoy_status()
        if not status.get("exists"):
            return []
        q = embedder.embed_text(query)
        ann = AnnoyIndex(status.get("dim", q.shape[0]), metric="angular")
        if not ann.load(str(self.ann_file)):
            return []
        k = max(1, min(top_k, status.get("size", top_k)))
        idx, _ = ann.get_nns_by_vector(q.tolist(), k, include_distances=True)
        paths = self._load_paths()
        # Re-rank using exact scores
        E = np.load(self.emb_file)
        sims = (E @ q).astype(float)
        idx = sorted(idx, key=lambda i: -sims[i])[:k]
        return [SearchResult(path=Path(paths[i]), score=float(sims[i])) for i in idx]

    def build_faiss(self) -> bool:
        try:
            import faiss  # type: ignore
        except Exception:
            return False
        if not self.emb_file.exists():
            return False
        E = np.load(self.emb_file)
        if E.size == 0:
            return False
        dim = int(E.shape[1])
        index = faiss.IndexFlatIP(dim)
        index.add(E.astype("float32"))
        faiss.write_index(index, str(self.faiss_file))
        self.faiss_meta.write_text(json.dumps({"dim": dim, "size": len(E)}))
        return True

    def search_faiss(self, embedder, query: str, top_k: int = 12) -> List[SearchResult]:
        try:
            import faiss  # type: ignore
        except Exception:
            return []
        status = self.faiss_status()
        if not status.get("exists"):
            return []
        q = embedder.embed_text(query).astype("float32")
        index = faiss.read_index(str(self.faiss_file))
        k = max(1, min(top_k, status.get("size", top_k)))
        D, I = index.search(q.reshape(1, -1), k)
        E = np.load(self.emb_file)
        sims = (E @ q).astype(float)
        paths = self._load_paths()
        # Re-rank
        idx = I[0].tolist()
        idx = sorted(idx, key=lambda i: -sims[i])[:k]
        return [SearchResult(path=Path(paths[i]), score=float(sims[i])) for i in idx]

    def search_exact(self, embedder, query: str, top_k: int = 12) -> List[SearchResult]:
        if not self.emb_file.exists():
            return []
        q = embedder.embed_text(query)
        E = np.load(self.emb_file)
        sims = (E @ q).astype(float)
        k = max(1, min(top_k, len(sims)))
        idx = np.argpartition(-sims, k - 1)[:k]
        idx = idx[np.argsort(-sims[idx])]
        paths = self._load_paths()
        return [SearchResult(path=Path(paths[i]), score=float(sims[i])) for i in idx]

    # HNSW support
    def hnsw_status(self) -> dict:
        ok = self.hnsw_file.exists() and self.hnsw_meta.exists()
        meta = {}
        if ok:
            try:
                meta = json.loads(self.hnsw_meta.read_text())
            except Exception:
                ok = False
        return {"exists": ok, **meta}

    def build_hnsw(self, M: int = 16, ef_construction: int = 200) -> bool:
        try:
            import hnswlib  # type: ignore
        except Exception:
            return False
        if not self.emb_file.exists():
            return False
        E = np.load(self.emb_file)
        if E.size == 0:
            return False
        dim = int(E.shape[1])
        p = hnswlib.Index(space='cosine', dim=dim)
        p.init_index(max_elements=E.shape[0], ef_construction=ef_construction, M=M)
        p.add_items(E.astype('float32'))
        p.set_ef(50)
        p.save_index(str(self.hnsw_file))
        self.hnsw_meta.write_text(json.dumps({"dim": dim, "size": len(E), "M": M, "ef_construction": ef_construction}))
        return True

    def search_hnsw(self, embedder, query: str, top_k: int = 12) -> List[SearchResult]:
        try:
            import hnswlib  # type: ignore
        except Exception:
            return self.search_exact(embedder, query, top_k=top_k)
        status = self.hnsw_status()
        if not status.get('exists'):
            return self.search_exact(embedder, query, top_k=top_k)
        q = embedder.embed_text(query).astype('float32')
        p = hnswlib.Index(space='cosine', dim=status.get('dim', q.shape[0]))
        p.load_index(str(self.hnsw_file))
        p.set_ef(max(50, top_k))
        labels, distances = p.knn_query(q, k=min(top_k, status.get('size', top_k)))
        labs = labels[0].tolist()
        # Re-rank with exact
        E = np.load(self.emb_file)
        exact = (E @ q).astype(float)
        labs = sorted(labs, key=lambda i: -exact[i])[:top_k]
        paths = self._load_paths()
        return [SearchResult(path=Path(paths[i]), score=float(exact[i])) for i in labs]
