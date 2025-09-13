#!/bin/bash

# Fix QuickFilters.tsx ISO labels
sed -i '' '265 s/<label className="/<label htmlFor="min-iso" className="/' src/components/QuickFilters.tsx
sed -i '' '268 a\
								id="min-iso"' src/components/QuickFilters.tsx

sed -i '' '280 s/<label className="/<label htmlFor="max-iso" className="/' src/components/QuickFilters.tsx  
sed -i '' '283 a\
								id="max-iso"' src/components/QuickFilters.tsx

# Fix PaginatedSearch.tsx
sed -i '' 's/<label htmlFor="page-input"/<label htmlFor="page-selector"/' src/components/PaginatedSearch.tsx

echo "Fixed all label associations"
