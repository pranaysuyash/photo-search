# Photo Search - User Guide

## Overview

Photo Search is an AI-powered photo management application that enables you to organize, search, and manage your photo collection with advanced semantic search capabilities. The application works completely offline with local AI models, ensuring your privacy while providing powerful search functionality.

## Key Features

### Offline-First Design
Photo Search is designed to work completely offline:
- **Local AI Models**: All AI processing happens on your machine
- **Instant Browsing**: Browse your photos immediately without server startup
- **Semantic Search**: Search using natural language without internet connection
- **Persistent Caching**: Frequently accessed data is cached for fast retrieval

### AI-Powered Search
- **Semantic Search**: Search photos by describing what's in them
- **OCR Text Search**: Find photos containing specific text
- **Face Recognition**: Automatically detect and group faces
- **Caption Generation**: AI-generated captions for better searchability

### Photo Organization
- **Favorites**: Mark photos as favorites for quick access
- **Tags**: Organize photos with customizable tags
- **Collections**: Create custom collections of photos
- **Smart Collections**: Automatically group photos by criteria

### Advanced Filtering
- **EXIF Filters**: Filter by camera model, ISO, aperture, etc.
- **Location Filters**: Filter by GPS coordinates and place names
- **Date Filters**: Filter by date ranges
- **Quality Filters**: Filter by sharpness and exposure

## Getting Started

### Installation

#### macOS
1. Download the `.dmg` file from the releases page
2. Open the DMG file and drag Photo Search to your Applications folder
3. Launch Photo Search from your Applications folder

#### Windows
1. Download the `.exe` installer from the releases page
2. Run the installer and follow the prompts
3. Launch Photo Search from your Start menu

#### Linux
1. Download the `.AppImage` file from the releases page
2. Make it executable: `chmod +x PhotoSearch.AppImage`
3. Run the AppImage: `./PhotoSearch.AppImage`

### First Time Setup

Upon first launch, Photo Search will:

1. **Prepare Local Models**: Download and set up AI models (one-time setup)
2. **Scan for Photos**: Index your photo library for search capability
3. **Generate Embeddings**: Create AI representations of your photos

This process may take some time depending on your library size, but it only happens once.

## Using Photo Search

### 1. Selecting a Photo Library

1. Click "Select Folder" or use the folder icon in the sidebar
2. Choose a directory containing your photos
3. Photo Search will automatically scan and index the photos

### 2. Browsing Photos

- **Grid View**: See thumbnails of all photos in a grid layout
- **Filmstrip View**: View photos in a horizontal filmstrip
- **Timeline View**: View photos organized chronologically
- **Map View**: View geotagged photos on a map

### 3. Searching Photos

#### Semantic Search
- Type natural language queries like "sunset at beach" or "family portrait"
- Photo Search uses CLIP models to understand image content
- Results are ranked by semantic similarity

#### OCR Text Search
- Search for photos containing specific text
- Enable OCR in settings to extract text from images
- Search terms like "sign", "document", or specific words

#### Metadata Search
- Filter by camera model, ISO, aperture, etc.
- Filter by date ranges
- Filter by location information
- Filter by photo dimensions

### 4. Organizing Photos

#### Favorites
- Click the heart icon on any photo to mark as favorite
- Access favorites quickly from the sidebar

#### Tags
- Click the tag icon to add/remove tags
- Tags help organize and search photos
- Create custom tags for your workflow

#### Collections
- Create collections to group related photos
- Collections can be manual or smart (automatically updated)

### 5. Advanced Features

#### Face Recognition
- Photo Search automatically detects faces in photos
- Faces are grouped by person
- Name faces for better organization

#### Smart Collections
- Automatically group photos by criteria
- Examples: "Vacation Photos", "Family Photos", etc.
- Rules-based collections that update automatically

#### Export
- Export photos to other locations
- Copy or move photos
- Batch export with various options

## Offline Operation

Photo Search works completely offline:

- **No Internet Required**: All AI processing happens locally
- **Persistent Cache**: Frequently accessed data is cached
- **Graceful Degradation**: UI remains functional even if backend restarts
- **Background Sync**: Changes are synced when services are available

## Privacy & Security

### Local Processing
- **No Data Upload**: Photos never leave your computer
- **Local AI Models**: All AI processing happens on your machine
- **Encrypted Storage**: Sensitive data is encrypted at rest

### File Access
- **Restricted Access**: Only accesses selected photo directories
- **No External Reading**: Never reads files outside selected directories
- **Transparent Operation**: Clearly shows which directories are accessed

## Performance Optimization

### Caching Strategy
Photo Search uses intelligent caching to optimize performance:

- **In-Memory Cache**: Frequently accessed data is kept in memory
- **Persistent Cache**: Important data survives app restarts
- **Smart Invalidation**: Cache automatically updates when files change

### Resource Management
- **CPU Throttling**: AI processing can be throttled to reduce system load
- **Memory Optimization**: Efficient use of system memory
- **Background Processing**: Heavy tasks run in background to keep UI responsive

