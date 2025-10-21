# Photo Search - Local-First Desktop Photo Management

Photo Search is a local-first desktop photo management application that provides direct file system access for photo browsing and organization, with optional AI-powered enhancements.

## Core Features (Priority Order)

### 🖥️ Local Desktop Features (Always Available)
- **Direct File Access**: Browse photos using native file system APIs
- **Local Thumbnail Generation**: Fast thumbnail creation and caching
- **Basic Organization**: Folders, favorites, and basic metadata
- **Offline Operation**: Works completely without internet or servers
- **Native Performance**: Electron-based with direct OS integration

### 🤖 AI Enhancement Features (Optional Backend)
- **Semantic Search**: Find photos using natural language (e.g., "friends having tea")
- **Face Recognition**: People detection and management
- **OCR Support**: Text extraction from photos for searchability
- **Smart Collections**: AI-powered auto-organizing collections
- **Advanced Search**: Complex queries with AI understanding

### 🌐 Web Features (Development/Testing)
- **Browser Access**: Web-based interface for development
- **API Integration**: RESTful API for external integrations
- **Cloud Storage**: Optional cloud storage backends

## Architecture Versions

- **V1 (Legacy)**: Original React webapp with Streamlit prototype
- **V3 (Current Focus)**: Modern React + TypeScript + Vite + shadcn/ui implementation
- **Classic**: Streamlit-based proof of concept (archived)

## Development Philosophy

Follows **Intent-First Development** methodology:
- Investigate intent before acting
- Value over process
- Full feature focus (no MVP compromises)
- Proper intent validation for every feature
- Quality-first approach with complete implementations

## Target Users

- Photography enthusiasts with large photo libraries (10k+ photos)
- Users who want powerful search without cloud dependency
- Privacy-conscious users preferring local-only processing
- Professional photographers needing advanced organization tools