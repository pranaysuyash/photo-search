from pathlib import Path
import json, time

from infra.trips import build_trips


def test_trips_from_exif_index(tmp_path: Path) -> None:
    # Create fake exif_index.json with two clusters by time/place
    idx_dir = tmp_path / ".photo_index" / "dummy"
    idx_dir.mkdir(parents=True, exist_ok=True)
    exif = {
        "paths": [],
        "gps_lat": [],
        "gps_lon": [],
        "place": [],
    }
    paths = []
    mtimes = []
    now = time.time()
    for i in range(3):
        p = str(tmp_path / f"tripA_{i}.jpg")
        Path(p).write_bytes(b"x")
        paths.append(p)
        mtimes.append(now - 86400 * 10 + i)  # 10 days ago cluster
        exif["paths"].append(p); exif["gps_lat"].append(37.77); exif["gps_lon"].append(-122.42); exif["place"].append("San Francisco")
    for i in range(2):
        p = str(tmp_path / f"tripB_{i}.jpg")
        Path(p).write_bytes(b"y")
        paths.append(p)
        mtimes.append(now - 86400 * 2 + i)  # 2 days ago cluster
        exif["paths"].append(p); exif["gps_lat"].append(34.05); exif["gps_lon"].append(-118.24); exif["place"].append("Los Angeles")

    (idx_dir / 'exif_index.json').write_text(json.dumps(exif))
    out = build_trips(idx_dir, paths, mtimes)
    trips = out.get("trips", [])
    assert isinstance(trips, list)
    assert len(trips) >= 2  # two clusters expected

