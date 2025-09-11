#!/bin/bash

echo "Fixing remaining TypeScript errors..."

# Fix ModernApp.tsx
echo "Fixing ModernApp.tsx..."
sed -i '' 's/import { useEffect, useState } from "react";/import { useCallback, useEffect, useState } from "react";/' src/components/ModernApp.tsx
sed -i '' 's/\[loadWorkspace, triggerHint\]); \/\/ @ts-ignore - circular dependency/[triggerHint]);/' src/components/ModernApp.tsx
sed -i '' 's/\[libraryPath, loadLibrary, triggerHint\]); \/\/ @ts-ignore - circular dependency/[libraryPath, triggerHint]);/' src/components/ModernApp.tsx

# Fix ProUI.tsx
echo "Fixing ProUI.tsx..."
sed -i '' 's/import { useEffect, useState } from "react";/import { useCallback, useEffect, useState } from "react";/' src/components/ProUI.tsx
sed -i '' 's/\[loadWorkspace\]); \/\/ @ts-ignore - circular dependency/[]);/' src/components/ProUI.tsx
sed -i '' 's/\[libraryPath, loadLibrary\]); \/\/ @ts-ignore - circular dependency/[libraryPath]);/' src/components/ProUI.tsx

echo "Checking TypeScript errors..."
npx tsc --noEmit