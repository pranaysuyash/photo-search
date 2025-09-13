#!/bin/bash

# Fix JustifiedResults.tsx line 400
sed -i '' '400 s/onDoubleClick={() = role="button" tabIndex={0}> onOpen/onDoubleClick={() => onOpen/' src/components/JustifiedResults.tsx

# Fix line 496
sed -i '' '496 s/ role="button" tabIndex={0}>//' src/components/JustifiedResults.tsx

# Fix ResultsGrid.tsx line 48
sed -i '' '48 s/onDoubleClick={() = role="button" tabIndex={0}> onOpen/onDoubleClick={() => onOpen/' src/components/ResultsGrid.tsx

# Fix Welcome.tsx line 17
sed -i '' '17 s/ role="button" tabIndex={0}>//' src/components/Welcome.tsx

# Fix VirtualizedPhotoGrid.tsx line 249
sed -i '' '249 s/ role="button" tabIndex={0}>//' src/components/VirtualizedPhotoGrid.tsx

# Fix VideoManager.tsx line 144
sed -i '' '144 s/ role="button" tabIndex={0}>//' src/components/VideoManager.tsx

# Fix VideoLightbox.tsx line 284
sed -i '' '284 s/ role="button" tabIndex={0}>//' src/components/VideoLightbox.tsx

echo "Fixed corrupted lines"
