# Photo Search Project - Qwen Code Context

This document provides essential context for Qwen Code to understand and work with the Photo Search project, which implements two approaches to semantic photo search: a classic approach and an intent-first approach.

## Project Overview

Photo Search is a semantic photo search application that allows users to find photos by describing them in natural language. It uses CLIP (Contrastive Language-Image Pre-training) models to create embeddings of both images and text queries, enabling semantic search capabilities.

The project implements two distinct architectural approaches:

1. **Classic Approach** (`archive/photo-search-classic`) - A straightforward implementation with a single engine module
2. **Intent-First Approach** (`photo-search-intent-first`) - A more sophisticated implementation using layered architecture with explicit intent documentation

## Main Technologies

- **Backend**: Python 3.9+ with FastAPI for the API server
- **Frontend**: React with TypeScript, Tailwind CSS, and Vite for the web interface
- **Machine Learning**: Sentence Transformers, PyTorch, CLIP models for semantic embeddings
- **Storage**: Local file system with JSON-based index storage
- **Deployment**: Docker containers with docker-compose for orchestration
- **Desktop**: Electron for cross-platform desktop applications

## Project Structure

```
photo-search/
├── archive/photo-search-classic/   # Classic implementation (archived)
│   ├── adapters/                   # Data adapters
│   ├── api/                        # FastAPI server
│   │   └── web/                    # React frontend build
│   ├── domain/                     # Domain models
│   ├── infra/                      # Infrastructure components
│   ├── tests/                      # Test suite
│   ├── ui/                         # Streamlit UI
│   ├── usecases/                   # Business logic
│   ├── webapp/                     # React frontend source
│   ├── electron/                   # Electron desktop packaging
│   ├── cli.py                      # CLI entry point
│   ├── launcher.py                 # Streamlit launcher
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Docker configuration
├── photo-search-intent-first/      # Intent-first implementation (main focus)
│   ├── adapters/                   # Data adapters
│   ├── api/                        # FastAPI server
│   │   └── web/                    # React frontend build
│   ├── domain/                     # Domain models
│   ├── infra/                      # Infrastructure components
│   ├── photo_search_intent_first.egg-info/
│   ├── tests/                      # Test suite
│   ├── ui/                         # Streamlit UI
│   ├── usecases/                   # Business logic
│   ├── webapp/                     # React frontend source
│   ├── electron/                   # Electron desktop packaging
│   ├── cli.py                      # CLI entry point
│   ├── launcher.py                 # Streamlit launcher
│   ├── requirements.txt            # Python dependencies
│   ├── INTENT.md                   # Intent-first methodology documentation
│   └── Dockerfile                  # Docker configuration
├── landing/                        # Landing page for marketing
├── docker-compose.yml              # Multi-container deployment
└── DEPLOYMENT.md                   # Deployment instructions
```

## Key Features

### Core Functionality
- Build semantic indexes of local photo libraries using CLIP embeddings
- Search photos with natural language queries
- Privacy-first approach with local processing (no cloud uploads by default)
- Support for multiple AI providers (local CLIP, Hugging Face, OpenAI)

### Advanced Features
- EXIF metadata filtering (camera, ISO, aperture, etc.)
- OCR text extraction and search within images
- Face recognition and clustering
- Geolocation mapping
- Collections and favorites management
- Smart collections with rule-based organization
- Look-alike photo detection
- Batch export and deletion with undo capability

### Search Capabilities
- Semantic search using natural language
- Similar photo search (find visually similar images)
- Combined image + text similarity search
- Filter by EXIF data, tags, favorites, date ranges
- OCR text content search
- Face/person filtering

## Architecture

### Intent-First Approach (Primary Focus)
The intent-first approach follows a Clean Architecture pattern with clear separation of concerns:

1. **Domain Layer** (`domain/`) - Core business entities and models
2. **Usecases Layer** (`usecases/`) - Application-specific business logic
3. **Adapters Layer** (`adapters/`) - Interfaces to external systems and frameworks
4. **Infrastructure Layer** (`infra/`) - Technical implementations of persistence, indexing, etc.
5. **UI Layer** (`ui/`, `webapp/`) - User interfaces (Streamlit and React)

### API Layer
The backend API is built with FastAPI and provides RESTful endpoints for all functionality:
- Indexing and search operations
- Collection and tag management
- Metadata extraction and filtering
- File operations (export, delete, etc.)
- Static file serving for the React frontend

### Frontend
Two frontend implementations exist:
1. **Streamlit UI** - Traditional web interface in the `ui/` directory
2. **React Web App** - Modern single-page application in the `webapp/` directory

The React app uses:
- TypeScript for type safety
- Zustand for state management
- Tailwind CSS for styling
- Lucide React for icons
- React Window for efficient rendering of large lists

## Building and Running

### Prerequisites
- Python 3.9+
- Node.js 18+ (for web frontend)
- Docker and docker-compose (for containerized deployment)

### Development Setup

1. **Install Python dependencies**:
   ```bash
   # For intent-first approach (recommended)
   cd photo-search-intent-first
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e .[dev,ann,faiss,hnsw,ocr]
   ```

2. **Install web frontend dependencies**:
   ```bash
   cd photo-search-intent-first/webapp
   npm install
   ```

### Running the Application

#### Local Development
1. **Start the API server**:
   ```bash
   # From photo-search-intent-first directory
   uvicorn api.server:app --port 8000 --reload
   ```

2. **Start the React development server**:
   ```bash
   # From photo-search-intent-first/webapp directory
   npm run dev
   ```

