from pathlib import Path
from typing import List, Optional

from domain.models import SearchResult
from infra.storage_factory import create_index_store, initialize_storage_sync
from adapters.provider_factory import get_provider


def search_photos(
    folder: Path,
    query: str,
    top_k: int = 12,
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    embedder=None,
) -> List[SearchResult]:
    embedder = embedder or get_provider(provider, hf_token=hf_token, openai_api_key=openai_api_key)
    store = create_index_store(folder, index_key=getattr(embedder, 'index_id', None))
    initialize_storage_sync(store)
    store.load()
    return store.search(embedder, query, top_k=top_k)
