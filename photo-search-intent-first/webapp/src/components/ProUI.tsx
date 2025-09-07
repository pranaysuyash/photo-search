import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search,
  Grid3x3,
  Map,
  Users,
  Folder,
  Star,
  Calendar,
  Heart,
  Settings,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Upload,
  Moon,
  Sun,
  Filter,
  Plus,
  X,
  Check,
  Download,
  Share2,
  Trash2,
  Info,
  ZoomIn,
  Image,
  Film,
  Clock,
  MapPin,
  Tag,
  ArrowLeft,
  MoreHorizontal,
  FolderOpen,
  Cloud,
  Sparkles
} from 'lucide-react';
import '../styles-pro.css';

// Import API functions
import {
  apiLibrary,
  apiGetMetadata,
  apiWorkspaceAdd,
  apiWorkspaceRemove,
  apiWorkspaceList,
  apiSearch,
  apiSearchWorkspace,
  thumbUrl
} from '../api';

interface Photo {
  id: string;
  path: string;
  thumbnail?: string;
  title?: string;
  date?: string;
  location?: string;
  size?: number;
  type?: string;
  selected?: boolean;
  favorite?: boolean;
  rating?: number;
}

interface ProUIProps {
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
}

const ProUI: React.FC<ProUIProps> = ({ darkMode = false, onDarkModeToggle }) => {
  // State Management
  const [selectedView, setSelectedView] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  // Load library when path changes
  useEffect(() => {
    if (libraryPath) {
      loadLibrary();
    }
  }, [libraryPath]);

  const loadWorkspace = async () => {
    try {
      const workspace = await apiWorkspaceList();
      console.log('Workspace loaded:', workspace);
      // Don't auto-select, let user choose
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  const loadLibrary = async () => {
    if (!libraryPath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading library from:', libraryPath);
      const result = await apiLibrary(libraryPath);
      
      if (!result || !result.images) {
        throw new Error('No images found in the selected folder');
      }
      
      // Transform to Photo format with proper thumbnails
      const transformedPhotos: Photo[] = result.images.map((imgPath: string, index: number) => ({
        id: `photo-${index}`,
        path: imgPath,
        thumbnail: thumbUrl(imgPath), // Use the thumbUrl function for thumbnails
        title: imgPath.split('/').pop()?.split('.')[0] || 'Untitled',
        date: new Date().toLocaleDateString(),
        type: imgPath.split('.').pop()?.toLowerCase()
      }));
      
      setPhotos(transformedPhotos);
      setError(null);
      console.log(`Loaded ${transformedPhotos.length} photos`);
    } catch (err: any) {
      console.error('Failed to load library:', err);
      setError(err.message || 'Failed to load photos from the selected folder');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await apiSearch(searchQuery, 20);
      if (results && results.results) {
        const searchPhotos = results.results.map((r: any, index: number) => ({
          id: `search-${index}`,
          path: r.image,
          thumbnail: thumbUrl(r.image),
          title: r.image.split('/').pop()?.split('.')[0],
          score: r.score
        }));
        setPhotos(searchPhotos);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    // Try native folder picker first (Electron)
    if ((window as any).electronAPI) {
      try {
        const selectedPath = await (window as any).electronAPI.selectFolder();
        if (selectedPath) {
          await handleAddPath(selectedPath);
        }
      } catch (err) {
        console.error('Failed to select folder:', err);
      }
    } else {
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the directory path from the first file
      const path = files[0].webkitRelativePath?.split('/')[0];
      if (path) {
        const fullPath = `/Users/pranay/Desktop/${path}`; // Adjust base path as needed
        await handleAddPath(fullPath);
      }
    }
  };

  const handleAddPath = async (path: string) => {
    try {
      console.log('Adding path:', path);
      await apiWorkspaceAdd(path);
      setLibraryPath(path);
      setError(null);
    } catch (err: any) {
      console.error('Failed to add path:', err);
      setError('Failed to add the selected folder');
    }
  };

  const handlePhotoSelect = (photo: Photo) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photo.id)) {
      newSelection.delete(photo.id);
    } else {
      newSelection.add(photo.id);
    }
    setSelectedPhotos(newSelection);
  };

  const handlePhotoClick = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const navItems = [
    { id: 'library', label: 'Library', icon: Grid3x3 },
    { id: 'memories', label: 'Memories', icon: Heart },
    { id: 'people', label: 'People', icon: Users },
    { id: 'places', label: 'Places', icon: Map },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  const displayPhotos = selectedView === 'memories' 
    ? photos.filter(p => p.favorite)
    : photos;

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`} style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'w-16' : ''}`} style={{ width: sidebarCollapsed ? '64px' : '260px' }}>
        <div className="sidebar-header">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <h1 className="text-title" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Photos
              </h1>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn-ghost"
              style={{ padding: '8px' }}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div style={{ marginBottom: '24px' }}>
            {!sidebarCollapsed && (
              <div className="text-overline" style={{ 
                padding: '0 16px 8px', 
                color: 'var(--text-tertiary)',
                fontSize: '11px',
                letterSpacing: '0.06em'
              }}>
                LIBRARY
              </div>
            )}
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedView(item.id)}
                  className={`nav-item ${selectedView === item.id ? 'active' : ''}`}
                  style={{ 
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    padding: sidebarCollapsed ? '12px' : '10px 16px'
                  }}
                >
                  <Icon size={20} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <div style={{ marginBottom: '24px' }}>
              <div className="text-overline" style={{ 
                padding: '0 16px 8px', 
                color: 'var(--text-tertiary)',
                fontSize: '11px',
                letterSpacing: '0.06em'
              }}>
                ALBUMS
              </div>
              <div className="nav-item">
                <Folder size={20} />
                <span>All Albums</span>
              </div>
              <div className="nav-item">
                <Star size={20} />
                <span>Favorites</span>
              </div>
            </div>
          )}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleSelectFolder}
            className="btn btn-primary"
            style={{ 
              width: '100%',
              justifyContent: 'center',
              fontSize: sidebarCollapsed ? '0' : '14px',
              padding: sidebarCollapsed ? '12px' : '10px 16px'
            }}
          >
            {sidebarCollapsed ? <Upload size={20} /> : (
              <>
                <Upload size={18} />
                <span>Import Photos</span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore - webkitdirectory is a non-standard attribute
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {!sidebarCollapsed && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '8px' }}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={onDarkModeToggle}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '8px' }}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <header style={{ 
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)'
        }}>
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="search-bar" style={{ maxWidth: '500px' }}>
              <Search size={18} style={{ 
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photos..."
                className="search-input"
              />
            </form>

            {/* Actions */}
            <div className="flex items-center gap-12px">
              {selectedPhotos.size > 0 && (
                <div className="flex items-center gap-8px" style={{ marginRight: '16px' }}>
                  <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                    {selectedPhotos.size} selected
                  </span>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px' }}>
                    <Share2 size={16} />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px' }}>
                    <Download size={16} />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', color: 'var(--error)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              {/* Grid Size Toggle */}
              <div className="flex items-center gap-4px" style={{ 
                padding: '4px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)'
              }}>
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    style={{
                      padding: '6px 12px',
                      background: gridSize === size ? 'var(--bg-primary)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: gridSize === size ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto" style={{ padding: '24px' }}>
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse" style={{ marginBottom: '16px' }}>
                  <Image size={48} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                  Loading photos...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center" style={{ maxWidth: '400px' }}>
                <Info size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
                <p className="text-body" style={{ color: 'var(--error)', marginBottom: '24px' }}>
                  {error}
                </p>
                <button
                  onClick={handleSelectFolder}
                  className="btn btn-primary"
                >
                  Select Another Folder
                </button>
              </div>
            </div>
          )}

          {!loading && !error && photos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center">
                <Folder size={64} style={{ color: 'var(--text-tertiary)', marginBottom: '24px' }} />
                <h2 className="text-headline" style={{ marginBottom: '12px', fontSize: '24px' }}>
                  No photos yet
                </h2>
                <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                  Import your photos to get started
                </p>
                <button
                  onClick={handleSelectFolder}
                  className="btn btn-primary"
                  style={{ fontSize: '16px', padding: '12px 32px' }}
                >
                  <Upload size={20} />
                  Select Photo Folder
                </button>
              </div>
            </div>
          )}

          {!loading && !error && photos.length > 0 && (
            <div 
              className="photo-grid"
              style={{
                gridTemplateColumns: gridSize === 'small' 
                  ? 'repeat(auto-fill, minmax(150px, 1fr))'
                  : gridSize === 'large'
                  ? 'repeat(auto-fill, minmax(300px, 1fr))'
                  : 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: gridSize === 'small' ? '4px' : '8px'
              }}
            >
              {displayPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="photo-item"
                  onClick={() => handlePhotoClick(index)}
                  style={{ 
                    borderRadius: gridSize === 'small' ? '4px' : '8px',
                    position: 'relative'
                  }}
                >
                  {photo.thumbnail ? (
                    <img 
                      src={photo.thumbnail} 
                      alt={photo.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                  )}
                  
                  {/* Selection Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoSelect(photo);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: selectedPhotos.has(photo.id) 
                        ? 'var(--accent-primary)'
                        : 'rgba(255, 255, 255, 0.9)',
                      border: selectedPhotos.has(photo.id)
                        ? 'none'
                        : '2px solid rgba(255, 255, 255, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: selectedPhotos.has(photo.id) ? 1 : 0,
                      transition: 'opacity var(--transition-fast)'
                    }}
                    className="photo-select"
                  >
                    {selectedPhotos.has(photo.id) && (
                      <Check size={14} style={{ color: 'white' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Lightbox */}
      {showLightbox && photos[lightboxIndex] && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-modal)'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLightbox(false);
            }}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <X size={20} />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              style={{
                position: 'absolute',
                left: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              style={{
                position: 'absolute',
                right: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <ChevronRight size={20} />
            </button>
          )}

          <img
            src={photos[lightboxIndex].path}
            alt={photos[lightboxIndex].title}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style jsx>{`
        .photo-item:hover .photo-select {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default ProUI;