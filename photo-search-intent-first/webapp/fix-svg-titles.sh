#!/bin/bash

# Fix SVGs in Welcome.tsx
# Line 49-50 SVG
sed -i '' '57 a\
										<title>Folder icon</title>' src/components/Welcome.tsx

# Line 75 SVG  
sed -i '' '83 a\
										<title>Demo icon</title>' src/components/Welcome.tsx

# Fix SVGs in JustifiedResults.tsx
# Line 461 SVG (rating star)
sed -i '' '466 s|aria-hidden|aria-hidden="true"|' src/components/JustifiedResults.tsx

# Line 477 SVG (selected checkmark) - already has aria-label

# Fix SVGs in EmptyState.tsx
sed -i '' '/viewBox="0 0 24 24"/a\
				<title>Empty state icon</title>' src/components/ui/EmptyState.tsx

echo "Fixed SVG title issues"
