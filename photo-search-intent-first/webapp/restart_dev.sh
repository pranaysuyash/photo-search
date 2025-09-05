#!/bin/bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/webapp

# Kill existing dev server
pkill -f "vite" || true

# Clean and reinstall if needed
# npm install

# Start dev server
npm run dev > react-dev.log 2>&1 &

echo "Dev server restarted. Check react-dev.log for output."
