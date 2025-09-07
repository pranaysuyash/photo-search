import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModernSidebar from './ModernSidebar';
import EnhancedSearchBar from './EnhancedSearchBar';
import AnimatedPhotoGrid from './AnimatedPhotoGrid';
import ModernLightbox from './ModernLightbox';
import { 
  Upload, 
  FolderOpen, 
  Settings, 
  Bell,
  Cloud,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

// Import API functions from existing api.ts
import {
  apiLibrary,
  apiGetMetadata,
  apiWorkspaceAdd,
  apiWorkspaceRemove,
  apiWorkspaceList,
  apiSearch,
  apiSearchWorkspace
} from '../api';

interface Photo {
  id: string;
  path: string;
  thumbnail?: string;
  fullPath?: string;
  title?: string;
  date?: string;
  location?: string;
  people?: string[];
  rating?: number;
  favorite?: boolean;
  selected?: boolean;
  width?: number;
  height?: number;
  aiScore?: number;
  tags?: string[];
}

interface ModernAppProps {
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
}

const ModernApp: React.FC<ModernAppProps> = ({
  darkMode = false,
  onDarkModeToggle
}) => {
  // State management
  const [selectedView, setSelectedView] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Sidebar state
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalPhotos: 0,
    collections: 0,
    people: 0,
    favorites: 0
  });

  const [aiStatus, setAiStatus] = useState({
    indexReady: false,
    fastIndexType: 'FAISS',
    freeSpace: 0
  });

  // Library management
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inputPath, setInputPath] = useState('');

  // Load initial data
  useEffect(() => {
    loadWorkspace();
  }, []);

  // Load library when path changes
  useEffect(() => {
    if (libraryPath) {
      loadLibrary();
    }
  }, [libraryPath]);

  // Filter photos based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = photos.filter(photo => {
        const searchLower = searchQuery.toLowerCase();
        return (
          photo.title?.toLowerCase().includes(searchLower) ||
          photo.location?.toLowerCase().includes(searchLower) ||
          photo.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          photo.people?.some(person => person.toLowerCase().includes(searchLower))
        );
      });
      setFilteredPhotos(filtered);
    } else {
      setFilteredPhotos(photos);
    }
  }, [searchQuery, photos]);

  // Update stats when photos change
  useEffect(() => {
    setStats({
      totalPhotos: photos.length,
      collections: Math.floor(photos.length / 20), // Mock calculation
      people: Array.from(new Set(photos.flatMap(p => p.people || []))).length,
      favorites: photos.filter(p => p.favorite).length
    });
  }, [photos]);

  const loadWorkspace = async () => {
    try {
      console.log('Loading workspace...');
      const workspace = await apiWorkspaceList();
      console.log('Workspace loaded:', workspace);
      // Don't auto-select a folder, let user choose
      // if (workspace.folders && workspace.folders.length > 0) {
      //   setLibraryPath(workspace.folders[0]);
      // }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  const loadLibrary = async () => {
    if (!libraryPath) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiLibrary(libraryPath);
      
      // Transform API response to Photo format
      const transformedPhotos: Photo[] = result.images.map((imgPath: string, index: number) => ({
        id: `photo-${index}`,
        path: imgPath,
        thumbnail: imgPath, // In real app, would generate thumbnails
        fullPath: imgPath,
        title: imgPath.split('/').pop()?.split('.')[0],
        date: new Date().toLocaleDateString(),
        rating: Math.floor(Math.random() * 5) + 1,
        favorite: Math.random() > 0.7,
        aiScore: Math.random(),
        tags: ['nature', 'landscape', 'sunset'].filter(() => Math.random() > 0.5)
      }));
      
      setPhotos(transformedPhotos);
      setAiStatus(prev => ({ ...prev, indexReady: true }));
      
      showNotification('success', `Loaded ${transformedPhotos.length} photos`);
    } catch (err) {
      setError('Failed to load library');
      showNotification('error', 'Failed to load photo library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setFilteredPhotos(photos);
      return;
    }

    setLoading(true);
    try {
      // Try AI search first
      const results = await apiSearch(query, 10);
      
      if (results && results.results) {
        const searchResultPaths = results.results.map((r: any) => r.image);
        const searchPhotos = photos.filter(p => searchResultPaths.includes(p.path));
        setFilteredPhotos(searchPhotos);
        showNotification('success', `Found ${searchPhotos.length} matching photos`);
      }
    } catch (err) {
      // Fallback to local search
      console.warn('AI search failed, using local search:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLibrary = () => {
    setShowFolderModal(true);
  };

  const handleAddPath = async (path: string) => {
    console.log('Adding path:', path);
    try {
      const result = await apiWorkspaceAdd(path);
      console.log('Workspace add result:', result);
      setLibraryPath(path);
      setShowFolderModal(false);
      showNotification('success', 'Library path updated');
    } catch (err) {
      console.error('Failed to add path:', err);
      showNotification('error', `Failed to add library path: ${err}`);
    }
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handlePhotoSelect = (photo: Photo, selected: boolean) => {
    const newSelection = new Set(selectedPhotos);
    if (selected) {
      newSelection.add(photo.id);
    } else {
      newSelection.delete(photo.id);
    }
    setSelectedPhotos(newSelection);
  };

  const handlePhotoAction = (action: string, photo: Photo) => {
    switch (action) {
      case 'favorite':
        // Toggle favorite
        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { ...p, favorite: !p.favorite } : p
        ));
        break;
      case 'rate':
        // Update rating
        const { rating } = photo as any;
        setPhotos(prev => prev.map(p => 
          p.id === photo.id ? { ...p, rating } : p
        ));
        break;
      case 'delete':
        // Delete photo
        setPhotos(prev => prev.filter(p => p.id !== photo.id));
        showNotification('info', 'Photo deleted');
        break;
      case 'clearSelection':
        setSelectedPhotos(new Set());
        break;
      default:
        console.log(`Action ${action} on photo ${photo.id}`);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const displayPhotos = searchQuery ? filteredPhotos : 
    selectedView === 'library' ? photos :
    selectedView === 'memories' ? photos.filter(p => p.favorite) :
    selectedView === 'people' ? photos.filter(p => p.people && p.people.length > 0) :
    photos;

  return (
    <div className={clsx('flex h-screen bg-gray-50 dark:bg-gray-900', {
      'dark': darkMode
    })}>
      {/* Sidebar */}
      <ModernSidebar
        selectedView={selectedView}
        onViewChange={setSelectedView}
        stats={stats}
        aiStatus={aiStatus}
        darkMode={darkMode}
        onDarkModeToggle={onDarkModeToggle}
        onSettingsClick={() => setShowSettingsModal(true)}
        onSelectLibrary={handleSelectLibrary}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <EnhancedSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onFilterClick={() => setShowFilters(!showFilters)}
              showFilters={showFilters}
              isSearching={loading}
              className="flex-1 max-w-3xl"
            />

            <div className="flex items-center gap-4 ml-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSelectLibrary}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Import</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-12 h-12 text-blue-500" />
              </motion.div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
              <p className="text-lg">{error}</p>
            </div>
          )}

          {!loading && !error && displayPhotos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FolderOpen className="w-16 h-16 mb-4" />
              <p className="text-lg">No photos found</p>
              <button
                onClick={handleSelectLibrary}
                className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                Select Library Folder
              </button>
            </div>
          )}

          {!loading && !error && displayPhotos.length > 0 && (
            <AnimatedPhotoGrid
              photos={displayPhotos}
              onPhotoClick={handlePhotoClick}
              onPhotoSelect={handlePhotoSelect}
              onPhotoAction={handlePhotoAction}
              selectedPhotos={selectedPhotos}
              viewMode="grid"
              gridSize="medium"
              showMetadata={true}
              enableSelection={true}
              enableHover={true}
            />
          )}
        </main>
      </div>

      {/* Lightbox */}
      <ModernLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={displayPhotos}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
        onPhotoAction={handlePhotoAction}
        enableZoom={true}
        enableRotation={true}
        showThumbnails={true}
        showInfo={true}
      />

      {/* Folder Selection Modal */}
      <AnimatePresence>
        {showFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFolderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Select Library Folder
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose a folder containing your photos
              </p>
              
              {/* Native folder picker for Electron */}
              {(window as any).electronAPI && (
                <button
                  onClick={async () => {
                    try {
                      const selectedPath = await (window as any).electronAPI.selectFolder();
                      if (selectedPath) {
                        setInputPath(selectedPath);
                      }
                    } catch (err) {
                      console.error('Failed to select folder:', err);
                    }
                  }}
                  className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-5 h-5" />
                  Browse for Folder
                </button>
              )}
              
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/path/to/photos"
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputPath) {
                    handleAddPath(inputPath);
                  }
                }}
                onPaste={(e) => {
                  // Ensure paste works properly
                  e.stopPropagation();
                }}
                autoFocus
              />
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setInputPath('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (inputPath) {
                      handleAddPath(inputPath);
                      setInputPath('');
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Select Folder
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={clsx(
              'fixed top-8 left-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3',
              {
                'bg-green-500 text-white': notification.type === 'success',
                'bg-red-500 text-white': notification.type === 'error',
                'bg-blue-500 text-white': notification.type === 'info'
              }
            )}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Sparkles className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernApp;