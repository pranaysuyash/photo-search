/**
 * Test suite for offline-first React hooks
 */

import { QueryClient, type QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-hooks';
import { useOfflineFirstLibrary, useOfflineFirstMetadata, useOfflineFirstSearch } from '../hooks/useOfflineFirst';

// Mock the API functions
jest.mock('../api/offline', () => ({
  offlineCapableSearch: jest.fn(),
  offlineCapableGetLibrary: jest.fn(),
  offlineCapableGetMetadata: jest.fn()
}));

jest.mock('../api', () => ({
  apiSearch: jest.fn(),
  apiLibrary: jest.fn(),
  apiGetMetadata: jest.fn()
}));

const { offlineCapableSearch, offlineCapableGetLibrary, offlineCapableGetMetadata } = require('../api/offline');
const { apiSearch, apiLibrary, apiGetMetadata } = require('../api');

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOfflineFirstSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached results when available', async () => {
    const mockResults = [{ path: '/photo1.jpg', score: 0.9 }];
    offlineCapableSearch.mockResolvedValue(mockResults);
    apiSearch.mockResolvedValue({ results: mockResults, search_time_ms: 100 });

    const { result, waitFor } = renderHook(
      () => useOfflineFirstSearch('/test/dir', 'test query'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual({
      results: mockResults,
      isCached: true,
      cacheHit: true
    });
    expect(offlineCapableSearch).toHaveBeenCalledWith('/test/dir', 'test query', 'local', 24);
  });

  it('should fall back to online search when offline fails', async () => {
    const mockResults = [{ path: '/photo1.jpg', score: 0.9 }];
    offlineCapableSearch.mockResolvedValue(null);
    apiSearch.mockResolvedValue({ results: mockResults, search_time_ms: 100 });

    const { result, waitFor } = renderHook(
      () => useOfflineFirstSearch('/test/dir', 'test query'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual({
      results: mockResults,
      isCached: false,
      cacheHit: false,
      searchTimeMs: 100
    });
    expect(apiSearch).toHaveBeenCalledWith('/test/dir', 'test query', 'local', 24, {});
  });

  it('should handle errors gracefully', async () => {
    offlineCapableSearch.mockRejectedValue(new Error('Offline failed'));
    apiSearch.mockRejectedValue(new Error('Online failed'));

    const { result, waitFor } = renderHook(
      () => useOfflineFirstSearch('/test/dir', 'test query'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isError);

    expect(result.current.error).toBeDefined();
  });
});

describe('useOfflineFirstLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached photos when available', async () => {
    const mockPhotos = [{ path: '/photo1.jpg', id: 'photo1' }];
    offlineCapableGetLibrary.mockResolvedValue(mockPhotos);
    apiLibrary.mockResolvedValue({ paths: ['/photo1.jpg'], total: 1 });

    const { result, waitFor } = renderHook(
      () => useOfflineFirstLibrary('/test/dir'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual({
      photos: mockPhotos,
      isCached: true,
      cacheHit: true,
      totalCount: 1
    });
    expect(offlineCapableGetLibrary).toHaveBeenCalledWith('/test/dir');
  });

  it('should handle pagination correctly', async () => {
    const mockPhotos = Array.from({ length: 50 }, (_, i) => ({ 
      path: `/photo${i}.jpg`, 
      id: `photo${i}` 
    }));
    offlineCapableGetLibrary.mockResolvedValue(mockPhotos);

    const { result, waitFor } = renderHook(
      () => useOfflineFirstLibrary('/test/dir', { limit: 10, offset: 20 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data.photos).toHaveLength(10);
    expect(result.current.data.totalCount).toBe(50);
  });
});

describe('useOfflineFirstMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached metadata when available', async () => {
    const mockMetadata = { 
      width: 1920, 
      height: 1080, 
      size_bytes: 1024000 
    };
    offlineCapableGetMetadata.mockResolvedValue(mockMetadata);
    apiGetMetadata.mockResolvedValue(mockMetadata);

    const { result, waitFor } = renderHook(
      () => useOfflineFirstMetadata('/test/dir', '/test/dir/photo1.jpg'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(mockMetadata);
    expect(offlineCapableGetMetadata).toHaveBeenCalledWith('/test/dir', '/test/dir/photo1.jpg');
  });

  it('should fall back to online metadata when offline fails', async () => {
    offlineCapableGetMetadata.mockResolvedValue(null);
    const mockMetadata = { width: 1920, height: 1080 };
    apiGetMetadata.mockResolvedValue(mockMetadata);

    const { result, waitFor } = renderHook(
      () => useOfflineFirstMetadata('/test/dir', '/test/dir/photo1.jpg'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(mockMetadata);
    expect(apiGetMetadata).toHaveBeenCalledWith('/test/dir', '/test/dir/photo1.jpg');
  });
});