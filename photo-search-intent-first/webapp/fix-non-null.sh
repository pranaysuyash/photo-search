#!/bin/bash

# Fix non-null assertions in ResultsPanel.tsx
sed -i '' 's/clusters\[topIdx\]!/clusters[topIdx] || {}/' src/components/ResultsPanel.tsx
sed -i '' 's/cluster!/cluster || {}/' src/components/ResultsPanel.tsx
sed -i '' 's/clusters\[topIdx\]!\.photos/clusters[topIdx]?.photos || []/' src/components/ResultsPanel.tsx

# Fix non-null assertions in ShareViewer.tsx
sed -i '' 's/fetchedPhoto!/fetchedPhoto || {}/' src/components/ShareViewer.tsx

# Fix non-null assertions in ExportModal.tsx
sed -i '' 's/format!/format || "jpeg"/' src/components/modals/ExportModal.tsx

# Fix non-null assertions in DuplicateDetectionService.ts
sed -i '' 's/similarityScores\.get(key)!/similarityScores.get(key) ?? 0/' src/services/DuplicateDetectionService.ts

# Fix non-null assertions in OfflinePhotoService.ts  
sed -i '' 's/OfflinePhotoService\.cache\.get(path)!/OfflinePhotoService.cache.get(path) || null/' src/services/OfflinePhotoService.ts
sed -i '' 's/OfflinePhotoService\.pendingUploads\.get(path)!/OfflinePhotoService.pendingUploads.get(path) || null/' src/services/OfflinePhotoService.ts

echo "Fixed non-null assertions"
