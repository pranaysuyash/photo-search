# Using FAL Qwen Image Edit via curl

This guide shows how to use FAL's Qwen Image Edit endpoint with a simple curl-based script. Keep your API key on the server or local environment—do not expose it in the browser.

## Prerequisites

- A FAL API key stored in the environment:

```bash
export FAL_KEY="<your fal key>"
```

## Quick start

- Remote image URL:

```bash
photo-search-intent-first/scripts/fal_qwen_image_edit.sh \
  -p "Change bag to apple macbook" \
  -i "https://v3.fal.media/files/koala/oei_-iPIYFnhdB8SxojND_qwen-edit-res.png"
```

- Local image file (auto base64 → data URI):

```bash
photo-search-intent-first/scripts/fal_qwen_image_edit.sh \
  -p "Change bag to apple macbook" \
  --file /absolute/path/to/input.png
```

The script prints the request id, polls the queue, and prints the final JSON with the generated image URL(s).

## Options

- `-p, --prompt` string (required)
- `-i, --image-url` URL of image to edit (required unless `--file` used)
- `--file` local image file (auto base64)
- `-s, --steps` default 30
- `-g, --guidance` default 4
- `-n, --num-images` default 1
- `-o, --output-format` png|jpeg (default png)
- `-a, --acceleration` none|regular|high (default regular)
- `-w, --width`, `-h, --height` custom size (otherwise preset square_hd)
- `--negative` negative prompt
- `--sync` sync_mode true (returns data URI)

## Security notes

- Never embed `FAL_KEY` in frontend code.
- For production web usage, create a small server-side proxy that injects the key from a secure environment and forwards only permitted parameters.

## Batch-generate brand assets

For convenience, a small helper script can batch-generate a variety of visuals using different prompts:

```bash
photo-search-intent-first/scripts/gen_brand_assets.sh /absolute/path/to/seed_image.png
```

Outputs are written to `webapp-v3/public/generated/` (ignored by git). Edit the prompt array inside the script to customize the variations.

### Skip Existing Assets

The script automatically skips generating assets that already exist, preventing wasted API credits:

```bash
# Will skip assets 0-46 if they already exist
FAL_KEY="your-key" ./gen_brand_assets.sh /path/to/seed.png
```

This feature ensures you only pay for new assets when expanding the prompt set.

### Example Generated Assets

The script includes prompts for:

- **Icons**: Minimalist app icons, logo badges, overlay icons (e.g., camera lens, search spark)
- **Backgrounds**: Subtle patterns with geometric shapes, gradients, textures
- **Illustrations**: Vintage camera elements, photo gallery scenes, abstract compositions

Each prompt generates a unique image based on the input seed, allowing for varied visual assets without manual prompt crafting.

## Advanced Usage for Illustrations

Beyond basic edits, FAL Qwen Image Edit excels at generating custom illustrations for UI elements:

### Icon Generation

```bash
# Generate a custom icon
./fal_qwen_image_edit.sh \
  --file /path/to/seed.png \
  -p "Create a flat design icon of a magnifying glass with photo thumbnails inside"
```

### Background Patterns

```bash
# Subtle UI background
./fal_qwen_image_edit.sh \
  --file /path/to/seed.png \
  -p "Generate a seamless background pattern with soft camera silhouettes and bokeh"
```

### Illustration Elements

```bash
# App illustrations
./fal_qwen_image_edit.sh \
  --file /path/to/seed.png \
  -p "Illustrate a modern photo gallery with floating images and gentle shadows"
```

### Custom Sizes and Quality

```bash
# High-quality custom size
./fal_qwen_image_edit.sh \
  --file /path/to/seed.png \
  -p "Create a detailed illustration of vintage photography equipment" \
  -w 1024 -h 1024 \
  -s 50 -g 7.5
```

## Integration with Photo Search App

Generated assets can be used throughout the app:

- **Icons**: Place in `webapp-v3/public/generated/` and reference via `VITE_BRAND_LOGO` or direct paths
- **Backgrounds**: Use as CSS backgrounds or component illustrations
- **Illustrations**: Integrate into empty states, onboarding, or feature highlights

## Generated Assets Overview

Running the batch script with the default seed image generates 47 assets covering:

### Icons (0-19)

