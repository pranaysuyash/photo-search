#!/bin/bash

echo "🔧 Fixing Linting Errors Systematically"
echo "======================================="

# Fix useButtonType errors - add type="button" to all buttons
echo "1. Fixing button type errors..."
find src -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/<button\([^>]*\)onClick/<button type="button"\1onClick/g'
find src -name "*.tsx" -o -name "*.jsx" | xargs sed -i '' 's/<button type="button" type="button"/<button type="button"/g'

# Fix common noExplicitAny patterns
echo "2. Fixing common any types..."
# Replace (e: any) with proper event types
find src -name "*.tsx" | xargs sed -i '' 's/(e: any)/(e: React.MouseEvent)/g'
find src -name "*.tsx" | xargs sed -i '' 's/(event: any)/(event: React.ChangeEvent<HTMLInputElement>)/g'
find src -name "*.tsx" | xargs sed -i '' 's/(error: any)/(error: Error | unknown)/g'

# Fix unused imports - remove common unused imports
echo "3. Removing common unused imports..."
# This needs to be done carefully by Biome

# Run Biome again to fix what it can
echo "4. Running Biome auto-fix again..."
npx @biomejs/biome check src --write --max-diagnostics=2000

echo "5. Checking remaining errors..."
npx @biomejs/biome check src --max-diagnostics=2000 2>&1 | grep -E "lint/" | wc -l

echo "Done! Check the output above for remaining errors."