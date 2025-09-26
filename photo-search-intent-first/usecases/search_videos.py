from pathlib import Path
from typing import List, Optional

from domain.models import SearchResult
from infra.video_index_store import VideoIndexStore
from adapters.provider_factory import get_provider


def search_videos(
    folder: Path,
    query: str,
    top_k: int = 12,
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    embedder=None,
) -> List[SearchResult]:
    """Search for videos using semantic search.

    For now, this returns all videos as we don't have video embeddings implemented yet.
    In a full implementation, this would use video embeddings to perform semantic search.
    """
    embedder = embedder or get_provider(provider, hf_token=hf_token, openai_api_key=openai_api_key)
    store = VideoIndexStore(folder, index_key=getattr(embedder, 'index_id', None))
    store.load()

    # For now, just return all videos (in a real implementation, we would perform
    # semantic search using video embeddings)
    results = []
    for i, video_path in enumerate(store.state.paths[:top_k]):
        # Assign dummy scores for now
        score = 1.0 - (i / len(store.state.paths)) if store.state.paths else 0.0
        results.append(SearchResult(path=Path(video_path), score=score))

    return results