- Navigation icons: library, search, collections, people, places, tags, trips, favorites, analytics
- UI controls: settings, close, theme toggle, arrows, view modes (grid/list/map)

### Background Patterns (20-31)

- Geometric patterns, textures with photo frames, gradients
- Film grain, camera silhouettes, bokeh effects, miniature icons

### Illustrations (32-46)

- Empty states: library, collections, places, favorites, search results
- Onboarding: welcome screen, uploading photos
- Status illustrations: loading, success, error, no results
- Feature-specific: people clustering, tag management, trip planning, analytics dashboard

All assets are saved as PNG files in `webapp-v3/public/generated/` and can be referenced directly in React components or Electron UI.

## Current Project Status

### ✅ Completed Features

**Asset Generation & Integration:**

- Generated 47 FAL Qwen Image Edit assets (icons, backgrounds, illustrations)
- Integrated generated assets into Sidebar navigation icons
- Added background patterns to main canvas for visual appeal
- Implemented skip logic to prevent regenerating existing assets
- Updated PhotoLibrary empty state with generated illustration

**v3 App Components:**

- PhotoLibrary: Grid/list view with search, filtering, lightbox
- Collections: Create/manage photo collections with drag-and-drop
- People: Face clustering and person naming
- Analytics: Photo statistics and metadata analysis
- Places: Location-based photo organization (grid/list views)
- Tags: Tag cloud and management interface
- Trips: Automatic trip detection and timeline view
- Sidebar: Navigation with generated icons and directory selection
- TopBar: Search input, directory selector, theme toggle

**Technical Infrastructure:**

- FastAPI backend with modular routers
- React 18 + TypeScript + Vite frontend
- Zustand state management
- Tailwind CSS with dark mode support
- Electron desktop app packaging
- FAL API integration for asset generation

### 🔄 In Progress (0/40)

None currently active.

### ⏳ Pending Todos (39/40)

**Core Features:**

- Complete Favorites component (backend integration needed)
- Implement Places map view (currently shows placeholder)
- Connect TagsView to real photo metadata
- Connect PlacesView to real EXIF data
- Implement TopBar search functionality

**UI/UX Enhancements:**

- Add error boundaries and loading states
- Implement keyboard shortcuts
- Add drag-and-drop support
- Implement photo editing features
- Add photo sharing features

**Advanced Features:**

- Implement batch operations
- Add photo comparison view
- Implement slideshow view
- Add backup and sync features
- Implement print ordering

**AI/ML Features:**

- Add photo story features
- Implement album management
- Add facial recognition features
- Implement location features
- Add metadata management

**Analysis & Quality:**

- Implement quality analysis
- Add duplicate detection
- Implement color analysis
- Add object detection features
- Implement AI enhancement features

**Search & Discovery:**

- Add reverse image search
- Implement timeline view
- Add calendar view

**Organization:**

- Implement folder management
- Add import sources
- Implement export features

**Advanced Tools:**

- Add watermarking features
- Implement version control
- Add collaboration features
- Implement privacy controls

**Analytics & Infrastructure:**

- Add analytics dashboard
- Implement backup features
- Add migration tools
- Implement accessibility features

### 🎯 Next Priority Tasks

1. **Complete Favorites Component**: Wire up backend API for favoriting photos
2. **Implement Places Map View**: Add interactive map integration for location-based browsing
3. **Connect Real Data Sources**: Replace sample data with actual photo metadata in TagsView and PlacesView
4. **TopBar Search**: Implement actual search functionality beyond state management

### 📊 Asset Usage

Generated assets are actively used in:

- Sidebar navigation (assets 3-11): library, search, collections, people, places, favorites, tags, trips, analytics icons
- PhotoLibrary empty state (asset 32): camera with film strips illustration
- Main canvas backgrounds: gradient orbs and dot patterns for visual depth

### 🔧 Development Commands

```bash
# Generate new assets (skips existing)
FAL_KEY="your-key" ./scripts/gen_brand_assets.sh /path/to/seed.png

# Build v3 app
cd photo-search-intent-first/webapp-v3 && npm run build

# Run development server
cd photo-search-intent-first/webapp-v3 && npm run dev

# Run Electron app
cd photo-search-intent-first/electron && node run-electron.js
```
