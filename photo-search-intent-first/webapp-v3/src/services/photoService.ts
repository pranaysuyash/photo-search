/**
 * Photo Service - High-level photo operations
 * 
 * Provides business logic layer for photo-related operations,
 * integrating with the API client and managing state updates.
 */

import { apiClient } from './apiClient';
import type { Photo, PhotoMetadata } from '../types/photo';
import type { SearchRequest, SearchResponse } from '../types/search';
import type { APIResponse } from '../types/api';

export class PhotoService {
  /**
   * Search for photos with comprehensive filtering
   */
  async searchPhotos(request: SearchRequest): Promise<SearchResponse | null> {
    try {
      const response = await apiClient.searchPhotos(request);
      
      if (!response.ok) {
        console.error('Photo search failed:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Photo search error:', error);
      return null;
    }
  }

  /**
   * Get photo metadata with caching
   */
  async getPhotoMetadata(photoPath: string): Promise<PhotoMetadata | null> {
    try {
      const response = await apiClient.getPhotoMetadata(photoPath);
      
      if (!response.ok) {
        console.error('Failed to get photo metadata:', response.error);
        return null;
      }
      
      return response.data?.metadata || null;
    } catch (error) {
      console.error('Photo metadata error:', error);
      return null;
    }
  }

  /**
   * Get optimized thumbnail URL
   */
  getThumbnailUrl(photoPath: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizeMap = {
      small: 150,
      medium: 300,
      large: 600,
    };
    
    return apiClient.getThumbnailUrl(photoPath, sizeMap[size]);
  }

  /**
   * Get full resolution photo URL
   */
  getPhotoUrl(photoPath: string): string {
    return apiClient.getPhotoUrl(photoPath);
  }

  /**
   * Toggle favorite status for a photo
   */
  async toggleFavorite(photoPath: string, favorite: boolean): Promise<boolean> {
    try {
      const response = await apiClient.toggleFavorite(photoPath, favorite);
      
      if (!response.ok) {
        console.error('Failed to toggle favorite:', response.error);
        return false;
      }
      
      return response.data?.success || false;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return false;
    }
  }

  /**
   * Find similar photos using AI similarity
   */
  async findSimilarPhotos(
    photoPath: string, 
    options: { limit?: number; threshold?: number } = {}
  ): Promise<SearchResponse | null> {
    try {
      const response = await apiClient.findSimilarPhotos({
        photoPath,
        limit: options.limit || 20,
        threshold: options.threshold || 0.8,
        includeOriginal: false,
      });
      
      if (!response.ok) {
        console.error('Similar photos search failed:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Similar photos error:', error);
      return null;
    }
  }

  /**
   * Batch update multiple photos
   */
  async batchUpdatePhotos(
    photoIds: string[], 
    operation: 'favorite' | 'unfavorite' | 'tag' | 'untag',
    parameters?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await apiClient.batchOperation({
        operation,
        photoIds,
        parameters,
      });
      
      if (!response.ok) {
        console.error('Batch operation failed:', response.error);
        return false;
      }
      
      const result = response.data;
      if (result && result.failed.length > 0) {
        console.warn('Some batch operations failed:', result.failed);
      }
      
      return true;
    } catch (error) {
      console.error('Batch operation error:', error);
      return false;
    }
  }

  /**
   * Get photo statistics for a directory
   */
  async getPhotoStats(directory: string): Promise<{
    total: number;
    indexed: number;
    favorites: number;
    tagged: number;
  } | null> {
    try {
      const response = await apiClient.getSystemStatus();
      
      if (!response.ok) {
        console.error('Failed to get photo stats:', response.error);
        return null;
      }
      
      const status = response.data;
      if (!status) return null;
      
      return {
        total: status.database.photoCount,
        indexed: status.database.photoCount, // Assuming all photos in DB are indexed
        favorites: 0, // Would need separate endpoint
        tagged: 0, // Would need separate endpoint
      };
    } catch (error) {
      console.error('Photo stats error:', error);
      return null;
    }
  }

  /**
   * Validate photo file
   */
  isValidPhotoFile(filename: string): boolean {
    const validExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      '.tiff', '.tif', '.raw', '.cr2', '.nef', '.arw',
      '.dng', '.orf', '.rw2', '.pef', '.srw', '.x3f'
    ];
    
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return validExtensions.includes(extension);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format date for display
   */
  formatPhotoDate(date: Date | string): string {
    const photoDate = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(photoDate.getTime())) {
      return 'Unknown date';
    }
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - photoDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Extract dominant colors from photo (placeholder for future implementation)
   */
  async extractColors(photoPath: string): Promise<string[]> {
    // This would integrate with a color extraction service
    // For now, return empty array
    return [];
  }

  /**
   * Generate photo caption using AI (placeholder for future implementation)
   */
  async generateCaption(photoPath: string): Promise<string | null> {
    // This would integrate with an AI captioning service
    // For now, return null
    return null;
  }
}

// Export singleton instance
export const photoService = new PhotoService();

// Export class for custom instances
export default PhotoService;