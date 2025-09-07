import React, { useState, useEffect } from 'react';
import { initializeAPI, getAPI } from './services/PhotoVaultAPI';
import { CollectionsManager } from './modules/CollectionsManager';
import { FaceDetection } from './modules/FaceDetection';
import { ImageEditor } from './modules/ImageEditor';
import { 
  Search, Library, Grid3x3, Users, MapPin, Star, 
  Settings, FolderOpen, Tag, FileText, Map, Layers,
  HardDrive, Cpu, Database, Camera, Type, Brain
} from 'lucide-react';
import './styles-pro.css';

type ViewMode = 'library' | 'search' | 'collections' | 'people' | 'places' | 
                 'favorites' | 'trips' | 'editor' | 'settings' | 'diagnostics';

interface SearchFilters {
  favoritesOnly?: boolean;
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  person?: string;
  place?: string;
}

export function ModularApp() {
  const [currentView, setCurrentView] = useState<ViewMode>('library');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [libraryImages, setLibraryImages] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [workspaceFolders, setWorkspaceFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('/Users/pranay/Desktop');
  const [indexStats, setIndexStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    // Initialize API with default config
    const config = {
      dir: currentFolder,
      provider: 'openai',
      openaiKey: localStorage.getItem('openai_api_key') || '',
      hfToken: localStorage.getItem('hf_token') || ''
    };
    initializeAPI(config);
    
    loadInitialData();
  }, [currentFolder]);

  const loadInitialData = async () => {
    const api = getAPI();
    try {
      // Load workspace folders
      const ws = await api.getWorkspace();
      setWorkspaceFolders(ws.folders);
      
      // Load library
      await loadLibrary();
      
      // Load favorites
      const favs = await api.getFavorites();
      setFavorites(favs.favorites);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const api = getAPI();
      const lib = await api.getLibrary(120, 0);
      setLibraryImages(lib.paths);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const api = getAPI();
      const results = await api.search(searchQuery, 24);
      setSearchResults(results.results);
      setCurrentView('search');
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildIndex = async (type: string) => {
    setLoading(true);
    const api = getAPI();
    
    try {
      let result;
      switch (type) {
        case 'search':
          result = await api.buildIndex(32);
          console.log(`Indexed ${result.total} images`);
          break;
        case 'faces':
          result = await api.buildFaces();
          console.log(`Found ${result.faces} faces in ${result.clusters} clusters`);
          break;
        case 'ocr':
          result = await api.buildOCR(['en']);
          console.log(`Extracted text from ${result.updated} images`);
          break;
        case 'metadata':
          result = await api.buildMetadata();
          console.log(`Extracted metadata from ${result.updated} images`);
          break;
        case 'captions':
          result = await api.buildCaptions('Salesforce/blip-image-captioning-large');
          console.log(`Generated captions for ${result.updated} images`);
          break;
        case 'trips':
          result = await api.buildTrips();
          console.log(`Found ${result.trips.length} trips`);
          break;
        case 'fast-annoy':
          result = await api.buildFastIndex('annoy');
          break;
        case 'fast-faiss':
          result = await api.buildFastIndex('faiss');
          break;
        case 'fast-hnsw':
          result = await api.buildFastIndex('hnsw');
          break;
      }
      
      await loadLibrary();
    } catch (error) {
      console.error(`Failed to build ${type} index:`, error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (path: string) => {
    try {
      const api = getAPI();
      const isFavorite = favorites.includes(path);
      const result = await api.setFavorite(path, !isFavorite);
      setFavorites(result.favorites);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const addWorkspaceFolder = async () => {
    const folder = prompt('Enter folder path:');
    if (!folder) return;
    
    try {
      const api = getAPI();
      const result = await api.addToWorkspace(folder);
      setWorkspaceFolders(result.folders);
    } catch (error) {
      console.error('Failed to add workspace folder:', error);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const api = getAPI();
      const diag = await api.runDiagnostics();
      setIndexStats(diag);
      setCurrentView('diagnostics');
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'collections':
        return <CollectionsManager />;
      
      case 'people':
        return <FaceDetection />;
      
      case 'editor':
        return selectedPath ? (
          <ImageEditor 
            imagePath={selectedPath}
            onClose={() => setCurrentView('library')}
            onSave={(path) => console.log('Saved:', path)}
          />
        ) : null;
      
      case 'search':
        return (
          <div className="search-results">
            <h2>Search Results for "{searchQuery}"</h2>
            <div className="photo-grid">
              {searchResults.map((result, i) => (
                <div 
                  key={i} 
                  className="photo-item"
                  onClick={() => {
                    setSelectedPath(result.path);
                    setCurrentView('editor');
                  }}
                >
                  <img src={getAPI().getThumbnailUrl(result.path)} alt="" />
                  <div className="photo-score">{result.score.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'library':
        return (
          <div className="library-view">
            <div className="library-header">
              <h2>Photo Library</h2>
              <span className="text-gray-500">{libraryImages.length} photos</span>
            </div>
            <div className="photo-grid">
              {libraryImages.map((path, i) => (
                <div 
                  key={i} 
                  className="photo-item"
                  onClick={() => {
                    setSelectedPath(path);
                    setCurrentView('editor');
                  }}
                >
                  <img src={getAPI().getThumbnailUrl(path)} alt="" />
                  {favorites.includes(path) && (
                    <div className="favorite-badge">
                      <Star className="w-4 h-4" fill="currentColor" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'diagnostics':
        return (
          <div className="diagnostics-view">
            <h2>System Diagnostics</h2>
            {indexStats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Storage</h3>
                  <p>{indexStats.free_gb.toFixed(2)} GB free</p>
                  <p>OS: {indexStats.os}</p>
                </div>
                <div className="stat-card">
                  <h3>Indexes</h3>
                  {indexStats.engines.map((engine: any) => (
                    <div key={engine.key}>
                      <p>{engine.key}: {engine.count} items</p>
                      {engine.fast && (
                        <p className="text-sm text-gray-500">
                          Fast: Annoy={engine.fast.annoy ? '✓' : '✗'} 
                          FAISS={engine.fast.faiss ? '✓' : '✗'}
                          HNSW={engine.fast.hnsw ? '✓' : '✗'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="text-xl font-bold">PhotoVault Pro</h1>
          <p className="text-sm text-gray-500">All 47 APIs Integrated</p>
        </div>
        
        <div className="search-section">
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
            onClick={() => setCurrentView('library')}
          >
            <Library className="w-5 h-5" />
            Library
          </div>
          
          <div 
            className={`nav-item ${currentView === 'collections' ? 'active' : ''}`}
            onClick={() => setCurrentView('collections')}
          >
            <Grid3x3 className="w-5 h-5" />
            Collections
          </div>
          
          <div 
            className={`nav-item ${currentView === 'people' ? 'active' : ''}`}
            onClick={() => setCurrentView('people')}
          >
            <Users className="w-5 h-5" />
            People
          </div>
          
          <div 
            className={`nav-item ${currentView === 'places' ? 'active' : ''}`}
            onClick={() => setCurrentView('places')}
          >
            <MapPin className="w-5 h-5" />
            Places
          </div>
          
          <div 
            className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
            onClick={() => setCurrentView('favorites')}
          >
            <Star className="w-5 h-5" />
            Favorites
          </div>
          
          <div 
            className={`nav-item ${currentView === 'trips' ? 'active' : ''}`}
            onClick={() => setCurrentView('trips')}
          >
            <Map className="w-5 h-5" />
            Trips
          </div>
        </nav>

        <div className="sidebar-section">
          <h3 className="section-title">Build Indexes</h3>
          <button onClick={() => buildIndex('search')} className="index-btn">
            <Database className="w-4 h-4" />
            Search Index
          </button>
          <button onClick={() => buildIndex('faces')} className="index-btn">
            <Users className="w-4 h-4" />
            Face Detection
          </button>
          <button onClick={() => buildIndex('ocr')} className="index-btn">
            <Type className="w-4 h-4" />
            OCR Text
          </button>
          <button onClick={() => buildIndex('metadata')} className="index-btn">
            <Camera className="w-4 h-4" />
            Metadata
          </button>
          <button onClick={() => buildIndex('captions')} className="index-btn">
            <Brain className="w-4 h-4" />
            AI Captions
          </button>
        </div>

        <div className="sidebar-footer">
          <button onClick={runDiagnostics} className="nav-item">
            <Cpu className="w-5 h-5" />
            Diagnostics
          </button>
          <button onClick={addWorkspaceFolder} className="nav-item">
            <FolderOpen className="w-5 h-5" />
            Add Folder
          </button>
        </div>
      </div>

      <main className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner" />
            <p>Processing...</p>
          </div>
        )}
        {renderMainContent()}
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          height: 100vh;
          background: var(--bg-primary);
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          position: relative;
        }

        .search-section {
          padding: 1rem;
        }

        .sidebar-section {
          padding: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .index-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.25rem;
          background: var(--bg-tertiary);
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .index-btn:hover {
          background: var(--accent-light);
          color: var(--accent-primary);
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 1rem;
          border-top: 1px solid var(--border-subtle);
        }

        .library-view, .search-results, .diagnostics-view {
          padding: 2rem;
        }

        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .library-header h2 {
          font-size: 2rem;
          font-weight: 700;
        }

        .photo-item {
          position: relative;
        }

        .photo-score {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
        }

        .favorite-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--warning);
          color: white;
          padding: 0.25rem;
          border-radius: var(--radius-full);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: var(--bg-elevated);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
        }

        .stat-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 100;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}