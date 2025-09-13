#!/bin/bash

# Fix corrupted role attributes
sed -i '' 's/ role="button" tabIndex={0}>//' src/components/JustifiedResults.tsx
sed -i '' 's/ role="button" tabIndex={0}>//' src/components/VideoLightbox.tsx
sed -i '' 's/ role="button" tabIndex={0}>//' src/components/VideoManager.tsx
sed -i '' 's/ role="button" tabIndex={0}>//' src/components/VirtualizedPhotoGrid.tsx
sed -i '' 's/ role="button" tabIndex={0}>//' src/components/Welcome.tsx

echo "Fixed corrupted role attributes"
