#!/bin/bash

# Fix labels in PreferencesPanel.tsx
# Theme section
sed -i '' '144 s/<label className="block/<span className="block/' src/components/PreferencesPanel.tsx
sed -i '' '146 s|</label>|</span>|' src/components/PreferencesPanel.tsx

# Language section  
sed -i '' '171 s/<label className="block/<label htmlFor="language-select" className="block/' src/components/PreferencesPanel.tsx
sed -i '' '174 a\
												id="language-select"' src/components/PreferencesPanel.tsx

# Grid Size section
sed -i '' '190 s/<label className="block/<span className="block/' src/components/PreferencesPanel.tsx
sed -i '' '192 s|</label>|</span>|' src/components/PreferencesPanel.tsx

# Quality section
sed -i '' '216 s/<label className="block/<span className="block/' src/components/PreferencesPanel.tsx
sed -i '' '218 s|</label>|</span>|' src/components/PreferencesPanel.tsx

# Fix PaginatedSearch.tsx label
sed -i '' '115 s/<label className="/<label htmlFor="page-input" className="/' src/components/PaginatedSearch.tsx

echo "Fixed label associations"
