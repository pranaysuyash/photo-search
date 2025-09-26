from typing import List, Optional, Sequence, Tuple, Union, Callable, Literal

import concurrent.futures as _fut
import logging
import os
import time
from functools import lru_cache

import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer

import threading
try:
    import faiss  # type: ignore
    HAS_FAISS = True
except Exception:
    faiss = None  # type: ignore
    HAS_FAISS = False

from pathlib import Path

from adapters.fs_scanner import safe_open_image


logger = logging.getLogger(__name__)


@lru_cache(maxsize=4)
def _cached_sentence_transformer(name: str, device: Optional[str]) -> SentenceTransformer:
    return SentenceTransformer(name, device=device)


class ClipEmbedding:
    def __init__(self, model_name: str = "clip-ViT-B-32", device: Optional[str] = None) -> None:
        # Honor offline mode and local cache directory if provided
        offline = os.getenv("OFFLINE_MODE", "").lower() in ("1", "true", "yes")
        local_dir = os.getenv("PHOTOVAULT_MODEL_DIR") or os.getenv("SENTENCE_TRANSFORMERS_HOME")
        if local_dir:
            os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", local_dir)
        if offline:
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
        # Load model; if a local_dir exists, try that path first
        try_names = [model_name]
        if local_dir:
            try_names.insert(0, os.path.join(local_dir, model_name))
        errors: dict[str, str] = {}
        self.model = None  # type: ignore
        for name in try_names:
            try:
                self.model = _cached_sentence_transformer(name, device)
                break
            except Exception as e:  # keep trying
                errors[name] = f"{type(e).__name__}: {e}"
                self.model = None  # type: ignore
        if self.model is None:  # type: ignore
            tried = ", ".join(try_names)
            raise RuntimeError(
                f"Failed to load SentenceTransformer model '{model_name}'. Tried: {tried}. Errors: {errors}"
            )
        self._index_id = f"st-{model_name}-{self.model.get_sentence_embedding_dimension()}d"

    def _auto_batch_size(self, n: int, default: int = 32) -> int:
        """Pick a conservative batch size based on device and workload."""
        try:
            dev = getattr(self.model, 'device', None)
            dev_str = str(dev) if dev is not None else ''
        except Exception:
            dev_str = ''
        # If GPU/Metal is present, we can be a bit more aggressive
        if 'cuda' in dev_str or 'mps' in dev_str:
            if n >= 256:
                return 128
            if n >= 64:
                return 64
            return max(default, 48)
        # CPU path: keep it modest
        if n >= 256:
            return 32
        if n >= 64:
            return 24
        return min(default, 24)

    @property
    def dim(self) -> int:
        return self.model.get_sentence_embedding_dimension()

    @property
    def index_id(self) -> str:
        return self._index_id

    @property
    def device(self) -> str:
        try:
            dev = getattr(self.model, 'device', None)
            return str(dev) if dev is not None else 'cpu'
        except Exception:
            return 'cpu'

    def _open_images_parallel(self, paths: list[Path], max_workers: int) -> tuple[list[Image.Image], list[int]]:
        images: list[Image.Image] = []
        valid_idx: list[int] = []
        # Fast path: single-threaded if workers == 0
        if max_workers <= 0:
            for i, p in enumerate(paths):
                img = safe_open_image(p)
                if img is not None:
                    try:
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                        valid_idx.append(i)
                    except Exception:
                        pass
            return images, valid_idx
        def _load(i_p: tuple[int, Path]):
            i, p = i_p
            img = safe_open_image(p)
            if img is None:
                return None
            try:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                return (i, img)
            except Exception:
                return None
        with _fut.ThreadPoolExecutor(max_workers=max_workers) as ex:
            for res in ex.map(_load, enumerate(paths)):
                if res is None:
                    continue
                i, img = res
                valid_idx.append(i)
                images.append(img)
        return images, valid_idx

    def embed_images(
        self,
        paths: Sequence[Union[Path, str]],
        batch_size: Optional[int] = None,
        normalize: bool = True,
        num_workers: Optional[int] = None,
        stop_event: Optional[threading.Event] = None,
        progress_cb: Optional[Callable[[dict], None]] = None,
        out_dtype: Literal["float32", "float16"] = "float32",
    ) -> np.ndarray:
        # Normalize input and decide batch size
        path_list: list[Path] = [Path(p) for p in paths]
        eff_bs = self._auto_batch_size(len(path_list)) if batch_size is None else batch_size
        if num_workers is None:
            cpu = os.cpu_count() or 1
            # prefer I/O parallelism for CPU, keep low for GPU to avoid dispatch contention
            if 'cuda' in self.device or 'mps' in self.device:
                eff_workers = min(2, max(0, cpu - 1))
            else:
                eff_workers = max(1, min(4, cpu // 2))
        else:
            eff_workers = max(0, num_workers)

        total = len(path_list)
        if progress_cb:
            progress_cb({"phase": "load_start", "total": total})

        images: list[Image.Image] = []
        valid_idx: list[int] = []
        if eff_workers <= 0:
            for i, p in enumerate(path_list):
                if stop_event and stop_event.is_set():
                    break
                img = safe_open_image(p)
                if img is not None:
                    try:
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                        valid_idx.append(i)
                    except Exception:
                        pass
                if progress_cb:
                    progress_cb({"phase": "load", "done": len(valid_idx), "total": total})
        else:
            def _load(i_p: tuple[int, Path]):
                i, p = i_p
                if stop_event and stop_event.is_set():
                    return None
                img = safe_open_image(p)
                if img is None:
                    return None
                try:
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    return (i, img)
                except Exception:
                    return None
            with _fut.ThreadPoolExecutor(max_workers=eff_workers) as ex:
                for res in ex.map(_load, enumerate(path_list)):
                    if stop_event and stop_event.is_set():
                        break
                    if res is None:
                        continue
                    i, img = res
                    valid_idx.append(i)
                    images.append(img)
                    if progress_cb:
                        progress_cb(
                            {
                                "phase": "load",
                                "done": len(valid_idx),
                                "total": total,
                            }
                        )

        if stop_event and stop_event.is_set():
            if not images:
                return np.zeros((len(paths), self.dim), dtype=np.float32)
            if progress_cb:
                progress_cb(
                    {
                        "phase": "encode_skipped",
                        "valid": len(images),
                        "total": total,
                    }
                )
            return np.zeros((len(paths), self.dim), dtype=np.float32)

        if progress_cb:
            progress_cb(
                {
                    "phase": "encode_start",
                    "valid": len(images),
                    "total": total,
                    "batch_size": eff_bs,
                    "workers": eff_workers,
                }
            )

        embs = self.model.encode(
            images,
            batch_size=eff_bs,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=normalize,
            num_workers=eff_workers,
        )

        if progress_cb:
            progress_cb({"phase": "encode_done", "valid": len(images)})
        if embs.dtype != np.float32:
            embs = embs.astype(np.float32, copy=False)

        result = np.zeros((len(paths), embs.shape[1]), dtype=np.float32)
        for j, i in enumerate(valid_idx):
            result[i] = embs[j]

        if out_dtype == "float16":
            result = result.astype(np.float16, copy=False)

        # timing (debug):
        # print(
        #     f"embed_images: n={len(paths)} valid={len(valid_idx)} bs={eff_bs} "
        #     f"workers={eff_workers} took={time.perf_counter()-t0:.3f}s"
        # )
        return result

    def embed_images_compact(
        self,
        paths: Sequence[Union[Path, str]],
        batch_size: Optional[int] = None,
        normalize: bool = True,
        num_workers: Optional[int] = None,
        stop_event: Optional[threading.Event] = None,
        progress_cb: Optional[Callable[[dict], None]] = None,
        out_dtype: Literal["float32", "float16"] = "float32",
    ) -> Tuple[np.ndarray, list[int]]:
        """Return embeddings only for successfully opened images, plus their original indices.
        Useful to avoid allocating a full zero-padded matrix when most inputs are valid.
        """
        path_list: list[Path] = [Path(p) for p in paths]
        eff_bs = self._auto_batch_size(len(path_list)) if batch_size is None else batch_size
        if num_workers is None:
            cpu = os.cpu_count() or 1
            # prefer I/O parallelism for CPU, keep low for GPU to avoid dispatch contention
            if 'cuda' in self.device or 'mps' in self.device:
                eff_workers = min(2, max(0, cpu - 1))
            else:
                eff_workers = max(1, min(4, cpu // 2))
        else:
            eff_workers = max(0, num_workers)

        total = len(path_list)
        if progress_cb:
            progress_cb({"phase": "load_start", "total": total})

        images: list[Image.Image] = []
        valid_idx: list[int] = []
        if eff_workers <= 0:
            for i, p in enumerate(path_list):
                if stop_event and stop_event.is_set():
                    break
                img = safe_open_image(p)
                if img is not None:
                    try:
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        images.append(img)
                        valid_idx.append(i)
                    except Exception:
                        pass
                if progress_cb:
                    progress_cb({"phase": "load", "done": len(valid_idx), "total": total})
        else:
            def _load(i_p: tuple[int, Path]):
                i, p = i_p
                if stop_event and stop_event.is_set():
                    return None
                img = safe_open_image(p)
                if img is None:
                    return None
                try:
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    return (i, img)
                except Exception:
                    return None
            with _fut.ThreadPoolExecutor(max_workers=eff_workers) as ex:
                for res in ex.map(_load, enumerate(path_list)):
                    if stop_event and stop_event.is_set():
                        break
                    if res is None:
                        continue
                    i, img = res
                    valid_idx.append(i)
                    images.append(img)
                    if progress_cb:
                        progress_cb({"phase": "load", "done": len(valid_idx), "total": total})

        if not images:
            return np.zeros((0, self.dim), dtype=np.float32), []
        embs = self.model.encode(
            images,
            batch_size=eff_bs,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=normalize,
            num_workers=eff_workers,
        )
        if progress_cb:
            progress_cb({"phase": "encode_done", "valid": len(images)})
        if embs.dtype != np.float32:
            embs = embs.astype(np.float32, copy=False)
        if out_dtype == "float16":
            embs = embs.astype(np.float16, copy=False)
        return embs, valid_idx

    def embed_text(
        self,
        query: str,
        normalize: bool = True,
        num_workers: Optional[int] = None,
    ) -> np.ndarray:
        return self.model.encode(
            [query],
            convert_to_numpy=True,
            normalize_embeddings=normalize,
        )[0]

    def embed_texts(
        self,
        queries: Sequence[str],
        normalize: bool = True,
        num_workers: Optional[int] = None,
    ) -> np.ndarray:
        return self.model.encode(
            list(queries),
            convert_to_numpy=True,
            normalize_embeddings=normalize,
        )

    def build_faiss_index(
        self,
        paths: Sequence[Union[Path, str]],
        metric: Literal["ip", "l2"] = "ip",
        chunk_size: int = 1024,
        batch_size: Optional[int] = None,
        num_workers: Optional[int] = None,
        stop_event: Optional[threading.Event] = None,
        progress_cb: Optional[Callable[[dict], None]] = None,
    ):
        """Stream embeddings into a FAISS index in chunks to keep memory flat.
        Returns (index, valid_indices), where valid_indices map rows in the index back to the original `paths`.
        Requires faiss to be installed.
        """
        if not HAS_FAISS:
            raise RuntimeError("faiss is not available. Install faiss to use build_faiss_index().")
        if metric not in ("ip", "l2"):
            raise ValueError("metric must be 'ip' or 'l2'")
        dim = self.dim
        if metric == "ip":
            index = faiss.IndexFlatIP(dim)  # type: ignore
        else:
            index = faiss.IndexFlatL2(dim)  # type: ignore
        total = len(paths)
        added = 0
        global_valid: list[int] = []
        if progress_cb:
            progress_cb({"phase": "index_start", "total": total, "dim": dim, "metric": metric})
        # Iterate over chunks of paths
        for start in range(0, total, chunk_size):
            if stop_event and stop_event.is_set():
                if progress_cb:
                    progress_cb({"phase": "index_cancelled", "added": added, "total": total})
                break
            end = min(total, start + chunk_size)
            chunk = paths[start:end]
            embs, valid_idx = self.embed_images_compact(
                chunk,
                batch_size=batch_size,
                num_workers=num_workers,
                normalize=(metric == "ip"),  # cosine/IP prefers normalized
                stop_event=stop_event,
                progress_cb=progress_cb,
            )
            if embs.size == 0 or len(valid_idx) == 0:
                if progress_cb:
                    progress_cb(
                        {
                            "phase": "index_add_skip",
                            "chunk_start": start,
                            "chunk_end": end,
                        }
                    )
                continue
            # add to index
            faiss_embs = embs.astype(np.float32, copy=False)
            index.add(faiss_embs)  # type: ignore
            # map valid indices to global positions
            global_valid.extend([start + i for i in valid_idx])
            added += len(valid_idx)
            if progress_cb:
                progress_cb(
                    {
                        "phase": "index_add_chunk",
                        "added": added,
                        "chunk": [start, end],
                    }
                )
        if progress_cb:
            progress_cb({"phase": "index_done", "added": added, "total": total})
        return index, global_valid


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    parser = argparse.ArgumentParser(description="Benchmark ClipEmbedding throughput")
    parser.add_argument("paths", nargs="+", help="Image files or a directory to scan")
    parser.add_argument("--model", default="clip-ViT-B-32")
    parser.add_argument("--device", default=None)
    parser.add_argument("--bs", type=int, default=0, help="Batch size (0 = auto)")
    parser.add_argument("--workers", type=int, default=-1, help="Num workers (-1 = auto)")
    parser.add_argument("--max", type=int, default=512, help="Max images to benchmark")
    args = parser.parse_args()

    from pathlib import Path as _P

    files: list[_P] = []
    for p in args.paths:
        pp = _P(p)
        if pp.is_dir():
            files.extend(
                [
                    x
                    for x in pp.rglob("*")
                    if x.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
                ]
            )
        elif pp.is_file():
            files.append(pp)
    files = files[: args.max]
    if not files:
        logger.error("No images found.")
        raise SystemExit(2)

    emb = ClipEmbedding(args.model, args.device)
    bs = None if args.bs == 0 else args.bs
    workers = None if args.workers < 0 else args.workers

    def pb(event: dict) -> None:
        phase = event.get("phase")
        if phase in {"load_start", "encode_start", "encode_done"}:
            logger.debug("progress_event=%s", event)

    t0 = time.perf_counter()
    arr = emb.embed_images(
        files,
        batch_size=bs,
        num_workers=workers,
        progress_cb=pb,
    )
    dt = time.perf_counter() - t0
    n = len(files)
    logger.info(
        "Embedded %s images in %.3fs -> %.1f img/s, shape=%s, device=%s",
        n,
        dt,
        n / dt if dt else 0.0,
        arr.shape,
        emb.device,
    )

    if HAS_FAISS:
        idx, valid = emb.build_faiss_index(
            files,
            metric="ip",
            chunk_size=max(64, bs or 64),
            batch_size=bs,
            num_workers=workers,
            progress_cb=pb,
        )
        logger.info("FAISS index size=%s, valid_mapped=%s", idx.ntotal, len(valid))
