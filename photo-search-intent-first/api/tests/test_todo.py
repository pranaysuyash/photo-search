from __future__ import annotations

from fastapi.testclient import TestClient


def test_todo_endpoint(client: TestClient):
    r = client.get('/todo')
    assert r.status_code == 200
    data = r.json()
    assert 'text' in data
    assert isinstance(data['text'], str)

