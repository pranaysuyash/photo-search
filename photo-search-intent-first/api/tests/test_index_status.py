from pathlib import Path
from fastapi.testclient import TestClient

from domain.models import MODEL_NAME

DEFAULT_CLIP_INDEX_KEY = "st-clip-ViT-B-32"
from server import app  # type: ignore


def test_index_status_idle(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    # No status file -> idle with possible total (0)
    r = client.get('/index/status', params={'dir': str(d), 'provider': 'clip'})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('idle', 'unknown')


def test_index_status_reads_file(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    # Create index status file
    idxdir = d / '.photo_index' / DEFAULT_CLIP_INDEX_KEY
    idxdir.mkdir(parents=True, exist_ok=True)
    (idxdir / 'index_status.json').write_text('{"state":"running","target":100,"insert_done":20,"insert_total":100}', encoding='utf-8')
    r = client.get('/index/status', params={'dir': str(d), 'provider': 'clip'})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('idle', 'running', 'paused', 'complete')
    assert isinstance(js.get('target'), int)
