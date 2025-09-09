import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np
from domain.models import MODEL_NAME, Video


@dataclass
class VideoIndexState:
    paths: List[str]
    mtimes: List[float]
    embeddings: Optional[np.ndarray]
    thumbnails: List[str]  # Paths to thumbnail images


def _sanitize_key(key: str) -> str:
    return (
        key.replace("/", "_")
        .replace(" ", "-")
        .replace(":", "-")
        .replace("|", "-")
    )


class VideoIndexStore:
    def __init__(self, root: Path, index_key: Optional[str] = None) -> None:
        self.root = Path(root).expanduser().resolve()
        key = _sanitize_key(index_key or MODEL_NAME)
        self.index_dir = self.root / ".video_index" / key
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.paths_file = self.index_dir / "paths.json"
        self.embeddings_file = self.index_dir / "embeddings.npy"
        self.thumbnails_file = self.index_dir / "thumbnails.json"

        # Initialize state
        self.state = VideoIndexState(
            paths=[],
            mtimes=[],
            embeddings=None,
            thumbnails=[]
        )

    def load(self) -> None:
        """Load the video index from disk."""
        if self.paths_file.exists():
            with open(self.paths_file, "r") as f:
                data = json.load(f)
            self.state.paths = data.get("paths", [])
            self.state.mtimes = data.get("mtimes", [0.0] * len(self.state.paths))
            self.state.thumbnails = data.get("thumbnails", [])
            
        if self.embeddings_file.exists():
            try:
                self.state.embeddings = np.load(self.embeddings_file)
            except Exception:
                self.state.embeddings = None

    def save(self) -> None:
        """Save the video index to disk."""
        with open(self.paths_file, "w") as f:
            json.dump({
                "paths": self.state.paths,
                "mtimes": self.state.mtimes,
                "thumbnails": self.state.thumbnails
            }, f)
            
        if self.state.embeddings is not None:
            np.save(self.embeddings_file, self.state.embeddings)

    def get_thumbnail_path(self, video_path: str) -> Path:
        """Get the path where a video's thumbnail should be stored."""
        video_name = Path(video_path).stem
        return self.index_dir / f"{video_name}_thumb.jpg"
        
    def upsert(self, embedder, videos: List[Video], batch_size: int = 32) -> Tuple[int, int]:
        """Upsert videos into the index, computing embeddings if needed.
        
        Returns (new_count, updated_count)
        """
        self.load()
        existing_map = {p: i for i, p in enumerate(self.state.paths)}
        
        new_items: List[Video] = []
        modified_indices: List[int] = []
        path_new_mtime: Dict[str, float] = {}
        
        # Determine which videos are new or modified
        for video in videos:
            sp = str(video.path)
            path_new_mtime[sp] = video.mtime
            if sp not in existing_map:
                new_items.append(video)
            else:
                idx = existing_map[sp]
                if idx < len(self.state.mtimes) and video.mtime > float(self.state.mtimes[idx]) + 1e-6:
                    modified_indices.append(idx)
        
        # Update modified videos
        updated_count = 0
        if modified_indices and self.state.embeddings is not None and len(self.state.embeddings) == len(self.state.paths):
            # TODO: Re-embed modified videos
            updated_count = len(modified_indices)
            # Update mtimes for modified items
            for idx in modified_indices:
                sp = self.state.paths[idx]
                self.state.mtimes[idx] = path_new_mtime.get(sp, Path(sp).stat().st_mtime)
        
        # Insert new videos
        new_count = 0
        if new_items:
            # TODO: Embed new videos
            # For now, just add them to the index without embeddings
            for video in new_items:
                self.state.paths.append(str(video.path))
                self.state.mtimes.append(video.mtime)
                self.state.thumbnails.append(str(self.get_thumbnail_path(str(video.path))))
            new_count = len(new_items)
        
        # Prune removed files
        video_set = {str(v.path) for v in videos}
        if self.state.paths and video_set:
            keep = [i for i, p in enumerate(self.state.paths) if p in video_set]
            if len(keep) != len(self.state.paths):
                self.state.paths = [self.state.paths[i] for i in keep]
                self.state.mtimes = [self.state.mtimes[i] for i in keep]
                self.state.thumbnails = [self.state.thumbnails[i] for i in keep]
                if self.state.embeddings is not None:
                    self.state.embeddings = self.state.embeddings[keep]
        
        self.save()
        return new_count, updated_count
        
    def add_video(self, video_path: str, metadata: dict, mtime: float) -> None:
        """Add a single video to the index with metadata."""
        if video_path not in self.state.paths:
            self.state.paths.append(video_path)
            self.state.mtimes.append(mtime)
            self.state.thumbnails.append(str(self.get_thumbnail_path(video_path)))
        else:
            # Update existing video
            idx = self.state.paths.index(video_path)
            self.state.mtimes[idx] = mtime
            
    def search(self, embedder, query: str, top_k: int = 12) -> List[Video]:
        """Search for videos semantically similar to the query."""
        if not self.state.paths or self.state.embeddings is None or len(self.state.embeddings) == 0:
            return []
        
        try:
            q = embedder.embed_text(query)
            E = self.state.embeddings
            sims = (E @ q).astype(float)
            k = max(1, min(top_k, len(sims)))
            idx = np.argpartition(-sims, k - 1)[:k]
            idx = idx[np.argsort(-sims[idx])]
            return [Video(path=Path(self.state.paths[i]), mtime=self.state.mtimes[i]) for i in idx]
        except Exception:
            return []