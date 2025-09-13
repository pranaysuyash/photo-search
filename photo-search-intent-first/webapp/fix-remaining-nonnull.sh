#!/bin/bash

# Fix TouchGestureService.ts
sed -i '' 's/this\.config\.pullToRefreshThreshold!/this.config.pullToRefreshThreshold ?? 100/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.config\.minSwipeDistance!/(this.config.minSwipeDistance ?? 50)/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.config\.minPinchDistance!/(this.config.minPinchDistance ?? 30)/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.config\.minScale!/(this.config.minScale ?? 0.5)/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.config\.maxScale!/(this.config.maxScale ?? 3)/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.gestureState\.pinchStartDistance!/(this.gestureState.pinchStartDistance ?? 0)/g' src/services/TouchGestureService.ts
sed -i '' 's/this\.gestureState\.pinchCenter!/(this.gestureState.pinchCenter ?? { x: 0, y: 0 })/g' src/services/TouchGestureService.ts

# Fix accessibility.tsx
sed -i '' 's/current\[0\]!/current[0] || null/g' src/utils/accessibility.tsx

echo "Fixed remaining non-null assertions"
