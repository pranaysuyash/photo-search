#!/bin/bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first/webapp

# Run build to check for errors
npm run build 2>&1 | tee build.log

echo "Build complete. Check build.log for any errors."
