from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_ping_endpoint(client: TestClient) -> None:
    r = client.get('/api/ping')
    assert r.status_code == 200
    data = r.json()
    assert data.get('ok') is True
