from __future__ import annotations

from pathlib import Path

from infra.shares import create_share, load_share, list_shares, validate_password, is_expired, revoke_share, SHARES_DIR


def test_create_and_load_share(tmp_path: Path):
    # Create a temporary dir to stand in for a photo library
    lib = tmp_path / 'lib'
    lib.mkdir()
    (lib / 'a.jpg').write_bytes(b'fake')
    (lib / 'b.jpg').write_bytes(b'fake')

    rec = create_share(str(lib), 'local', [str(lib / 'a.jpg'), str(lib / 'b.jpg')], expiry_hours=1, password='pw', view_only=True)
    assert rec.token
    p = SHARES_DIR / f"{rec.token}.json"
    assert p.exists()

    loaded = load_share(rec.token)
    assert loaded is not None
    assert loaded.token == rec.token
    assert loaded.view_only is True
    assert validate_password(loaded, 'pw') is True
    assert validate_password(loaded, 'wrong') is False
    assert is_expired(loaded) is False

    # list_shares should include our record
    items = list_shares()
    assert any(it.token == rec.token for it in items)

    # cleanup
    assert revoke_share(rec.token) is True
    assert not (SHARES_DIR / f"{rec.token}.json").exists()

