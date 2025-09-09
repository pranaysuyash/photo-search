from __future__ import annotations

import json
import os
import secrets
import hashlib
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any


SHARES_DIR = Path(__file__).resolve().parents[1] / "api" / "shares"


@dataclass
class ShareRecord:
    token: str
    created: str  # ISO8601 UTC
    expires: Optional[str]  # ISO8601 UTC or None
    dir: str
    provider: str
    paths: List[str]
    view_only: bool = True
    salt: Optional[str] = None
    pass_hash: Optional[str] = None

    def to_json(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def from_json(d: Dict[str, Any]) -> "ShareRecord":
        return ShareRecord(
            token=str(d["token"]),
            created=str(d["created"]),
            expires=d.get("expires"),
            dir=str(d["dir"]),
            provider=str(d.get("provider", "local")),
            paths=[str(p) for p in d.get("paths", [])],
            view_only=bool(d.get("view_only", True)),
            salt=d.get("salt"),
            pass_hash=d.get("pass_hash"),
        )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _from_hours(hours: Optional[int]) -> Optional[str]:
    if not hours or hours <= 0:
        return None
    return _to_iso(datetime.now(timezone.utc) + timedelta(hours=hours))


def init_store() -> None:
    SHARES_DIR.mkdir(parents=True, exist_ok=True)


def _hash_password(pw: str, salt: str) -> str:
    h = hashlib.sha256()
    h.update((salt + pw).encode("utf-8"))
    return h.hexdigest()


def create_share(dir: str, provider: str, paths: List[str], expiry_hours: Optional[int] = None, password: Optional[str] = None, view_only: bool = True) -> ShareRecord:
    init_store()
    token = secrets.token_urlsafe(16)
    created = _now_iso()
    expires = _from_hours(expiry_hours)
    salt: Optional[str] = None
    phash: Optional[str] = None
    if password:
        salt = secrets.token_hex(8)
        phash = _hash_password(password, salt)
    rec = ShareRecord(
        token=token,
        created=created,
        expires=expires,
        dir=dir,
        provider=provider,
        paths=paths,
        view_only=view_only,
        salt=salt,
        pass_hash=phash,
    )
    _save_record(rec)
    return rec


def _record_path(token: str) -> Path:
    return SHARES_DIR / f"{token}.json"


def _save_record(rec: ShareRecord) -> None:
    p = _record_path(rec.token)
    p.write_text(json.dumps(rec.to_json(), indent=2))


def load_share(token: str) -> Optional[ShareRecord]:
    p = _record_path(token)
    if not p.exists():
        return None
    try:
        return ShareRecord.from_json(json.loads(p.read_text()))
    except Exception:
        return None


def is_expired(rec: ShareRecord) -> bool:
    if not rec.expires:
        return False
    try:
        exp = datetime.fromisoformat(rec.expires)
        now = datetime.now(timezone.utc)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return now > exp
    except Exception:
        return False


def validate_password(rec: ShareRecord, password: Optional[str]) -> bool:
    if not rec.pass_hash:
        return True
    if not password:
        return False
    if not rec.salt:
        return False
    return _hash_password(password, rec.salt) == rec.pass_hash


def list_shares(dir_filter: Optional[str] = None) -> List[ShareRecord]:
    init_store()
    out: List[ShareRecord] = []
    try:
        for f in SHARES_DIR.glob("*.json"):
            try:
                rec = ShareRecord.from_json(json.loads(f.read_text()))
                if dir_filter and Path(rec.dir).resolve() != Path(dir_filter).resolve():
                    continue
                out.append(rec)
            except Exception:
                continue
    except Exception:
        return []
    # sort newest first
    try:
        out.sort(key=lambda r: r.created, reverse=True)
    except Exception:
        pass
    return out


def revoke_share(token: str) -> bool:
    p = _record_path(token)
    if not p.exists():
        return False
    try:
        p.unlink()
        return True
    except Exception:
        return False
