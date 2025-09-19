from pathlib import Path
from fastapi.testclient import TestClient

from domain.models import MODEL_NAME
from server import app  # type: ignore


def test_metadata_status_idle(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    r = client.get('/status/metadata', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('idle', 'unknown')


def test_metadata_status_reads_file(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    idxdir = d / '.photo_index' / MODEL_NAME
    idxdir.mkdir(parents=True, exist_ok=True)
    (idxdir / 'metadata_status.json').write_text('{"state":"running","total":100,"done":25}', encoding='utf-8')
    r = client.get('/status/metadata', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('idle', 'running', 'complete')
    assert isinstance(js.get('total'), int)
