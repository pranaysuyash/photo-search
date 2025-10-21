/**
 * Services Index - Central export for all service classes
 * 
 * Provides convenient imports for all application services and the API client.
 */

// API Client
export { apiClient, APIClient } from './apiClient';

// Service Classes
export { photoService, PhotoService } from './photoService';
export { collectionService, CollectionService } from './collectionService';
export { searchService, SearchService } from './searchService';

// Legacy API (for backward compatibility)
export { apiClient as api } from './api';

// Re-export commonly used service instances
export const services = {
  photo: photoService,
  collection: collectionService,
  search: searchService,
  api: apiClient,
};

// Service factory for creating custom instances
export const createServices = (apiConfig?: any) => {
  const customApiClient = new APIClient(apiConfig);
  
  return {
    photo: new PhotoService(),
    collection: new CollectionService(),
    search: new SearchService(),
    api: customApiClient,
  };
};