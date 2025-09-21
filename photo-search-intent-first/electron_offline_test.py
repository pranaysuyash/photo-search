#!/usr/bin/env python3
"""
Electron Offline Verification Script

Tests Electron-specific offline functionality and configuration.
Since the full Electron app may not be built yet, this script verifies:
1. CORS configuration for app:// protocol
2. Electron API detection logic
3. Offline service configuration

Usage:
    python electron_offline_test.py [--api-url URL]
"""

import os
import sys
import json
import requests
from pathlib import Path
from urllib.parse import urlparse
import tempfile
import numpy as np
from infra.index_store import IndexStore
from infra.collections import save_collections

try:
    import pytest
except ImportError:  # pragma: no cover - pytest unavailable in CLI mode
    class _PytestStub:  # type: ignore
        class skip:  # pylint: disable=too-few-public-methods
            class Exception(Exception):
                pass

        @staticmethod
        def skip(message: str) -> None:
            raise AssertionError(message)

    pytest = _PytestStub()  # type: ignore

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

def _perform_request(method: str, endpoint: str, api_url: str, **kwargs):
    """Perform request against API, falling back to in-process app when local."""
    url = f"{api_url}{endpoint}"
    try:
        return requests.request(method, url, **kwargs)
    except requests.exceptions.ConnectionError:
        parsed = urlparse(api_url)
        if parsed.hostname not in {"localhost", "127.0.0.1"}:
            pytest.skip(f"API server unavailable at {api_url}")

        # Fall back to in-process FastAPI app for local testing.
        from fastapi.testclient import TestClient
        from server import app  # type: ignore

        client = TestClient(app)
        client_kwargs = dict(kwargs)
        client_kwargs.pop("timeout", None)
        request_fn = getattr(client, method.lower())
        return request_fn(endpoint, **client_kwargs)


def test_cors_configuration(api_url="http://localhost:8000"):
    """Test that CORS is properly configured for Electron app:// protocol."""
    print("Testing CORS configuration for Electron...")

    try:
        # Test OPTIONS preflight request
        headers = {
            'Origin': 'app://local',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'content-type'
        }

        response = _perform_request("OPTIONS", "/models/capabilities", api_url, headers=headers)

        # Check if app://local is in allowed origins
        cors_headers = response.headers
        allowed_origins = cors_headers.get('Access-Control-Allow-Origin', '')

        if 'app://local' in allowed_origins or '*' in allowed_origins:
            print("✓ CORS configured for app://local origin")
            return

        message = f"✗ CORS not configured for app://local. Allowed origins: {allowed_origins}"
        print(message)
        raise AssertionError(message)

    except Exception as e:
        print(f"✗ CORS test failed: {e}")
        raise


def test_electron_api_endpoints(api_url="http://localhost:8000"):
    """Test Electron-specific API endpoints."""
    print("Testing Electron-specific API endpoints...")

    with tempfile.TemporaryDirectory() as tmpdir:
        assets_dir = Path(tmpdir)
        photo_path = assets_dir / "photo1.jpg"
        photo_path.write_text("fake", encoding="utf-8")

        store = IndexStore(assets_dir, index_key="st-clip-ViT-B-32")
        store.state.paths = [str(photo_path)]
        store.state.mtimes = [photo_path.stat().st_mtime]
        store.state.embeddings = np.zeros((1, 1), dtype=np.float32)
        store.save()
        save_collections(store.index_dir, {"Favorites": [str(photo_path)]})

        default_store = IndexStore(assets_dir)
        save_collections(default_store.index_dir, {"Favorites": [str(photo_path)]})

        endpoints = [
            ("/models/capabilities", {}),
            ("/library", {"dir": str(assets_dir), "provider": "clip"}),
            ("/collections", {"dir": str(assets_dir)}),
        ]

        failures = {}

        for endpoint, params in endpoints:
            try:
                # Test with Electron origin
                headers = {'Origin': 'app://local'}
                response = _perform_request("GET", endpoint, api_url, headers=headers, timeout=5, params=params)

                if response.status_code == 200:
                    print(f"✓ {endpoint} accessible (status: {response.status_code})")
                    try:
                        payload = response.json()
                    except Exception as exc:  # noqa: BLE001
                        failures[endpoint] = f"invalid json: {exc}"
                        continue

                    if endpoint == "/library":
                        expected_path = str(photo_path)
                        paths = payload.get("paths") or []
                        if expected_path not in paths:
                            failures[endpoint] = "missing indexed path"
                    elif endpoint == "/collections":
                        collections = payload.get("collections") or {}
                        if "Favorites" not in collections:
                            failures[endpoint] = "missing Favorites collection"
                else:
                    print(f"✗ {endpoint} failed (status: {response.status_code})")
                    failures[endpoint] = f"status {response.status_code}"

            except requests.exceptions.Timeout:
                print(f"✗ {endpoint} timed out")
                failures[endpoint] = "timeout"
            except requests.exceptions.ConnectionError:
                print(f"✗ Cannot connect to {endpoint}")
                failures[endpoint] = "connection error"
            except Exception as e:
                print(f"✗ {endpoint} error: {e}")
                failures[endpoint] = str(e)

        if failures:
            raise AssertionError(
                "Electron API endpoint checks failed: "
                + "; ".join(f"{ep} -> {reason}" for ep, reason in failures.items())
            )


