#!/bin/bash

# Fix missing closing brackets
sed -i '' '494 s/$/>/g' src/components/JustifiedResults.tsx
sed -i '' '284 s/$/>/g' src/components/VideoLightbox.tsx  
sed -i '' '144 s/$/>/g' src/components/VideoManager.tsx
sed -i '' '249 s/$/>/g' src/components/VirtualizedPhotoGrid.tsx
sed -i '' '17 s/$/>/g' src/components/Welcome.tsx

echo "Fixed missing closing brackets"
