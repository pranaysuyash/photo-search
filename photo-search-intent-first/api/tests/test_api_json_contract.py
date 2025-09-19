from __future__ import annotations

from pathlib import Path

from infra.index_store import IndexStore
import server


def ensure_index_dir(base: Path) -> Path:
    index_dir = base / ".photo_index"
    index_dir.mkdir(parents=True, exist_ok=True)
    return index_dir


def test_index_pause_resume_accepts_json(tmp_path, client):
    ensure_index_dir(tmp_path)

    pause = client.post("/index/pause", json={"dir": str(tmp_path)})
    assert pause.status_code == 200
    assert pause.json().get("ok") is True

    resume = client.post("/index/resume", json={"dir": str(tmp_path)})
    assert resume.status_code == 200
    assert resume.json().get("ok") is True


def test_scan_count_accepts_json(tmp_path, client):
    sample_dir = tmp_path / "photos"
    sample_dir.mkdir()
    (sample_dir / "image.jpg").write_bytes(b"fake")

    resp = client.post(
        "/scan_count",
        json={"paths": [str(sample_dir)], "include_videos": False},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert "total_files" in payload
    assert payload["total_files"] >= 0


def test_analytics_log_accepts_json(tmp_path, client):
    index_dir = ensure_index_dir(tmp_path)

    resp = client.post(
        "/analytics/log",
        json={
            "dir": str(tmp_path),
            "type": "unit-test",
            "data": {"source": "json-contract"},
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}

    log_path = IndexStore(tmp_path).index_dir / "analytics.jsonl"
    assert log_path.exists()
    contents = log_path.read_text(encoding="utf-8").strip().splitlines()
    assert any("unit-test" in line for line in contents)


def test_monitoring_post_allows_unauthenticated_requests(client):
    original_token = server._API_TOKEN
    original_dev_no_auth = server._DEV_NO_AUTH
    server._API_TOKEN = "unit-test-token"
    server._DEV_NO_AUTH = False
    try:
        resp = client.post("/monitoring", json={"ping": True})
        assert resp.status_code == 200
        payload = resp.json()
        assert payload.get("ok") is True

        resp_api = client.post("/api/monitoring", json={"ping": True})
        assert resp_api.status_code == 200
        payload_api = resp_api.json()
        assert payload_api.get("ok") is True
    finally:
        server._API_TOKEN = original_token
        server._DEV_NO_AUTH = original_dev_no_auth


def test_health_endpoint_reports_uptime(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload.get("ok") is True
    assert "uptime_seconds" in payload and isinstance(payload["uptime_seconds"], (int, float))
