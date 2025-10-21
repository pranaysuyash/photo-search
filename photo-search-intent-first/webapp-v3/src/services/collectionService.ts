/**
 * Collection Service - High-level collection operations
 * 
 * Provides business logic for managing photo collections,
 * including smart collections with auto-updating rules.
 */

import { apiClient } from './apiClient';
import type { Collection, SmartCollectionRule } from '../types/photo';

export class CollectionService {
  /**
   * Get all collections
   */
  async getCollections(): Promise<Collection[]> {
    try {
      const response = await apiClient.getCollections();
      
      if (!response.ok) {
        console.error('Failed to get collections:', response.error);
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Get collections error:', error);
      return [];
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string,
    description?: string,
    isSmart = false,
    rules?: SmartCollectionRule[]
  ): Promise<Collection | null> {
    try {
      const collection = {
        name,
        description,
        isSmart,
        rules: rules || [],
        photoCount: 0,
      };

      const response = await apiClient.createCollection(collection);
      
      if (!response.ok) {
        console.error('Failed to create collection:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Create collection error:', error);
      return null;
    }
  }

  /**
   * Update an existing collection
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection | null> {
    try {
      const response = await apiClient.updateCollection(collectionId, updates);
      
      if (!response.ok) {
        console.error('Failed to update collection:', response.error);
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Update collection error:', error);
      return null;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    try {
      const response = await apiClient.deleteCollection(collectionId);
      
      if (!response.ok) {
        console.error('Failed to delete collection:', response.error);
        return false;
      }
      
      return response.data?.success || false;
    } catch (error) {
      console.error('Delete collection error:', error);
      return false;
    }
  }

  /**
   * Add photos to a collection
   */
  async addPhotosToCollection(
    collectionId: string,
    photoIds: string[]
  ): Promise<boolean> {
    try {
      // This would need to be implemented in the API
      // For now, simulate the operation
      console.log(`Adding ${photoIds.length} photos to collection ${collectionId}`);
      return true;
    } catch (error) {
      console.error('Add photos to collection error:', error);
      return false;
    }
  }

  /**
   * Remove photos from a collection
   */
  async removePhotosFromCollection(
    collectionId: string,
    photoIds: string[]
  ): Promise<boolean> {
    try {
      // This would need to be implemented in the API
      // For now, simulate the operation
      console.log(`Removing ${photoIds.length} photos from collection ${collectionId}`);
      return true;
    } catch (error) {
      console.error('Remove photos from collection error:', error);
      return false;
    }
  }

  /**
   * Evaluate smart collection rules
   */
  evaluateSmartCollectionRules(rules: SmartCollectionRule[]): string {
    // Convert rules to a query string that can be used for searching
    const conditions: string[] = [];
    
    for (const rule of rules) {
      let condition = '';
      
      switch (rule.field) {
        case 'date':
          if (rule.operator === 'between' && Array.isArray(rule.value)) {
            condition = `date:${rule.value[0]}..${rule.value[1]}`;
          } else if (rule.operator === 'greaterThan') {
            condition = `date:>${rule.value}`;
          } else if (rule.operator === 'lessThan') {
            condition = `date:<${rule.value}`;
          }
          break;
          
        case 'tags':
          if (rule.operator === 'contains') {
            condition = `tag:"${rule.value}"`;
          }
          break;
          
        case 'camera':
          if (rule.operator === 'equals') {
            condition = `camera:"${rule.value}"`;
          }
          break;
          
        case 'location':
          if (rule.operator === 'contains') {
            condition = `location:"${rule.value}"`;
          }
          break;
          
        case 'favorite':
          if (rule.operator === 'equals') {
            condition = rule.value ? 'is:favorite' : 'not:favorite';
          }
          break;
          
        default:
          // Generic field handling
          condition = `${rule.field}:${rule.operator}:${rule.value}`;
      }
      
      if (condition) {
        conditions.push(condition);
      }
    }
    
    // Join conditions with logical operators
    return conditions.join(' AND ');
  }

  /**
   * Create a smart collection with rules
   */
  async createSmartCollection(
    name: string,
    rules: SmartCollectionRule[],
    description?: string
  ): Promise<Collection | null> {
    return this.createCollection(name, description, true, rules);
  }

  /**
   * Update smart collection rules
   */
  async updateSmartCollectionRules(
    collectionId: string,
    rules: SmartCollectionRule[]
  ): Promise<Collection | null> {
    return this.updateCollection(collectionId, { rules, isSmart: true });
  }

  /**
   * Get photos in a collection (would need API endpoint)
   */
  async getCollectionPhotos(collectionId: string): Promise<string[]> {
    try {
      // This would need to be implemented in the API
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Get collection photos error:', error);
      return [];
    }
  }

  /**
   * Duplicate a collection
   */
  async duplicateCollection(
    sourceCollectionId: string,
    newName: string
  ): Promise<Collection | null> {
    try {
      const collections = await this.getCollections();
      const sourceCollection = collections.find(c => c.id === sourceCollectionId);
      
      if (!sourceCollection) {
        console.error('Source collection not found');
        return null;
      }
      
      return this.createCollection(
        newName,
        `Copy of ${sourceCollection.description || sourceCollection.name}`,
        sourceCollection.isSmart,
        sourceCollection.rules
      );
    } catch (error) {
      console.error('Duplicate collection error:', error);
      return null;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionId: string): Promise<{
    photoCount: number;
    totalSize: number;
    dateRange: { start: Date; end: Date } | null;
    topTags: string[];
    topCameras: string[];
  } | null> {
    try {
      // This would need to be implemented in the API
      // For now, return mock data
      return {
        photoCount: 0,
        totalSize: 0,
        dateRange: null,
        topTags: [],
        topCameras: [],
      };
    } catch (error) {
      console.error('Get collection stats error:', error);
      return null;
    }
  }

  /**
   * Export collection data
   */
  async exportCollection(
    collectionId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob | null> {
    try {
      // This would need to be implemented in the API
      // For now, return null
      return null;
    } catch (error) {
      console.error('Export collection error:', error);
      return null;
    }
  }

  /**
   * Validate collection name
   */
  validateCollectionName(name: string, existingCollections: Collection[]): {
    isValid: boolean;
    error?: string;
  } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Collection name is required' };
    }
    
    if (name.trim().length > 100) {
      return { isValid: false, error: 'Collection name is too long (max 100 characters)' };
    }
    
    const trimmedName = name.trim();
    const nameExists = existingCollections.some(
      collection => collection.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (nameExists) {
      return { isValid: false, error: 'A collection with this name already exists' };
    }
    
    return { isValid: true };
  }

  /**
   * Sort collections by various criteria
   */
  sortCollections(
    collections: Collection[],
    sortBy: 'name' | 'created' | 'updated' | 'photoCount',
    order: 'asc' | 'desc' = 'asc'
  ): Collection[] {
    const sorted = [...collections].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'photoCount':
          comparison = a.photoCount - b.photoCount;
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }
}

// Export singleton instance
export const collectionService = new CollectionService();

// Export class for custom instances
export default CollectionService;