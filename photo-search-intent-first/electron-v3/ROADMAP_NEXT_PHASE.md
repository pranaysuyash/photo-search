# Electron v3 - Remaining Low-Hanging Fruit Analysis

## Completed Features ✅
1. **Rebuild Index** - Search > Rebuild Index
2. **Export Library** - File > Export Library...
3. **Build Face Recognition** - Search > Search by People
4. **Build Trip Detection** - Search > Search by Places

## Remaining Features for Future Implementation

### 5. Smart Search Enhancement
**Current State**: Menu item sends generic IPC message
**Required Work**:
- New UI component for search filters
- Integration with existing search API parameters:
  - `use_captions`, `use_ocr`, `favorites_only`
  - `place`, `tags`, `has_text` filters
- Would need frontend development
**Effort**: Medium (new UI components needed)

### 6. Enhanced Preferences
**Current State**: Menu opens IPC message only
**Opportunity**:
- Theme selection (light/dark/system)
- Provider settings
- Auto-indexing toggle
- Export preferences
**Effort**: Medium (new dialog UI needed)

### 7. Recent Directories in File Menu
**Current State**: Not implemented
**Opportunity**: Show last 3-5 used directories
**Effort**: Low (use existing store + menu API)

### 8. View Mode Integration
**Current State**: Sends IPC messages for Grid/List view
**Opportunity**: Actually switch between grid/list layouts
**Effort**: Low (UI state management)

### 9. Enhanced Help & About
**Current State**: Basic about dialog
**Opportunity**: Keyboard shortcuts, feature tour
**Effort**: Low (new dialogs)

## Recommendation
Focus on **Recent Directories** and **View Mode Integration** next - both are low effort with high UX impact and use existing data/store.

**Smart Search** and **Preferences** require significant UI work and should be planned for future sprints.