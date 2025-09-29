#!/usr/bin/env python
"""API Parity Harness

Purpose:
    Compare the FastAPI route surface between the authoritative baseline
    (original_server.py) and the active refactored server (server.py)
    without altering application behavior.

Features (initial version):
    - Enumerate (method, path) pairs for both apps (excludes FastAPI internal docs routes)
    - Capture response_model (if declared) and nominal status_code
    - Generate a baseline snapshot (JSON) for the original server
    - Diff refactored vs baseline: missing, extra, changed response models / status codes
    - Emit machine-readable JSON diff + human summary

Future extensions (planned):
    - Capture simplified JSON schema shapes (hash of model schema)
    - Exercise one request per route to record actual runtime status codes
    - Allow approved exceptions list (whitelist file)

Usage:
    python scripts/api_parity.py --mode update-baseline
    python scripts/api_parity.py --mode check
    python scripts/api_parity.py --mode dump --app original|server

Baseline file:
    photo-search-intent-first/tests/api_parity_snapshot.json
Diff output (check mode):
    photo-search-intent-first/tests/api_parity_diff.json

Exit codes:
    0 = parity (no diffs) or successful dump/update
    1 = parity failure (differences detected) or unexpected error
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

from fastapi.routing import APIRoute

# Import baseline and refactored apps.
# These imports must remain local to allow future lazy loading or env guards.
try:
    from api import original_server as original_mod  # type: ignore
    from api import server as server_mod  # type: ignore
except Exception as e:  # pragma: no cover - import diagnostics
    print(f"ERROR: Failed importing servers: {e}", file=sys.stderr)
    sys.exit(1)


@dataclass(frozen=True)
class RouteInfo:
    method: str
    path: str
    name: str
    status_code: int
    response_model: Optional[str]

    def identity(self) -> Tuple[str, str]:  # (method, path)
        return (self.method, self.path)


def _qualname(obj: Any) -> Optional[str]:
    if obj is None:
        return None
    try:
        mod = getattr(obj, "__module__", "")
        name = getattr(obj, "__name__", None) or getattr(obj, "__class__", type(obj)).__name__
        return f"{mod}.{name}" if mod else name
    except Exception:
        return str(obj)


def extract_routes(app) -> List[RouteInfo]:  # type: ignore
    out: List[RouteInfo] = []
    for r in getattr(app, "routes", []):
        if not isinstance(r, APIRoute):  # Skip non-API routes (StaticFiles, websockets etc.)
            continue
        path = getattr(r, "path", "")
        if path.startswith("/openapi") or path.startswith("/docs") or path.startswith("/redoc"):
            continue
        # Filter out implicit methods to keep parity count deterministic
        methods = sorted(m for m in (r.methods or []) if m not in {"HEAD", "OPTIONS"})
        for m in methods:
            info = RouteInfo(
                method=m,
                path=path,
                name=r.name or "",
                status_code=(r.status_code or 200),
                response_model=_qualname(r.response_model),
            )
            out.append(info)
    # Deterministic ordering for stable snapshots
    out.sort(key=lambda ri: (ri.path, ri.method))
    return out


def load_snapshot(snapshot_path: Path) -> Dict[str, Any]:
    if not snapshot_path.exists():
        return {}
    try:
        return json.loads(snapshot_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")


def build_snapshot(routes: List[RouteInfo]) -> Dict[str, Any]:
    return {
        "count": len(routes),
        "routes": [asdict(r) for r in routes],
    }


def index_by_identity(routes: List[RouteInfo]) -> Dict[Tuple[str, str], RouteInfo]:
    return {r.identity(): r for r in routes}


def diff_snapshots(base: List[RouteInfo], candidate: List[RouteInfo]) -> Dict[str, Any]:
    base_idx = index_by_identity(base)
    cand_idx = index_by_identity(candidate)

    missing = [{"method": m, "path": p} for (m, p) in base_idx.keys() if (m, p) not in cand_idx]
    extra = [{"method": m, "path": p} for (m, p) in cand_idx.keys() if (m, p) not in base_idx]
    missing.sort(key=lambda x: (x["path"], x["method"]))
    extra.sort(key=lambda x: (x["path"], x["method"]))

    changed: List[Dict[str, Any]] = []
    for ident, base_route in base_idx.items():
        cand_route = cand_idx.get(ident)
        if not cand_route:
            continue
        deltas = {}
        if base_route.status_code != cand_route.status_code:
            deltas["status_code"] = {
                "base": base_route.status_code,
                "candidate": cand_route.status_code,
            }
        if base_route.response_model != cand_route.response_model:
            deltas["response_model"] = {
                "base": base_route.response_model,
                "candidate": cand_route.response_model,
            }
        if deltas:
            changed.append({"method": ident[0], "path": ident[1], **deltas})

    return {
        "summary": {
            "base_count": len(base),
            "candidate_count": len(candidate),
            "missing": len(missing),
            "extra": len(extra),
            "changed": len(changed),
        },
        "missing": missing,
        "extra": extra,
        "changed": changed,
    }


def human_summary(diff: Dict[str, Any]) -> str:
    s = diff.get("summary", {})
    lines = [
        "API PARITY CHECK",
        f"Baseline routes:  {s.get('base_count')}\nCandidate routes: {s.get('candidate_count')}",
        f"Missing: {s.get('missing')}  Extra: {s.get('extra')}  Changed: {s.get('changed')}",
    ]
    if s.get("missing") or s.get("extra") or s.get("changed"):
        lines.append("Status: FAIL (differences detected)")
    else:
        lines.append("Status: PASS (parity)")
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="API Parity Harness")
    parser.add_argument("--mode", choices=["check", "update-baseline", "dump"], default="check")
    parser.add_argument("--app", choices=["original", "server"], default="original", help="Used with --mode dump")
    parser.add_argument("--snapshot", default="photo-search-intent-first/tests/api_parity_snapshot.json")
    parser.add_argument("--diff-out", default="photo-search-intent-first/tests/api_parity_diff.json")
    args = parser.parse_args(argv)

    snapshot_path = Path(args.snapshot)
    diff_path = Path(args.diff_out)

    # Build current route inventories
    original_app = getattr(original_mod, "app", None)
    server_app = getattr(server_mod, "app", None)
    if original_app is None or server_app is None:
        print("ERROR: Could not locate FastAPI app objects.", file=sys.stderr)
        return 1

    original_routes = extract_routes(original_app)
    server_routes = extract_routes(server_app)

    if args.mode == "dump":
        target = original_routes if args.app == "original" else server_routes
        data = build_snapshot(target)
        print(json.dumps(data, indent=2))
        return 0

    if args.mode == "update-baseline":
        snap = build_snapshot(original_routes)
        write_json(snapshot_path, snap)
        print(f"Baseline snapshot written: {snapshot_path} (count={snap['count']})")
        return 0

    # mode == check
    base_data = load_snapshot(snapshot_path)
    if not base_data:
        print("WARNING: No baseline snapshot found. Run with --mode update-baseline first.", file=sys.stderr)
        # Fall back to treating original as baseline ephemeral snapshot
        base_routes = original_routes
    else:
        # Reconstruct base routes from snapshot for stable comparison even if original changed
        base_routes = [
            RouteInfo(
                method=r['method'],
                path=r['path'],
                name=r.get('name', ''),
                status_code=r.get('status_code', 200),
                response_model=r.get('response_model'),
            )
            for r in base_data.get('routes', [])
        ]

    diff = diff_snapshots(base_routes, server_routes)
    reverse_diff = diff_snapshots(server_routes, base_routes)  # Check for routes in server.py not in baseline
    write_json(diff_path, diff)
    print(human_summary(diff))
    
    if reverse_diff["summary"]["missing"]:
        print(f"\nADDITIONAL ROUTES in server.py (not in baseline): {reverse_diff['summary']['missing']}")
        for route in reverse_diff["missing"]:
            print(f"  + {route['method']} {route['path']}")
    
    if diff['summary']['missing'] or diff['summary']['extra'] or diff['summary']['changed']:
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
