from pathlib import Path
from typing import Tuple, Optional

from adapters.video_scanner import list_videos
from infra.video_index_store import VideoIndexStore
from adapters.video_processor import extract_video_thumbnail, get_video_duration
from adapters.provider_factory import get_provider


def index_videos(
    folder: Path,
    batch_size: int = 32,
    provider: str = "local",
    hf_token: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    embedder=None,
) -> Tuple[int, int, int]:
    """Build or update the video index for a folder.

    Returns (new_count, updated_count, total_count)
    """
    embedder = embedder or get_provider(provider, hf_token=hf_token, openai_api_key=openai_api_key)
    store = VideoIndexStore(folder, index_key=getattr(embedder, 'index_id', None))
    store.load()
    
    videos = list_videos(folder)
    new_count = 0
    updated_count = 0
    
    # Process each video
    for video in videos:
        video_path = str(video.path)
        thumbnail_path = store.get_thumbnail_path(video_path)
        
        # Check if video is already indexed
        if video_path in store.state.paths:
            idx = store.state.paths.index(video_path)
            # Check if video has been modified
            if video.mtime > store.state.mtimes[idx]:
                # Update existing video entry
                store.state.mtimes[idx] = video.mtime
                # Regenerate thumbnail
                if extract_video_thumbnail(video.path, thumbnail_path):
                    store.state.thumbnails[idx] = str(thumbnail_path)
                updated_count += 1
        else:
            # Add new video entry
            store.state.paths.append(video_path)
            store.state.mtimes.append(video.mtime)
            
            # Generate thumbnail
            if extract_video_thumbnail(video.path, thumbnail_path):
                store.state.thumbnails.append(str(thumbnail_path))
            else:
                store.state.thumbnails.append("")
                
            new_count += 1
    
    # Save the updated index
    store.save()
    total = len(store.state.paths)
    
    return new_count, updated_count, total