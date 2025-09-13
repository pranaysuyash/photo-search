#!/bin/bash

# Fix role="button" in App.tsx (lines around 2841 and 2893)
# These need manual review as they might be complex

# Fix role="status" to <output> in App.tsx
sed -i '' 's/<div role="status"/<output/g' src/App.tsx
sed -i '' 's|</div><!-- status -->|</output>|g' src/App.tsx

# Fix role="listitem" to <li> in Collections.tsx
sed -i '' 's/<div role="listitem"/<li/g' src/components/Collections.tsx
sed -i '' 's|</div><!-- listitem -->|</li>|g' src/components/Collections.tsx

echo "Fixed semantic elements"
