/**
 * Debug component to test if React is working and log information
 */

import { useEffect } from 'react';
import { usePhotoStore } from '@/store/photoStore';
import { useUIStore } from '@/store/uiStore';
import { offlineModeHandler } from '@/services/offlineModeHandler';
import { fileSystemService } from '@/services/fileSystemService';
import { DEMO_LIBRARY_DIR } from '@/constants/directories';

export function DebugInfo() {
  const photoStore = usePhotoStore();
  const uiStore = useUIStore();

  useEffect(() => {
    console.log('🚀 DebugInfo component mounted');
    console.log('📱 Electron API available:', !!window.electronAPI);
    console.log('🗂️ File system service available:', fileSystemService.isAvailable());
    console.log('📴 Offline mode handler:', offlineModeHandler.getOfflineMode());
    console.log('📸 Photo store state:', {
      photos: photoStore.photos.length,
      isLoading: photoStore.isLoading,
      isOfflineMode: photoStore.isOfflineMode,
      offlineCapabilities: photoStore.offlineCapabilities
    });
    console.log('🎨 UI store state:', {
      toasts: uiStore.toasts.length,
      theme: uiStore.theme,
      currentView: uiStore.currentView
    });

    // Test offline mode handler
    offlineModeHandler.checkBackendAvailability().then(available => {
      console.log('🌐 Backend availability check result:', available);
    });

    // Test file system service if available
    if (fileSystemService.isAvailable()) {
      fileSystemService.getPhotoDirectories().then(dirs => {
        console.log('📁 Current photo directories:', dirs);
      });

      // Note: Directory scanning requires directories to be added to allowed list first
      console.log('ℹ️ Directory scanning requires explicit permission - use "Test Offline Photos" button');
    }

    // Show a toast to confirm the app is working
    if (uiStore.addToast) {
      uiStore.addToast({
        type: 'success',
        title: 'Local-First Photo App Ready!',
        message: `Desktop: ${!!window.electronAPI ? 'Yes' : 'No'}, AI: ${offlineModeHandler.getOfflineMode().backendAvailable ? 'Enhanced' : 'Local Models'}`,
        duration: 5000
      });
    }
  }, []);

  const testOfflinePhotos = async () => {
    if (!fileSystemService.isAvailable()) {
      console.log('❌ File system service not available');
      return;
    }

    try {
      console.log('🔄 Loading demo photos...');
      
      // Use the photoStore method to add directory and load photos
      await photoStore.addPhotoDirectory(DEMO_LIBRARY_DIR);
      await photoStore.loadPhotosOffline();
      
      console.log('✅ Successfully loaded photos in offline mode');
      
      if (uiStore.addToast) {
        uiStore.addToast({
          type: 'success',
          title: 'Demo Photos Loaded!',
          message: `Found ${photoStore.photos.length} photos in local-first mode`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('❌ Failed to load offline photos:', error);
      
      if (uiStore.addToast) {
        uiStore.addToast({
          type: 'error',
          title: 'Demo Load Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000
        });
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">🔧 Debug Info</h3>
      <div className="space-y-1">
        <div>React App: ✅ Running</div>
        <div>Desktop Mode: {window.electronAPI ? '✅ Electron' : '❌ Browser'}</div>
        <div>File Access: {fileSystemService.isAvailable() ? '✅ Direct' : '❌ Limited'}</div>
        <div>Photos Loaded: {photoStore.photos.length}</div>
        <div>Local-First: {fileSystemService.isAvailable() ? '✅ Active' : '❌ Unavailable'}</div>
        <div>AI Backend: {offlineModeHandler.getOfflineMode().backendAvailable ? '✅ Enhanced' : '⏳ Starting/Offline'}</div>
        <div>Loading: {photoStore.isLoading ? '🔄 Yes' : '✅ No'}</div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600">
        {fileSystemService.isAvailable() ? (
          <div className="text-green-400">✅ Local-first photo app ready!</div>
        ) : (
          <div className="text-yellow-400">⚠️ Running in browser mode</div>
        )}
        {fileSystemService.isAvailable() && (
          <button
            onClick={testOfflinePhotos}
            className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            📸 Load Demo Photos
          </button>
        )}
      </div>
    </div>
  );
}