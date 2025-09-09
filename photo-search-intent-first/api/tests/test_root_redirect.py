from __future__ import annotations

from fastapi.testclient import TestClient


def test_root_redirects_to_app(client: TestClient):
    r = client.get('/')
    # Allow 200 if static is mounted differently, or redirect to /app/
    assert r.status_code in (200, 307, 308)
    if r.status_code in (307, 308):
        loc = r.headers.get('location', '')
        assert loc.endswith('/app/')

