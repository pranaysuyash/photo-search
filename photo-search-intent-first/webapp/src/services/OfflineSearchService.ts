/**
 * Offline Search Service
 * Provides local search capabilities when offline
 */

import { SearchResult } from "../api";

export interface OfflinePhotoMetadata {
  path: string;
  filename: string;
  tags?: string[];
  caption?: string;
  ocrText?: string;
  camera?: string;
  date?: number;
  location?: {
    lat: number;
    lon: number;
  };
}

export class OfflineSearchService {
  private metadataCache: Map<string, OfflinePhotoMetadata> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  /**
   * Initialize the offline search service with photo metadata
   */
  async initialize(photoPaths: string[]): Promise<void> {
    // In a real implementation, this would load metadata from local storage
    // For now, we'll create a simple cache
    for (const path of photoPaths) {
      // In a real implementation, we would load actual metadata
      const metadata: OfflinePhotoMetadata = {
        path,
        filename: path.split('/').pop() || path,
        tags: [],
        caption: "",
        ocrText: "",
        camera: "",
        date: Date.now(),
      };
      
      this.metadataCache.set(path, metadata);
      this.indexPhoto(metadata);
    }
  }

  /**
   * Index a photo's metadata for search
   */
  private indexPhoto(metadata: OfflinePhotoMetadata): void {
    const terms = this.extractSearchTerms(metadata);
    
    for (const term of terms) {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(metadata.path);
    }
  }

  /**
   * Extract searchable terms from photo metadata
   */
  private extractSearchTerms(metadata: OfflinePhotoMetadata): string[] {
    const terms: string[] = [];
    
    // Add filename terms
    const filename = metadata.filename.toLowerCase();
    terms.push(...this.tokenize(filename));
    
    // Add tag terms
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        terms.push(...this.tokenize(tag.toLowerCase()));
      }
    }
    
    // Add caption terms
    if (metadata.caption) {
      terms.push(...this.tokenize(metadata.caption.toLowerCase()));
    }
    
    // Add OCR text terms
    if (metadata.ocrText) {
      terms.push(...this.tokenize(metadata.ocrText.toLowerCase()));
    }
    
    // Add camera terms
    if (metadata.camera) {
      terms.push(...this.tokenize(metadata.camera.toLowerCase()));
    }
    
    // Remove duplicates and empty terms
    return [...new Set(terms.filter(term => term.length > 0))];
  }

  /**
   * Tokenize text into search terms
   */
  private tokenize(text: string): string[] {
    // Simple tokenization - split by whitespace and remove punctuation
    return text
      .split(/\s+/)
      .map(term => term.replace(/[^\w]/g, ''))
      .filter(term => term.length > 0);
  }

  /**
   * Perform offline search
   */
  async search(query: string, topK: number = 24): Promise<{ results: SearchResult[]; search_id: string }> {
    const queryTerms = this.tokenize(query.toLowerCase());
    
    if (queryTerms.length === 0) {
      return { results: [], search_id: this.generateSearchId() };
    }
    
    // Find matching photos
    const matchingPhotos = new Map<string, number>();
    
    for (const term of queryTerms) {
      const photosWithTerm = this.searchIndex.get(term) || new Set();
      
      for (const photoPath of photosWithTerm) {
        const currentCount = matchingPhotos.get(photoPath) || 0;
        matchingPhotos.set(photoPath, currentCount + 1);
      }
    }
    
    // Sort by relevance (number of matching terms)
    const sortedResults = [...matchingPhotos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([path, score]) => ({
        path,
        score: score / queryTerms.length, // Normalize score
      }));
    
    return {
      results: sortedResults,
      search_id: this.generateSearchId()
    };
  }

  /**
   * Update metadata for a photo
   */
  updatePhotoMetadata(path: string, metadata: Partial<OfflinePhotoMetadata>): void {
    if (this.metadataCache.has(path)) {
      const existing = this.metadataCache.get(path)!;
      const updated = { ...existing, ...metadata };
      this.metadataCache.set(path, updated);
      
      // Re-index the photo
      this.removePhotoFromIndex(path);
      this.indexPhoto(updated);
    }
  }

  /**
   * Remove a photo from the search index
   */
  private removePhotoFromIndex(path: string): void {
    // Remove from all term indexes
    for (const [term, photoSet] of this.searchIndex.entries()) {
      photoSet.delete(path);
      // Clean up empty term entries
      if (photoSet.size === 0) {
        this.searchIndex.delete(term);
      }
    }
  }

  /**
   * Add a new photo to the search index
   */
  addPhoto(metadata: OfflinePhotoMetadata): void {
    this.metadataCache.set(metadata.path, metadata);
    this.indexPhoto(metadata);
  }

  /**
   * Remove a photo from the search index
   */
  removePhoto(path: string): void {
    this.metadataCache.delete(path);
    this.removePhotoFromIndex(path);
  }

  /**
   * Get cached metadata for a photo
   */
  getPhotoMetadata(path: string): OfflinePhotoMetadata | undefined {
    return this.metadataCache.get(path);
  }

  /**
   * Get all cached metadata
   */
  getAllMetadata(): OfflinePhotoMetadata[] {
    return Array.from(this.metadataCache.values());
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.metadataCache.clear();
    this.searchIndex.clear();
  }

  /**
   * Generate a unique search ID
   */
  private generateSearchId(): string {
    return `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if offline search is available
   */
  isAvailable(): boolean {
    return this.metadataCache.size > 0;
  }

  /**
   * Get the number of indexed photos
   */
  getIndexedPhotoCount(): number {
    return this.metadataCache.size;
  }
}

// Singleton instance
export const offlineSearchService = new OfflineSearchService();