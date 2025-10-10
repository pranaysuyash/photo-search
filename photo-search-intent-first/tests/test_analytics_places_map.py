import json
from pathlib import Path

from fastapi.testclient import TestClient

from api.server import app
from infra.index_store import IndexStore


def _write_exif(store: IndexStore, payload: dict) -> None:
    exif_path = store.index_dir / "exif_index.json"
    exif_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def test_analytics_places_returns_clustered_data(tmp_path: Path) -> None:
    library_dir = tmp_path / "library"
    library_dir.mkdir()

    store = IndexStore(library_dir)
    payload = {
        "paths": [
            str(library_dir / "one.jpg"),
            str(library_dir / "two.jpg"),
            str(library_dir / "three.jpg"),
            str(library_dir / "four.jpg"),
        ],
        "gps_lat": [37.7749, 37.7751, 48.8566, None],
        "gps_lon": [-122.4194, -122.4189, 2.3522, 12.4922],
        "place": ["San Francisco", "San Francisco", "Paris", ""],
    }
    _write_exif(store, payload)

    response = TestClient(app).get(
        "/api/analytics/places",
        params={
            "dir": str(library_dir),
            "limit": 2,
            "sample_per_location": 1,
        },
    )

    assert response.status_code == 200
    data = response.json()

    assert data["total_with_coordinates"] == 3
    assert data["total_without_coordinates"] == 1
    assert len(data["locations"]) == 2
    # Locations are sorted by count (San Francisco first)
    first_location = data["locations"][0]
    assert first_location["name"] == "San Francisco"
    assert first_location["count"] == 2
    assert len(first_location["sample_points"]) == 1
    assert first_location["approximate_radius_km"] >= 0.0

    second_location = data["locations"][1]
    assert second_location["name"].startswith("48.857") or second_location["name"] == "Paris"

    # Points list honours the limit parameter
    assert len(data["points"]) == 2
    for point in data["points"]:
        assert set(point.keys()) == {"path", "lat", "lon", "place"}


def test_analytics_places_when_no_exif(tmp_path: Path) -> None:
    library_dir = tmp_path / "library"
    library_dir.mkdir()
    IndexStore(library_dir)  # Ensure index directory structure exists

    response = TestClient(app).get(
        "/api/analytics/places",
        params={"dir": str(library_dir)},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_with_coordinates"] == 0
    assert data["total_without_coordinates"] == 0
    assert data["locations"] == []
    assert data["points"] == []
