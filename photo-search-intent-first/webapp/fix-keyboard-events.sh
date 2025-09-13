#!/bin/bash

# Fix LibraryBrowser.tsx - add onKeyDown handler
sed -i '' '/onClick={() => (onOpen ? onOpen(p) : undefined)}/a\
								onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (onOpen) onOpen(p); }}}' src/components/LibraryBrowser.tsx

# Fix Sidebar.tsx - add onKeyDown handler
sed -i '' '/onClick={onClose}/a\
					onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); }}}' src/components/Sidebar.tsx

# Fix TimelineResults.tsx - add onKeyDown handler  
sed -i '' '/onClick={() => onToggleSelect(it.path)}/a\
									onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleSelect(it.path); }}}' src/components/TimelineResults.tsx

echo "Fixed keyboard event handlers"
