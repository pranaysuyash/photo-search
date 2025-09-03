from pathlib import Path
from typing import Tuple, Optional

from adapters.fs_scanner import list_photos
from infra.index_store import IndexStore
from adapters.provider_factory import get_provider


def index_photos(
    folder: Path,
    batch_size: int = 32,
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    embedder=None,
) -> Tuple[int, int, int]:
    """Build or update the photo index for a folder.

    Returns (new_count, updated_count, total_count)
    """
    embedder = embedder or get_provider(provider, hf_token=hf_token, openai_api_key=openai_api_key)
    store = IndexStore(folder, index_key=getattr(embedder, 'index_id', None))
    photos = list_photos(folder)
    new_count, updated_count = store.upsert(embedder, photos, batch_size=batch_size)
    total = len(store.state.paths)
    return new_count, updated_count, total
