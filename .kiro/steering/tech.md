# Technology Stack & Build System

## Frontend Stack (V3 - Current Focus)

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS + tailwindcss-animate
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Virtualization**: react-window + react-virtualized-auto-sizer
- **Animation**: Framer Motion
- **Icons**: Lucide React

## Backend Stack

- **API Framework**: FastAPI + Uvicorn
- **AI Models**: CLIP (sentence-transformers, torch, torchvision)
- **Storage**: SQLite or file-based (JSON/NumPy)
- **Search Acceleration**: Optional FAISS, Annoy, or HNSW
- **Image Processing**: Pillow
- **Face Recognition**: InsightFace + ONNX Runtime
- **OCR**: EasyOCR
- **Geolocation**: reverse_geocoder

## Desktop Application

- **Shell**: Electron 27+
- **Security**: Context isolation enabled, Node.js disabled in renderer
- **State Management**: electron-store, electron-window-state
- **Logging**: electron-log
- **Updates**: electron-updater
- **Builder**: electron-builder

## Development Tools

- **Package Manager**: pnpm (preferred) or npm
- **Python Environment**: Use existing `.venv` in `photo-search-intent-first/`
- **Linting**: ESLint (frontend), Ruff (Python)
- **Type Checking**: TypeScript, mypy
- **Testing**: Playwright (E2E), Jest/Vitest (unit)
- **Import Linting**: import-linter

## Common Commands

### Frontend Development (V3)
```bash
# Development server
npm run dev:v3
# or from webapp-v3 directory
cd photo-search-intent-first/webapp-v3 && npm run dev

# Build for production
npm run build:v3

# Linting
cd photo-search-intent-first/webapp-v3 && npm run lint
cd photo-search-intent-first/webapp-v3 && npm run lint:fix
```

### Backend Development
```bash
# Always use existing virtual environment
cd photo-search-intent-first
source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run API server
python run_server.py
# or
uvicorn api.server:app --reload --host 127.0.0.1 --port 8000

# CLI commands
python cli.py index --dir /path/to/photos --provider local
python cli.py search --dir /path/to/photos --query "friends having tea"
```

### Electron Development
```bash
# V3 Electron (current focus)
cd electron-v3
npm run dev

# Legacy Electron
cd photo-search-intent-first/electron
npm run dev
```

### Testing
```bash
# Web tests
npm run test:web

# Visual regression tests
npm run visual
npm run visual:update  # Update baselines

# Python tests
cd photo-search-intent-first
python -m pytest tests/
```

### Build & Distribution
```bash
# Build V3 webapp
npm run build:v3

# Build Electron app
cd electron-v3
npm run build:ui      # Build React app
npm run prepare:models # Download AI models
npm run build         # Create installer

# Platform-specific builds
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## Environment Variables

### Development
- `DEV_NO_AUTH=1` - Bypass API authentication in development
- `VITE_API_BASE=http://localhost:8000` - API base URL for frontend
- `STORAGE_BACKEND=sqlite|file` - Choose storage backend

### Production
- `API_TOKEN=<token>` - API authentication token
- `PHOTOVAULT_MODEL_DIR` - Custom model storage directory
- `TRANSFORMERS_OFFLINE=1` - Force offline model usage

## Project Structure Notes

- **Primary focus**: `photo-search-intent-first/webapp-v3/` and `electron-v3/`
- **Legacy code**: `archive/photo-search-classic/` and `photo-search-intent-first/webapp/`
- **Always use existing Python venv**: `photo-search-intent-first/.venv`
- **Model storage**: Default in `{appData}/photo-search/models/`