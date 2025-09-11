#!/bin/bash

echo "=== Fixing ALL remaining linting errors ==="

# 1. First, auto-fix all fixable issues (unused imports, organize imports, etc.)
echo "Step 1: Running biome auto-fix for fixable issues..."
npx @biomejs/biome check --write --unsafe ./src

# 2. Fix accessibility issues - add keyboard handlers to clickable divs
echo "Step 2: Fixing accessibility issues (adding keyboard handlers)..."

# Fix ModularApp.tsx accessibility issues
sed -i '' 's/<div\([^>]*\)onClick={\([^}]*\)}/<div role="button" tabIndex={0}\1onClick={\2} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); \2(); } }}/g' src/ModularApp.tsx

# More targeted fixes for ModularApp navigation items
sed -i '' 's/className={`nav-item/role="button" tabIndex={0} className={`nav-item/g' src/ModularApp.tsx

# 3. Fix any types
echo "Step 3: Fixing explicit any types..."

# ModularApp.tsx - fix let result: any
sed -i '' 's/let result: any;/let result: { total?: number; faces?: number; clusters?: number; updated?: number; trips?: { length: number } };/' src/ModularApp.tsx

# App.collections.test.tsx - fix any types
sed -i '' 's/(setCollections as any)/(setCollections as jest.Mock)/' src/App.collections.test.tsx
sed -i '' 's/vi\.fn((c: Record<string, string\[\]>)/vi.fn((c: Record<string, string[]>)/' src/App.collections.test.tsx

# 4. Fix unused parameters
echo "Step 4: Fixing unused parameters..."
sed -i '' 's/accessibilitySettings,/_accessibilitySettings,/g' src/components/AppLayout.tsx

# 5. Run TypeScript check
echo "Step 5: Checking TypeScript..."
npx tsc --noEmit

# 6. Final biome check
echo "Step 6: Final linting check..."
npx @biomejs/biome check ./src 2>&1 | grep -E "Found [0-9]+ (errors|warnings)" | tail -2

echo "=== Done ==="