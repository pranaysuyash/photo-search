#!/bin/bash

# Fix noStaticElementInteractions in SettingsModal
sed -i '' '75 s/<div/<div role="presentation"/' src/components/SettingsModal.tsx

# Fix noStaticElementInteractions in MobileGridLayout
sed -i '' '146 s/<div/<div role="presentation"/' src/components/MobileGridLayout.tsx

# Fix noStaticElementInteractions in LibraryBrowser
sed -i '' '283 s/<div/<div role="button" tabIndex={0}/' src/components/LibraryBrowser.tsx

# Fix noStaticElementInteractions in Sidebar 
sed -i '' '138 s/<div/<div role="button" tabIndex={0}/' src/components/Sidebar.tsx

# Fix noStaticElementInteractions in TimelineResults
sed -i '' '449 s/<div/<div role="button" tabIndex={0}/' src/components/TimelineResults.tsx

# Fix noStaticElementInteractions in App.tsx
sed -i '' '2841 s/<div/<div role="button" tabIndex={0}/' src/App.tsx
sed -i '' '2893 s/<div/<div role="button" tabIndex={0}/' src/App.tsx

echo "Fixed noStaticElementInteractions errors"
