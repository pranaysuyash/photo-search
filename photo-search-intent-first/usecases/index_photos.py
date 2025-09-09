from pathlib import Path
from typing import Tuple, Optional

from adapters.fs_scanner import list_photos
from infra.index_store import IndexStore
from adapters.provider_factory import get_provider
import json, time


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

    # Prepare progress status file for UI polling
    status_path = store.index_dir / 'index_status.json'
    try:
        total = len(photos)
        existing = 0
        try:
            store.load()
            existing = len(store.state.paths or [])
        except Exception:
            existing = 0
        status = {
            'state': 'running',
            'start': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'target': int(total),
            'existing': int(existing),
            'updated_done': 0,
            'updated_total': 0,
            'insert_done': 0,
            'insert_total': 0,
        }
        status_path.parent.mkdir(parents=True, exist_ok=True)
        status_path.write_text(json.dumps(status), encoding='utf-8')
    except Exception:
        pass

    def _progress(ev: dict):
        try:
            # Update index_status.json with the latest chunk progress
            cur = {}
            try:
                cur = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {}
            except Exception:
                cur = {}
            if ev.get('phase') == 'update':
                cur['updated_done'] = int(ev.get('done') or 0)
                cur['updated_total'] = int(ev.get('total') or 0)
            if ev.get('phase') == 'insert':
                cur['insert_done'] = int(ev.get('done') or 0)
                cur['insert_total'] = int(ev.get('total') or 0)
            status_path.write_text(json.dumps(cur), encoding='utf-8')
            # Honor pause control between chunks
            try:
                ctrl_path = store.index_dir / 'index_control.json'
                wait_start = time.time()
                while ctrl_path.exists():
                    cfg = {}
                    try:
                        cfg = json.loads(ctrl_path.read_text(encoding='utf-8'))
                    except Exception:
                        cfg = {}
                    if cfg.get('pause'):
                        time.sleep(0.5)
                        # Update status to reflect paused state periodically
                        try:
                            cur2 = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {}
                        except Exception:
                            cur2 = {}
                        cur2['state'] = 'paused'
                        status_path.write_text(json.dumps(cur2), encoding='utf-8')
                        continue
                    break
                # If resumed, restore running state
                try:
                    cur3 = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {}
                except Exception:
                    cur3 = {}
                if cur3.get('state') == 'paused':
                    cur3['state'] = 'running'
                    status_path.write_text(json.dumps(cur3), encoding='utf-8')
            except Exception:
                pass
        except Exception:
            pass

    new_count, updated_count = store.upsert(embedder, photos, batch_size=batch_size, progress=_progress)
    total = len(store.state.paths)
    # Mark completion
    try:
        status = {
            'state': 'complete',
            'end': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'total': int(total),
            'new': int(new_count),
            'updated': int(updated_count),
        }
        status_path.write_text(json.dumps(status), encoding='utf-8')
    except Exception:
        pass
    return new_count, updated_count, total
