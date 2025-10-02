/**
 * Smart Discovery Hook
 * Provides state management and operations for the Smart Discovery system
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SmartDiscoveryService, DiscoveryResult, DiscoveryInsights, DiscoveryOptions, DiscoveryAlgorithm } from '../services/SmartDiscoveryService';

export interface UseSmartDiscoveryOptions {
  userId?: string;
  autoLoad?: boolean;
  cacheResults?: boolean;
  trackInteractions?: boolean;
}

export interface DiscoveryState {
  recommendations: DiscoveryResult[];
  trending: DiscoveryResult[];
  forgottenGems: DiscoveryResult[];
  insights: DiscoveryInsights | null;
  loading: boolean;
  error: string | null;
  algorithm: DiscoveryAlgorithm;
  lastUpdated: Date | null;
}

export interface DiscoveryActions {
  loadRecommendations: (algorithm?: DiscoveryAlgorithm, limit?: number) => Promise<void>;
  loadTrending: (limit?: number) => Promise<void>;
  loadForgottenGems: (limit?: number) => Promise<void>;
  recordInteraction: (photo: DiscoveryResult, action: 'view' | 'favorite' | 'share' | 'edit', duration?: number) => void;
  recordSearch: (query: string, resultsCount: number, clickedResults?: string[]) => void;
  refreshAll: () => Promise<void>;
  clearCache: () => void;
  setAlgorithm: (algorithm: DiscoveryAlgorithm) => void;
  getInsights: () => Promise<DiscoveryInsights | null>;
}

export function useSmartDiscovery(options: UseSmartDiscoveryOptions = {}) {
  const {
    userId = 'default',
    autoLoad = true,
    cacheResults = true,
    trackInteractions = true
  } = options;

  const [state, setState] = useState<DiscoveryState>({
    recommendations: [],
    trending: [],
    forgottenGems: [],
    insights: null,
    loading: false,
    error: null,
    algorithm: 'hybrid',
    lastUpdated: null
  });

  const discoveryService = useMemo(() => SmartDiscoveryService.getInstance(), []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setRecommendations = useCallback((recommendations: DiscoveryResult[]) => {
    setState(prev => ({
      ...prev,
      recommendations,
      lastUpdated: new Date(),
      error: null
    }));
  }, []);

  const setTrending = useCallback((trending: DiscoveryResult[]) => {
    setState(prev => ({ ...prev, trending }));
  }, []);

  const setForgottenGems = useCallback((forgottenGems: DiscoveryResult[]) => {
    setState(prev => ({ ...prev, forgottenGems }));
  }, []);

  const setInsights = useCallback((insights: DiscoveryInsights | null) => {
    setState(prev => ({ ...prev, insights }));
  }, []);

  const setAlgorithm = useCallback((algorithm: DiscoveryAlgorithm) => {
    setState(prev => ({ ...prev, algorithm }));
  }, []);

  // Load recommendations
  const loadRecommendations = useCallback(async (algorithm?: DiscoveryAlgorithm, limit?: number) => {
    try {
      setLoading(true);
      setError(null);

      const targetAlgorithm = algorithm || state.algorithm;
      const recs = await discoveryService.getRecommendations({
        userId,
        limit: limit || 20,
        algorithm: targetAlgorithm
      });

      setRecommendations(recs);

      if (algorithm) {
        setAlgorithm(algorithm);
      }

    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [state.algorithm, userId, discoveryService, setLoading, setError, setRecommendations, setAlgorithm]);

  // Load trending photos
  const loadTrending = useCallback(async (limit?: number) => {
    try {
      const trending = await discoveryService.getTrendingPhotos(limit || 10);
      setTrending(trending);
    } catch (error) {
      console.error('Failed to load trending photos:', error);
    }
  }, [discoveryService, setTrending]);

  // Load forgotten gems
  const loadForgottenGems = useCallback(async (limit?: number) => {
    try {
      const gems = await discoveryService.getForgottenGems(limit || 10);
      setForgottenGems(gems);
    } catch (error) {
      console.error('Failed to load forgotten gems:', error);
    }
  }, [discoveryService, setForgottenGems]);

  // Load insights
  const getInsights = useCallback(async (): Promise<DiscoveryInsights | null> => {
    try {
      const insights = await discoveryService.getDiscoveryInsights(userId);
      setInsights(insights);
      return insights;
    } catch (error) {
      console.error('Failed to load insights:', error);
      return null;
    }
  }, [discoveryService, userId, setInsights]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadRecommendations(),
      loadTrending(),
      loadForgottenGems(),
      getInsights()
    ]);
  }, [loadRecommendations, loadTrending, loadForgottenGems, getInsights]);

  // Record photo interaction
  const recordInteraction = useCallback((
    photo: DiscoveryResult,
    action: 'view' | 'favorite' | 'share' | 'edit',
    duration?: number
  ) => {
    if (!trackInteractions) return;

    try {
      discoveryService.recordInteraction(photo.id, action, duration, userId);

      // Update state if this was a favorite action
      if (action === 'favorite' && photo.metadata) {
        const updatedPhoto = {
          ...photo,
          metadata: {
            ...photo.metadata,
            favorite: true
          }
        };

        setState(prev => ({
          ...prev,
          recommendations: prev.recommendations.map(p =>
            p.id === photo.id ? updatedPhoto : p
          )
        }));
      }

    } catch (error) {
      console.error('Failed to record interaction:', error);
    }
  }, [discoveryService, userId, trackInteractions]);

  // Record search interaction
  const recordSearch = useCallback((
    query: string,
    resultsCount: number,
    clickedResults: string[] = []
  ) => {
    if (!trackInteractions) return;

    try {
      discoveryService.recordSearch(query, resultsCount, clickedResults, userId);
    } catch (error) {
      console.error('Failed to record search:', error);
    }
  }, [discoveryService, userId, trackInteractions]);

  // Clear cache
  const clearCache = useCallback(() => {
    // This would be implemented in the service
    setState(prev => ({
      ...prev,
      recommendations: [],
      trending: [],
      forgottenGems: [],
      insights: null,
      lastUpdated: null
    }));
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refreshAll();
    }
  }, [autoLoad, refreshAll]);

  // Periodic refresh every 10 minutes
  useEffect(() => {
    if (!autoLoad) return;

    const interval = setInterval(() => {
      refreshAll();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [autoLoad, refreshAll]);

  const actions: DiscoveryActions = useMemo(() => ({
    loadRecommendations,
    loadTrending,
    loadForgottenGems,
    recordInteraction,
    recordSearch,
    refreshAll,
    clearCache,
    setAlgorithm,
    getInsights
  }), [
    loadRecommendations,
    loadTrending,
    loadForgottenGems,
    recordInteraction,
    recordSearch,
    refreshAll,
    clearCache,
    setAlgorithm,
    getInsights
  ]);

  return {
    ...state,
    ...actions
  };
}

export default useSmartDiscovery;