## Troubleshooting

### Common Issues

#### Slow First-Time Setup
**Problem**: First-time model preparation takes a long time
**Solution**: This is normal and only happens once. Let it complete without interruption.

#### Search Results Seem Off
**Problem**: Search results don't match expectations
**Solution**: 
- Try different search terms
- Enable OCR and caption features for better searchability
- Wait for full indexing to complete

#### Photos Not Appearing
**Problem**: Some photos don't show up in the library
**Solution**:
- Check that the photo directory is correctly selected
- Verify supported file formats (.jpg, .png, .gif, .webp, .bmp, .tiff)
- Force refresh the library

### Performance Issues

#### High CPU Usage
**Problem**: CPU usage spikes during indexing
**Solution**:
- Reduce the number of concurrent indexing threads in settings
- Schedule indexing during idle times
- Pause indexing when system resources are needed

#### Memory Pressure
**Problem**: High memory usage with large libraries
**Solution**:
- Reduce cache size in settings
- Limit the number of photos indexed at once
- Restart the application to clear memory

### Offline Operation Issues

#### Service Unavailable
**Problem**: Backend service crashes or becomes unresponsive
**Solution**:
- Use the "Restart Backend" option in the settings menu
- Check that your system meets the minimum requirements
- Review logs in the user data directory

## Settings & Configuration

### General Settings
- **Theme**: Light, dark, or system theme
- **Language**: Interface language selection
- **Auto-start**: Start Photo Search when logging in

### AI & Processing
- **Model Management**: View and manage AI models
- **Processing Threads**: Control CPU usage for AI tasks
- **Feature Toggles**: Enable/disable OCR, captions, faces

### Performance
- **Cache Size**: Control memory usage for caching
- **Thumbnail Quality**: Balance quality vs. performance
- **Background Processing**: Control when background tasks run

### Privacy
- **Data Location**: View where app data is stored
- **Cache Management**: Clear caches when needed
- **Telemetry**: Control anonymous usage reporting

## Supported Formats

### Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- TIFF (.tiff, .tif)

### Video Formats
- MP4 (.mp4)
- MOV (.mov)
- AVI (.avi)
- MKV (.mkv)

### Metadata Support
- EXIF (camera, exposure, date, GPS)
- IPTC (copyright, keywords, captions)
- XMP (extended metadata)

## System Requirements

### Minimum Requirements
- **Operating System**: macOS 10.15+, Windows 10+, Ubuntu 18.04+
- **RAM**: 8GB RAM (16GB recommended)
- **Disk Space**: 500MB for application + space for AI models (~2GB)
- **CPU**: 2-core processor (4-core recommended)

### Recommended Requirements
- **Operating System**: macOS 11+, Windows 11+, Ubuntu 20.04+
- **RAM**: 16GB RAM (32GB for large libraries)
- **Disk Space**: 4GB (application + AI models + cache)
- **CPU**: 4-core processor with AVX2 support
- **GPU**: Dedicated GPU recommended for faster AI processing

## Updates & Maintenance

### Automatic Updates
Photo Search can automatically check for and install updates:
- Enabled by default
- Updates are downloaded and applied silently
- Major updates require user confirmation

### Manual Updates
1. Visit the releases page
2. Download the latest version
3. Install over the existing installation
4. Your data and settings are preserved

### Model Updates
AI models are updated periodically:
- Automatic model updates when available
- Manual model management in settings
- Rollback to previous models if needed

## FAQ

### Q: Do my photos leave my computer?
A: No. All processing happens locally. Your photos never leave your computer unless you explicitly export or share them.

### Q: How much disk space does Photo Search require?
A: The application requires about 500MB plus ~2GB for AI models. Additional space is used for caches and thumbnails.

### Q: Can I use Photo Search on multiple computers with the same library?
A: Yes, but each installation maintains its own index. You'll need to re-index on each computer.

### Q: What happens if I turn off my computer during indexing?
A: Indexing will resume from where it left off when you restart Photo Search.

### Q: Can I pause or cancel indexing?
A: Yes, indexing can be paused or canceled at any time from the settings menu.

### Q: How accurate is the semantic search?
A: Accuracy varies based on the AI models and photo content. Generally very good for common subjects and scenes.

### Q: Does Photo Search work without internet?
A: Yes, completely. All AI processing is local. Internet is only needed for initial model downloads.

### Q: How often should I update Photo Search?
A: Automatic updates are recommended. Major updates typically happen quarterly with minor updates as needed.

## Support

### Community Support
- GitHub Discussions: Ask questions and get help from the community
- Documentation: Comprehensive guides and tutorials
- Examples: Sample workflows and use cases

### Reporting Issues
- GitHub Issues: Report bugs and request features
- Include: Version, operating system, error messages, reproduction steps
- Screenshots: Helpful for visual issues

### Professional Support
Enterprise users can contact us for professional support options including:
- Priority bug fixes
- Custom feature development
- Training and onboarding
- SLA guarantees