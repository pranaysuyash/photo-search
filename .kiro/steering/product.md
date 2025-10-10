# Photo Search - AI-Powered Photo Management

Photo Search is an offline-first desktop photo management application that uses AI-powered semantic search to help users find photos using natural language queries.

## Core Features

- **Semantic Search**: Find photos using natural language (e.g., "friends having tea", "beach sunset")
- **Offline-First**: Works completely offline with bundled CLIP models
- **Desktop Application**: Electron-based desktop app with direct file system access
- **Multiple Storage Backends**: File-based or SQLite storage for metadata and embeddings
- **Advanced Organization**: Collections, tags, favorites, and smart collections
- **Map Integration**: GPS-based photo plotting and location search
- **Face Recognition**: People detection and management
- **OCR Support**: Text extraction from photos for searchability

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