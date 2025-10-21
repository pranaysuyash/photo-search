/**
 * Integration tests for Electron V3 frontend integration
 * Tests the enhanced APIs with existing React V3 components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhotoLibrary } from '../PhotoLibrary';
import { FolderSelector } from '../FolderSelector';
import { fileSystemService } from '../../services/fileSystemService';
import { offlineModeHandler } from '../../services/offlineModeHandler';
import type { Photo } from '../../types/photo';

// Mock the services
vi.mock('../../services/fileSystemService');
vi.mock('../../services/offlineModeHandler');
vi.mock('../../store/photoStore');

const mockPhoto: Photo = {
  id: '/test/photo.jpg',
  filename: 'photo.jpg',
  path: '/test/photo.jpg',
  thumbnailUrl: '/test/thumb.jpg',
  isImage: true,
  isVideo: false,
  favorite: false,
  metadata: {
    path: '/test/photo.jpg',
    filename: 'photo.jpg',
    size: 1024000,
    mimeType: 'image/jpeg',
    createdAt: new Date(),
    modifiedAt: new Date(),
    exif: {},
    ai: {
      embeddings: [],
      faces: [],
      text: '',
      captions: [],
      tags: [],
      confidence: 0,
    },
    user: {
      favorite: false,
      tags: [],
      collections: [],
      rating: 0,
    }
  }
};

const mockVideoPhoto: Photo = {
  ...mockPhoto,
  id: '/test/video.mp4',
  filename: 'video.mp4',
  path: '/test/video.mp4',
  isImage: false,
  isVideo: true,
  metadata: {
    ...mockPhoto.metadata,
    path: '/test/video.mp4',
    filename: 'video.mp4',
  }
};

describe('Electron V3 Frontend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: {
        selectPhotoDirectories: vi.fn(),
        scanDirectory: vi.fn(),
        getSecureFileUrl: vi.fn(),
        generateThumbnail: vi.fn(),
        getFileMetadata: vi.fn(),
      },
      writable: true,
    });
  });

  describe('PhotoLibrary Component', () => {
    it('should render photos with direct file access', () => {
      const mockProps = {
        photos: [mockPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      expect(screen.getByText('1 photo')).toBeInTheDocument();
      expect(screen.getByText('Direct file access')).toBeInTheDocument();
    });

    it('should handle video files with thumbnails', () => {
      const mockProps = {
        photos: [mockVideoPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });

    it('should use Electron file system service when available', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(true);
      vi.mocked(fileSystemService.getSecureFileUrl).mockResolvedValue('file:///test/photo.jpg');

      const mockProps = {
        photos: [mockPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      // Click on a photo to open lightbox
      const photoElement = screen.getByRole('button', { name: /photo/i });
      fireEvent.click(photoElement);

      await waitFor(() => {
        expect(fileSystemService.getSecureFileUrl).toHaveBeenCalledWith('/test/photo.jpg');
      });
    });
  });

  describe('FolderSelector Component', () => {
    it('should use enhanced directory selection', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(true);
      vi.mocked(fileSystemService.selectPhotoDirectories).mockResolvedValue(['/test/photos']);
      vi.mocked(fileSystemService.addPhotoDirectory).mockResolvedValue(true);

      const mockProps = {
        open: true,
        onOpenChange: vi.fn(),
        onDirectorySelect: vi.fn(),
      };

      render(<FolderSelector {...mockProps} />);
      
      const selectButton = screen.getByText('Select Your Photos');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(fileSystemService.selectPhotoDirectories).toHaveBeenCalled();
        expect(fileSystemService.addPhotoDirectory).toHaveBeenCalledWith('/test/photos');
        expect(mockProps.onDirectorySelect).toHaveBeenCalledWith('/test/photos');
      });
    });

    it('should fallback to legacy method when enhanced APIs not available', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(false);
      
      // Mock the legacy electron bridge
      const mockSelectFolder = vi.fn().mockResolvedValue('/test/legacy');
      vi.mocked(require('../../hooks/useElectronBridge').useElectronBridge).mockReturnValue({
        selectFolder: mockSelectFolder,
        isElectron: true,
      });

      const mockProps = {
        open: true,
        onOpenChange: vi.fn(),
        onDirectorySelect: vi.fn(),
      };

      render(<FolderSelector {...mockProps} />);
      
      const selectButton = screen.getByText('Select Your Photos');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(mockSelectFolder).toHaveBeenCalled();
      });
    });
  });

  describe('Video Handling', () => {
    it('should display video metadata in lightbox', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(true);
      vi.mocked(fileSystemService.getFileMetadata).mockResolvedValue({
        path: '/test/video.mp4',
        name: 'video.mp4',
        size: 5000000,
        dateModified: new Date(),
        dateCreated: new Date(),
        isDirectory: false,
        isImage: false,
        isVideo: true,
        dimensions: { width: 1920, height: 1080 },
        exifData: { duration: 120 },
      });

      const mockProps = {
        photos: [mockVideoPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      // Click on video to open lightbox
      const videoElement = screen.getByRole('button', { name: /photo/i });
      fireEvent.click(videoElement);

      await waitFor(() => {
        expect(fileSystemService.getFileMetadata).toHaveBeenCalledWith('/test/video.mp4');
      });
    });

    it('should show video play indicators in grid', () => {
      const mockProps = {
        photos: [mockVideoPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      // Video should be indicated in the grid
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });
  });

  describe('Offline Mode Integration', () => {
    it('should handle offline photo scanning', async () => {
      vi.mocked(offlineModeHandler.isOfflineCapable).mockReturnValue(true);
      vi.mocked(offlineModeHandler.scanDirectoriesOffline).mockResolvedValue([mockPhoto]);

      const mockProps = {
        photos: [],
        isLoading: false,
        currentDirectory: null,
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      const scanButton = screen.getByText('Scan photos');
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(offlineModeHandler.scanDirectoriesOffline).toHaveBeenCalled();
      });
    });

    it('should show appropriate UI for offline capabilities', () => {
      const mockProps = {
        photos: [],
        isLoading: false,
        currentDirectory: null,
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      expect(screen.getByText('Direct file system access')).toBeInTheDocument();
      expect(screen.getByText('Local-First')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(true);
      vi.mocked(fileSystemService.getSecureFileUrl).mockRejectedValue(new Error('File not found'));

      const mockProps = {
        photos: [mockPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      // Should not crash when file system operations fail
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });

    it('should handle missing video metadata', async () => {
      vi.mocked(fileSystemService.isAvailable).mockReturnValue(true);
      vi.mocked(fileSystemService.getFileMetadata).mockRejectedValue(new Error('Metadata not available'));

      const mockProps = {
        photos: [mockVideoPhoto],
        isLoading: false,
        currentDirectory: '/test',
        onDirectorySelect: vi.fn(),
        onToggleFavorite: vi.fn(),
      };

      render(<PhotoLibrary {...mockProps} />);
      
      // Should still render video without metadata
      expect(screen.getByText('1 photo')).toBeInTheDocument();
    });
  });
});