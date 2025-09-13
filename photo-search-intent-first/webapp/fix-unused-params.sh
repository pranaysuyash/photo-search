#!/bin/bash

# Fix unused parameters in PeopleView.tsx
sed -i '' 's/\tbusy,/\tbusy: _busy,/' src/components/PeopleView.tsx

# Fix non-null assertions
sed -i '' 's/ratingMap\[it.path\]! >/ratingMap[it.path] >/g' src/components/JustifiedResults.tsx

# Fix unused in App.tsx location
sed -i '' 's/{(location\.pathname/{(_location.pathname/g' src/App.tsx
sed -i '' 's/(location\.pathname/(_location.pathname/g' src/App.tsx

# Fix parse errors in FaceDetection.tsx
sed -i '' 's/String(\[path)/String(path)/g' src/modules/FaceDetection.tsx

# Fix label associations in ImageEditor
sed -i '' 's/<label>Brightness<\/label>/<label htmlFor="brightness-slider">Brightness<\/label>/' src/modules/ImageEditor.tsx
sed -i '' 's/<label>Contrast<\/label>/<label htmlFor="contrast-slider">Contrast<\/label>/' src/modules/ImageEditor.tsx
sed -i '' 's/<label>Saturation<\/label>/<label htmlFor="saturation-slider">Saturation<\/label>/' src/modules/ImageEditor.tsx

# Add IDs to corresponding inputs
sed -i '' '/type="range".*brightness/s/type="range"/id="brightness-slider" type="range"/' src/modules/ImageEditor.tsx
sed -i '' '/type="range".*contrast/s/type="range"/id="contrast-slider" type="range"/' src/modules/ImageEditor.tsx
sed -i '' '/type="range".*saturation/s/type="range"/id="saturation-slider" type="range"/' src/modules/ImageEditor.tsx

echo "Fixed unused parameters and other issues"
