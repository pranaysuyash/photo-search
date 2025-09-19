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

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

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

        response = requests.options(f"{api_url}/models/capabilities", headers=headers)

        # Check if app://local is in allowed origins
        cors_headers = response.headers
        allowed_origins = cors_headers.get('Access-Control-Allow-Origin', '')

        if 'app://local' in allowed_origins or '*' in allowed_origins:
            print("✓ CORS configured for app://local origin")
            return True
        else:
            print(f"✗ CORS not configured for app://local. Allowed origins: {allowed_origins}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"✗ Cannot connect to API server at {api_url}")
        print("  Make sure the server is running: python api/server.py")
        return False
    except Exception as e:
        print(f"✗ CORS test failed: {e}")
        return False


def test_electron_api_endpoints(api_url="http://localhost:8000"):
    """Test Electron-specific API endpoints."""
    print("Testing Electron-specific API endpoints...")

    endpoints = [
        '/models/capabilities',  # Should work for capability detection
        '/library',              # May require authentication
        '/collections'           # May require authentication
    ]

    results = {}

    for endpoint in endpoints:
        try:
            # Test with Electron origin
            headers = {'Origin': 'app://local'}
            response = requests.get(f"{api_url}{endpoint}", headers=headers, timeout=5)

            if response.status_code in [200, 401, 403]:
                results[endpoint] = True
                print(f"✓ {endpoint} accessible (status: {response.status_code})")
            else:
                results[endpoint] = False
                print(f"✗ {endpoint} failed (status: {response.status_code})")

        except requests.exceptions.Timeout:
            results[endpoint] = False
            print(f"✗ {endpoint} timed out")
        except requests.exceptions.ConnectionError:
            results[endpoint] = False
            print(f"✗ Cannot connect to {endpoint}")
        except Exception as e:
            results[endpoint] = False
            print(f"✗ {endpoint} error: {e}")

    return all(results.values())


def test_offline_service_configuration():
    """Test offline service configuration in the webapp."""
    print("Testing offline service configuration...")

    # Check if service worker exists
    sw_path = Path(__file__).parent / "webapp" / "public" / "service-worker.js"
    if not sw_path.exists():
        print("✗ Service worker not found")
        return False

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

        all_passed = True
        for check_name, passed in checks:
            if passed:
                print(f"✓ {check_name} implemented")
            else:
                print(f"✗ {check_name} missing")
                all_passed = False

        return all_passed

    except Exception as e:
        print(f"✗ Error reading service worker: {e}")
        return False


def test_electron_detection_logic():
    """Test the Electron detection logic in the webapp."""
    print("Testing Electron detection logic...")

    # Check the HTML file for Electron detection
    html_path = Path(__file__).parent / "webapp" / "index.html"
    if not html_path.exists():
        print("✗ index.html not found")
        return False

    try:
        with open(html_path, 'r') as f:
            html_content = f.read()

        # Check for electronAPI usage
        checks = [
            ('electronAPI reference', 'electronAPI' in html_content),
            ('Electron user agent check', 'electron' in html_content.lower()),
        ]

        all_passed = True
        for check_name, passed in checks:
            if passed:
                print(f"✓ {check_name} found")
            else:
                print(f"✗ {check_name} missing")
                all_passed = False

        return all_passed

    except Exception as e:
        print(f"✗ Error reading index.html: {e}")
        return False


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
    results.append(test_cors_configuration(args.api_url))
    print()

    # Test Electron API endpoints
    results.append(test_electron_api_endpoints(args.api_url))
    print()

    # Test offline service configuration
    results.append(test_offline_service_configuration())
    print()

    # Test Electron detection logic
    results.append(test_electron_detection_logic())
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