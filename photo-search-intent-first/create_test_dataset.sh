#!/bin/bash
cd /Users/pranay/Projects/adhoc_projects/photo-search/photo-search-intent-first
rm -rf performance_test
mkdir -p performance_test

# Copy original files with unique names
counter=1
for file in demo_photos/*.png; do
  name=$(basename "$file")
  cp "$file" "performance_test/${name%.png}_${counter}.png"
  counter=$((counter+1))
done

# Create multiple copies to increase dataset size
for k in {1..20}; do
  for file in demo_photos/*.png; do
    name=$(basename "$file")
    cp "$file" "performance_test/${name%.png}_copy${k}.png"
  done
done

# Count files
ls performance_test/ | wc -l