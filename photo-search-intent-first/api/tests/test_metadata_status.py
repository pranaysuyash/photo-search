from pathlib import Path
from fastapi.testclient import TestClient
from photo_search_intent_first.api.server import app  # type: ignore


def test_metadata_status_idle(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    r = client.get('/metadata/status', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('idle', 'unknown')


def test_metadata_status_reads_file(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    idxdir = d / '.photo_index' / 'all-MiniLM-L6-v2'
    idxdir.mkdir(parents=True, exist_ok=True)
    (idxdir / 'metadata_status.json').write_text('{"state":"running","total":100,"done":25}', encoding='utf-8')
    r = client.get('/metadata/status', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('state') in ('running', 'complete')
    assert isinstance(js.get('total'), int)
