#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files and their specific fixes
const fixes = [
  {
    file: 'src/components/BackupDashboard.tsx',
    pattern: /key=\{`\$\{rec\.id \|\| rec\.path \|\| rec\.name \|\| rec\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`rec-${idx}`}'
  },
  {
    file: 'src/components/CommandPalette.tsx',
    pattern: /key=\{`\$\{key\.id \|\| key\.path \|\| key\.name \|\| key\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`key-${idx}`}'
  },
  {
    file: 'src/components/DuplicateDetectionPanel.tsx',
    pattern: /key=\{`\$\{rec\.id \|\| rec\.path \|\| rec\.name \|\| rec\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`rec-${idx}`}'
  },
  {
    file: 'src/components/EnhancedSearchBar.tsx',
    pattern: /key=\{`\$\{suggestion\.id \|\| suggestion\.path \|\| suggestion\.name \|\| suggestion\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`suggestion-${suggestion.text}-${index}`}'
  },
  {
    file: 'src/components/FaceClusterManager.tsx',
    pattern: /key=\{`\$\{photoPath\.id \|\| photoPath\.path \|\| photoPath\.name \|\| photoPath\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`photo-${photoPath}-${index}`}'
  },
  {
    file: 'src/components/FaceVerificationPanel.tsx',
    pattern: /key=\{`\$\{_face\.id \|\| _face\.path \|\| _face\.name \|\| _face\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`face-${idx}`}'
  },
  {
    file: 'src/components/IndexManager.tsx',
    pattern: /key=\{`\$\{e\.id \|\| e\.path \|\| e\.name \|\| e\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`engine-${e.key}-${i}`}'
  },
  {
    file: 'src/components/JobsDrawer.tsx',
    pattern: /key=\{`\$\{e\.id \|\| e\.path \|\| e\.name \|\| e\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`event-${e.type}-${e.time}-${i}`}'
  },
  {
    file: 'src/components/KeyboardShortcuts.tsx',
    pattern: /key=\{`\$\{group\.id \|\| group\.path \|\| group\.name \|\| group\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`group-${group.title}-${idx}`}'
  },
  {
    file: 'src/components/MapView.tsx',
    pattern: /key=\{`\$\{p\.id \|\| p\.path \|\| p\.name \|\| p\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`point-${p.lat}-${p.lon}-${i}`}'
  },
  {
    file: 'src/components/MobileOptimizations.tsx',
    pattern: /key=\{`\$\{action\.id \|\| action\.path \|\| action\.name \|\| action\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`action-${action.label}-${index}`}'
  },
  {
    file: 'src/components/MobilePWATest.tsx',
    pattern: /key=\{`\$\{feature\.id \|\| feature\.path \|\| feature\.name \|\| feature\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`feature-${feature.name}-${index}`}'
  },
  {
    file: 'src/components/ModernLightbox.tsx',
    pattern: /key=\{`\$\{(tag|comment)\.id \|\| \1\.path \|\| \1\.name \|\| \1\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`$1-${index}`}'
  },
  {
    file: 'src/components/OnboardingModal.tsx',
    pattern: /key=\{`\$\{_\.id \|\| _\.path \|\| _\.name \|\| _\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`step-${idx}`}'
  },
  {
    file: 'src/components/PeopleView.tsx',
    pattern: /key=\{`\$\{photo\.id \|\| photo\.path \|\| photo\.name \|\| photo\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`photo-${photo}-${index}`}'
  },
  {
    file: 'src/components/QualityOverlay.tsx',
    pattern: /key=\{`\$\{issue\.id \|\| issue\.path \|\| issue\.name \|\| issue\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`issue-${issue}-${idx}`}'
  },
  {
    file: 'src/components/SearchExplainability.tsx',
    pattern: /key=\{`\$\{(reason|part)\.id \|\| \1\.path \|\| \1\.name \|\| \1\.key \|\| ""\}-\$\{idx\}`\}/g,
    replacement: 'key={`$1-${idx}`}'
  },
  {
    file: 'src/components/SearchHistoryPanel.tsx',
    pattern: /key=\{`\$\{entry\.id \|\| entry\.path \|\| entry\.name \|\| entry\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`entry-${entry.query}-${index}`}'
  },
  {
    file: 'src/components/TripsView.tsx',
    pattern: /key=\{`\$\{trip\.id \|\| trip\.path \|\| trip\.name \|\| trip\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`trip-${trip.name}-${i}`}'
  },
  {
    file: 'src/components/VideoLightbox.tsx',
    pattern: /key=\{`\$\{frame\.id \|\| frame\.path \|\| frame\.name \|\| frame\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`frame-${i}`}'
  },
  {
    file: 'src/components/VideoManager.tsx',
    pattern: /key=\{`\$\{video\.id \|\| video\.path \|\| video\.name \|\| video\.key \|\| ""\}-\$\{index\}`\}/g,
    replacement: 'key={`video-${video.path}-${index}`}'
  },
  {
    file: 'src/components/Workspace.tsx',
    pattern: /key=\{`\$\{p\.id \|\| p\.path \|\| p\.name \|\| p\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`folder-${i}`}'
  },
  {
    file: 'src/components/modals/AdvancedSearchModal.tsx',
    pattern: /key=\{`\$\{w\.id \|\| w\.path \|\| w\.name \|\| w\.key \|\| ""\}-\$\{i\}`\}/g,
    replacement: 'key={`warning-${i}`}'
  }
];

// Apply fixes
let totalFixed = 0;
for (const fix of fixes) {
  const filePath = path.join(__dirname, fix.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = content.replace(fix.pattern, fix.replacement);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${fix.file}`);
      totalFixed++;
    }
  }
}

console.log(`\nFixed ${totalFixed} files`);
