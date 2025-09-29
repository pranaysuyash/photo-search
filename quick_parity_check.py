#!/usr/bin/env python3
"""
Quick API parity check to see current status
"""
import sys
from pathlib import Path

# Add the photo-search-intent-first directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "photo-search-intent-first"))

# Extract FastAPI routes
from api.server import app
fastapi_routes = set()
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        for method in route.methods:
            if method != 'HEAD':
                fastapi_routes.add(f"{method} {route.path}")

# Extract original server routes (simplified approach)
import re
from pathlib import Path

original_file = Path("archive/photo-search-classic/app.py") 
if not original_file.exists():
    print("❌ Original file not found")
    sys.exit(1)

original_content = original_file.read_text()
original_routes = set()

# Find route definitions
patterns = [
    r'@app\.(get|post|put|delete|patch)\([\'"](.*?)[\'"]',
    r'@app\.route\([\'"](.*?)[\'"].*?methods=\[(.*?)\]',
]

for pattern in patterns:
    matches = re.findall(pattern, original_content, re.IGNORECASE)
    for match in matches:
        if len(match) == 2 and isinstance(match[1], str):
            if 'methods=' in pattern:
                path, methods_str = match
                methods = re.findall(r'[\'\"](GET|POST|PUT|DELETE|PATCH)[\'"]', methods_str)
                for method in methods:
                    original_routes.add(f"{method} {path}")
            else:
                method, path = match
                original_routes.add(f"{method.upper()} {path}")

# Calculate differences
missing = original_routes - fastapi_routes
extra = fastapi_routes - original_routes

print("🔍 API Parity Status Report")
print("=" * 50)
print(f"✅ FastAPI Routes: {len(fastapi_routes)}")
print(f"📋 Original Routes: {len(original_routes)}")
print(f"❌ Missing Routes: {len(missing)}")
print(f"➕ Extra Routes: {len(extra)}")

if missing:
    print("\n🚨 Missing Routes:")
    for route in sorted(missing):
        print(f"  {route}")
        
if len(missing) == 0:
    print("\n🎉 COMPLETE API PARITY ACHIEVED! 🎉")
    print("All routes from original server have been successfully extracted!")
    
print("\n📊 Sample FastAPI Routes:")
for route in sorted(list(fastapi_routes))[:10]:
    print(f"  {route}")