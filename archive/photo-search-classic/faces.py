from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
from PIL import Image


def _faces_dir(index_dir: Path) -> Path:
    d = index_dir / "faces"
    d.mkdir(parents=True, exist_ok=True)
    return d


def faces_state_file(index_dir: Path) -> Path:
    return _faces_dir(index_dir) / "faces.json"


def faces_embeddings_file(index_dir: Path) -> Path:
    return _faces_dir(index_dir) / "faces_embeddings.npy"


def load_faces(index_dir: Path) -> Dict[str, Any]:
    p = faces_state_file(index_dir)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return {"photos": {}, "clusters": {}, "names": {}}
    return {"photos": {}, "clusters": {}, "names": {}}


def save_faces(index_dir: Path, data: Dict[str, Any]) -> None:
    p = faces_state_file(index_dir)
    p.write_text(json.dumps(data, indent=2))


def _try_insightface():
    try:
        from insightface.app import FaceAnalysis  # type: ignore
        return FaceAnalysis, True
    except Exception:
        return None, False


def _embed_faces_insightface(paths: List[str]) -> Tuple[Dict[str, List[Dict[str, Any]]], np.ndarray]:
    from insightface.app import FaceAnalysis  # type: ignore
    app = FaceAnalysis(providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    feats: List[np.ndarray] = []
    photo_map: Dict[str, List[Dict[str, Any]]] = {}
    for sp in paths:
        try:
            img = np.array(Image.open(sp).convert('RGB'))  # type: ignore
        except Exception:
            continue
        faces = app.get(img)
        items: List[Dict[str, Any]] = []
        for f in faces:
            emb = f.normed_embedding if hasattr(f, 'normed_embedding') else getattr(f, 'embedding', None)
            if emb is None:
                continue
            idx = len(feats)
            feats.append(np.array(emb, dtype=np.float32))
            box = getattr(f, 'bbox', None)
            if box is None and hasattr(f, 'bbox'):
                box = f.bbox
            if box is not None:
                x1, y1, x2, y2 = [int(max(0, b)) for b in box]
                w = max(1, x2 - x1); h = max(1, y2 - y1)
                items.append({"emb": idx, "bbox": [x1, y1, w, h]})
        if items:
            photo_map[sp] = items
    if feats:
        E = np.vstack(feats).astype('float32')
        n = np.linalg.norm(E, axis=1, keepdims=True) + 1e-9
        E = E / n
    else:
        E = np.zeros((0, 512), dtype=np.float32)
    return photo_map, E


def build_faces(index_dir: Path, photo_paths: List[str]) -> Dict[str, Any]:
    FaceAnalysis, ok = _try_insightface()
    if not ok:
        return {"updated": 0, "faces": 0, "clusters": 0}
    photos, E = _embed_faces_insightface(photo_paths)
    clusters: Dict[int, List[Tuple[str, int]]] = {}
    labels: List[int] = []
    if E.shape[0] > 0:
        try:
            from sklearn.cluster import DBSCAN  # type: ignore
            db = DBSCAN(eps=0.3, min_samples=3, metric='cosine')
            lab = db.fit_predict(E)
            labels = lab.tolist()
        except Exception:
            labels = [-1] * E.shape[0]
    else:
        labels = []
    face_idx = 0
    for sp, items in photos.items():
        for it in items:
            cid = int(labels[face_idx]) if face_idx < len(labels) else -1
            it["cluster"] = cid
            clusters.setdefault(cid, []).append((sp, it["emb"]))
            face_idx += 1
    data = {
        "photos": photos,
        "clusters": {str(k): v for k, v in clusters.items()},
        "names": load_faces(index_dir).get("names", {}),
    }
    save_faces(index_dir, data)
    np.save(faces_embeddings_file(index_dir), E)
    return {"updated": len(photos), "faces": int(E.shape[0]), "clusters": len(set(labels))}


def list_clusters(index_dir: Path) -> List[Dict[str, Any]]:
    data = load_faces(index_dir)
    names = data.get("names", {})
    items = []
    for k, lst in data.get("clusters", {}).items():
        try:
            size = len(lst)
        except Exception:
            size = 0
        items.append({"id": k, "size": size, "name": names.get(k, ""), "examples": lst[:4]})
    items.sort(key=lambda x: -x.get("size", 0))
    return items


def set_cluster_name(index_dir: Path, cluster_id: str, name: str) -> Dict[str, Any]:
    data = load_faces(index_dir)
    names = data.get("names", {})
    if name:
        names[str(cluster_id)] = name
    else:
        if str(cluster_id) in names:
            del names[str(cluster_id)]
    data["names"] = names
    save_faces(index_dir, data)
    return {"ok": True, "names": names}


def photos_for_person(index_dir: Path, person: str) -> List[str]:
    data = load_faces(index_dir)
    rev = {v: k for k, v in data.get("names", {}).items()}
    cid = rev.get(person)
    if cid is None:
        return []
    lst = data.get("clusters", {}).get(str(cid), [])
    return [p for (p, _) in lst]