def test_offline_service_configuration():
    """Test offline service configuration in the webapp."""
    print("Testing offline service configuration...")

    # Check if service worker exists
    sw_path = Path(__file__).parent / "webapp" / "public" / "service-worker.js"
    if not sw_path.exists():
        message = "Service worker not found"
        print(f"✗ {message}")
        raise AssertionError(message)

    try:
        with open(sw_path, 'r') as f:
            sw_content = f.read()

        # Check for offline-related features
        checks = [
            ('JSON API caching', 'isJsonApi' in sw_content),
            ('TTL caching', 'sw-cache-time' in sw_content),
            ('Stale-while-revalidate', 'stale-while-revalidate' in sw_content or 'fetchAndUpdate' in sw_content),
            ('Offline fallback', 'Offline' in sw_content and 'status' in sw_content),
        ]

        missing = [name for name, ok in checks if not ok]
        for check_name, passed in checks:
            if passed:
                print(f"✓ {check_name} implemented")
            else:
                print(f"✗ {check_name} missing")

        if missing:
            raise AssertionError(
                "Service worker missing features: " + ", ".join(missing)
            )

    except Exception as e:
        print(f"✗ Error reading service worker: {e}")
        raise


def test_electron_detection_logic():
    """Test the Electron detection logic in the webapp."""
    print("Testing Electron detection logic...")

    # Check the HTML file for Electron detection
    html_path = Path(__file__).parent / "webapp" / "index.html"
    if not html_path.exists():
        message = "index.html not found"
        print(f"✗ {message}")
        raise AssertionError(message)

    try:
        with open(html_path, 'r') as f:
            html_content = f.read()

        # Check for electronAPI usage
        checks = [
            ('electronAPI reference', 'electronAPI' in html_content),
            ('Electron user agent check', 'electron' in html_content.lower()),
        ]

        missing = [name for name, ok in checks if not ok]
        for check_name, passed in checks:
            if passed:
                print(f"✓ {check_name} found")
            else:
                print(f"✗ {check_name} missing")

        if missing:
            raise AssertionError(
                "Electron detection elements missing: " + ", ".join(missing)
            )

    except Exception as e:
        print(f"✗ Error reading index.html: {e}")
        raise


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Test Electron offline functionality')
    parser.add_argument('--api-url', default='http://localhost:8000',
                       help='API server URL (default: http://localhost:8000)')

    args = parser.parse_args()

    print("Electron Offline Verification")
    print("=" * 40)

    results = []

    # Test CORS configuration
    def _run(test_fn, *fn_args):
        try:
            test_fn(*fn_args)
        except pytest.skip.Exception as err:
            print(f"Skipped {test_fn.__name__}: {err}")
            return False
        except AssertionError as err:
            print(f"Assertion failed in {test_fn.__name__}: {err}")
            return False
        except Exception as err:
            print(f"Unexpected error in {test_fn.__name__}: {err}")
            return False
        return True

    results.append(_run(test_cors_configuration, args.api_url))
    print()

    # Test Electron API endpoints
    results.append(_run(test_electron_api_endpoints, args.api_url))
    print()

    # Test offline service configuration
    results.append(_run(test_offline_service_configuration))
    print()

    # Test Electron detection logic
    results.append(_run(test_electron_detection_logic))
    print()

    # Summary
    passed = sum(results)
    total = len(results)

    print("Summary:")
    print(f"  Tests passed: {passed}/{total}")

    if passed == total:
        print("✓ All Electron offline tests PASSED")
        print("\nNext steps for full Electron app:")
        print("1. Set up Electron build configuration")
        print("2. Create main Electron process file")
        print("3. Configure preload script for electronAPI")
        print("4. Build and package the app")
        print("5. Test offline boot with local models")
        return 0
    else:
        print("✗ Some Electron offline tests FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
