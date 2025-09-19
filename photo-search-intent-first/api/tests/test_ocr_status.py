from pathlib import Path
from fastapi.testclient import TestClient

from domain.models import MODEL_NAME
from server import app  # type: ignore
import json


def test_ocr_status_not_ready(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    r = client.get('/ocr/status', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('ready') is False


def test_ocr_status_ready(tmp_path: Path) -> None:
    client = TestClient(app)
    d = tmp_path / 'photos'
    d.mkdir()
    idxdir = d / '.photo_index' / MODEL_NAME
    idxdir.mkdir(parents=True, exist_ok=True)
    content = { 'paths': ['a.jpg','b.jpg'], 'texts': ['hello', ''] }
    (idxdir / 'ocr_texts.json').write_text(json.dumps(content), encoding='utf-8')
    r = client.get('/ocr/status', params={'dir': str(d)})
    assert r.status_code == 200
    js = r.json()
    assert js.get('ready') is True
    assert js.get('count') == 1