3. **Start the Streamlit UI**:
   ```bash
   # From photo-search-intent-first directory
   streamlit run ui/app.py
   ```

#### Using Docker
1. **Build and run with docker-compose**:
   ```bash
   # From root directory
   docker-compose up --build
   ```

2. **Build individual containers**:
   ```bash
   # Classic approach
   docker build -t photo-search-classic:latest photo-search-classic
   docker run --rm -p 8001:8001 photo-search-classic:latest
   
   # Intent-first approach
   docker build -t photo-search-intent-first:latest photo-search-intent-first
   docker run --rm -p 8000:8000 photo-search-intent-first:latest
   ```

### CLI Usage

The application provides command-line interfaces for both approaches:

```bash
# Index photos
python3 photo-search-intent-first/cli.py index --dir /path/to/photos --provider local

# Search photos
python3 photo-search-intent-first/cli.py search --dir /path/to/photos --query "friends having tea" --top-k 12

# Using installed package
ps-intent index --dir /path/to/photos --provider local
ps-intent search --dir /path/to/photos --query "friends having tea"
ps-intent-ui  # Launch the UI (uses PS_INTENT_PORT env var if set)
```

### Debugging

The application can be run and debugged without relying on IDE-specific extensions:

1. **Standard execution with uvicorn**:
   ```bash
   cd photo-search-intent-first
   source .venv/bin/activate
   uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Python Debugger (pdb)** - Python's built-in interactive debugger:
   ```bash
   # Launch with pdb for debugging
   python -c "import pdb; import sys; sys.path.insert(0, '.'); pdb.set_trace(); from api.server import app; import uvicorn; uvicorn.run(app, host='127.0.0.1', port=8000)"
   ```
   PDB allows you to:
   - Set breakpoints in your code
   - Step through execution line by line
   - Inspect variables and their values
   - Run Python expressions
   - Control the flow of execution for debugging purposes

3. **Debugpy for remote debugging** (install first with `pip install debugpy`):
   ```bash
   python -m debugpy --listen 5678 --wait-for-client -m uvicorn api.server:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Simple import testing** (for verifying functionality without starting the server):
   ```bash
   python -c "import sys; sys.path.insert(0, '.'); from api.server import app; print('Application loaded successfully')"
   ```

### Development Conventions

### Code Organization
- Follow Clean Architecture principles with clear separation of layers
- Use domain-driven design for business logic in usecases
- Maintain backward compatibility in API endpoints
- Document intent and design decisions in INTENT.md

### Full App Scope Approach
- Address the complete application state rather than MVP features only
- Consider the full scope of all components and their interdependencies
- Ensure all modules, not just core features, are properly functioning
- Apply fixes systematically across the entire codebase to maintain consistency

### Frontend Development
- Use TypeScript for all React components
- Implement responsive design with Tailwind CSS
- Follow React hooks best practices
- Use Zustand for state management with individual hooks per store slice
- Implement proper error handling and loading states

### Testing
- Unit tests for usecases and core logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Smoke tests that validate functionality without downloading models

### Performance Considerations
- Implement incremental indexing based on file modification times
- Use approximate nearest neighbor (ANN) search for large libraries
- Cache thumbnails and embeddings locally
- Provide batch operations for bulk actions

## Deployment

### Production Deployment
1. **Build the React frontend**:
   ```bash
   cd photo-search-intent-first/webapp
   npm run build
   ```

2. **Run the FastAPI server**:
   ```bash
   # From photo-search-intent-first directory
   python -m uvicorn api.server:app --host 0.0.0.0 --port 8000
   ```

3. **Using Docker (recommended)**:
   ```bash
   docker-compose up --build -d
   ```

### Environment Variables
- `PS_INTENT_PORT` - Port for the UI server (default: 8501)
- `HF_API_TOKEN` - Hugging Face API token for cloud models
- `OPENAI_API_KEY` - OpenAI API key for captioning and embedding

## Utility Scripts

### Curl-based Media Fetching
A set of utility scripts for fetching media assets (images, icons, audio) using curl:

1. **fetch_media.sh** - For downloading images and icons:
   - Basic downloads from any URL
   - Downloads with custom headers (for APIs requiring authentication)
   - Download and resize functionality (with ImageMagick)
   - Helpful error checking and file type verification

2. **fetch_audio.sh** - For downloading audio files:
   - Basic audio downloads
   - Downloads with custom headers
   - Bulk downloads from a list file
   - Supports various audio formats (mp3, wav, ogg, etc.)

### Usage Examples

```bash
# Download a single image
./fetch_media.sh https://example.com/icon.png website_icon.png

# Download with authentication headers
./fetch_media.sh -H "Authorization: Bearer token" https://api.example.com/chart.png chart.png

# Download and resize an image
./fetch_media.sh -r 128x128 https://example.com/avatar.jpg small_avatar.jpg

# Download a single audio file
./fetch_audio.sh https://example.com/sound.mp3 effect.mp3

# Download multiple audio files from a list
./fetch_audio.sh -l audio_list_example.txt
```

These scripts can be used with any API that returns media files, making it easy to fetch assets for the application.

## Project Status

The intent-first approach is the primary focus of ongoing development. It provides:
- More sophisticated architecture with clear separation of concerns
- Comprehensive feature set including advanced filtering and organization
- Modern React frontend with better user experience
- Extensive documentation of design intent and methodology

The classic approach serves as a simpler reference implementation with equivalent core functionality.