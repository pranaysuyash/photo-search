/**
 * Library Store - Manages photo library state, directories, and indexing
 * 
 * Handles library selection, photo loading, indexing status, and directory management.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LibraryStoreState } from '../types/store';

const initialState = {
  collections: [] as any[],
  selectedCollection: null,
  tags: [] as any[],
  tagSuggestions: [] as string[],
  people: [] as any[],
  selectedPerson: null,
  places: [] as any[],
  selectedPlace: null,
  trips: [] as any[],
  selectedTrip: null,
  importStatus: null,
  isLoadingCollections: false,
  isLoadingTags: false,
  isLoadingPeople: false,
  isLoadingPlaces: false,
};

export const useLibraryStore = create<LibraryStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Collections
      setCollections: (collections) =>
        set({ collections, isLoadingCollections: false }),

      addCollection: (collection) =>
        set((state) => ({
          collections: [...state.collections, collection],
        })),

      updateCollection: (collectionId, updates) =>
        set((state) => ({
          collections: state.collections.map(collection =>
            collection.id === collectionId
              ? { ...collection, ...updates, updatedAt: new Date() }
              : collection
          ),
          selectedCollection: state.selectedCollection?.id === collectionId
            ? { ...state.selectedCollection, ...updates, updatedAt: new Date() }
            : state.selectedCollection,
        })),

      removeCollection: (collectionId) =>
        set((state) => ({
          collections: state.collections.filter(c => c.id !== collectionId),
          selectedCollection: state.selectedCollection?.id === collectionId
            ? null
            : state.selectedCollection,
        })),

      setSelectedCollection: (selectedCollection) =>
        set({ selectedCollection }),

      // Tags
      setTags: (tags) =>
        set({ tags, isLoadingTags: false }),

      addTag: (tag) =>
        set((state) => ({
          tags: [...state.tags, tag],
        })),

      updateTag: (tagId, updates) =>
        set((state) => ({
          tags: state.tags.map(tag =>
            tag.id === tagId ? { ...tag, ...updates } : tag
          ),
        })),

      removeTag: (tagId) =>
        set((state) => ({
          tags: state.tags.filter(t => t.id !== tagId),
        })),

      loadTagSuggestions: async (query) => {
        try {
          // This would call the actual API
          // For now, simulate suggestions
          await new Promise(resolve => setTimeout(resolve, 200));

          const { tags } = get();
          const suggestions = tags
            .filter(tag => tag.name.toLowerCase().includes(query.toLowerCase()))
            .map(tag => tag.name)
            .slice(0, 10);

          set({ tagSuggestions: suggestions });
        } catch (error) {
          console.error('Failed to load tag suggestions:', error);
          set({ tagSuggestions: [] });
        }
      },

      // People
      setPeople: (people) =>
        set({ people, isLoadingPeople: false }),

      addPerson: (person) =>
        set((state) => ({
          people: [...state.people, person],
        })),

      updatePerson: (personId, updates) =>
        set((state) => ({
          people: state.people.map(person =>
            person.id === personId
              ? { ...person, ...updates, updatedAt: new Date() }
              : person
          ),
          selectedPerson: state.selectedPerson?.id === personId
            ? { ...state.selectedPerson, ...updates, updatedAt: new Date() }
            : state.selectedPerson,
        })),

      removePerson: (personId) =>
        set((state) => ({
          people: state.people.filter(p => p.id !== personId),
          selectedPerson: state.selectedPerson?.id === personId
            ? null
            : state.selectedPerson,
        })),

      mergePeople: (sourceId, _targetId) => {
        // This would merge two people records
        // For now, just remove the source
        get().removePerson(sourceId);
      },

      setSelectedPerson: (selectedPerson) =>
        set({ selectedPerson }),

      // Places
      setPlaces: (places) =>
        set({ places, isLoadingPlaces: false }),

      setSelectedPlace: (selectedPlace) =>
        set({ selectedPlace }),

      // Trips
      setTrips: (trips) => set({ trips }),

      setSelectedTrip: (selectedTrip) =>
        set({ selectedTrip }),

      // Import/Export
      setImportStatus: (importStatus) => set({ importStatus }),

      // Loading states
      setLoadingCollections: (isLoadingCollections) =>
        set({ isLoadingCollections }),

      setLoadingTags: (isLoadingTags) =>
        set({ isLoadingTags }),

      setLoadingPeople: (isLoadingPeople) =>
        set({ isLoadingPeople }),

      setLoadingPlaces: (isLoadingPlaces) =>
        set({ isLoadingPlaces }),

      reset: () => set(initialState),
    }),
    {
      name: 'photo-search-library-store',
      partialize: (state) => ({
        // Only persist selections, not the actual data
        selectedCollection: state.selectedCollection,
        selectedPerson: state.selectedPerson,
        selectedPlace: state.selectedPlace,
        selectedTrip: state.selectedTrip,
      }),
    }
  )
);

// Selectors
export const useCollections = () => useLibraryStore(state => state.collections);
export const useTags = () => useLibraryStore(state => state.tags);
export const usePeople = () => useLibraryStore(state => state.people);
export const usePlaces = () => useLibraryStore(state => state.places);
export const useTrips = () => useLibraryStore(state => state.trips);
export const useSelectedCollection = () => useLibraryStore(state => state.selectedCollection);
export const useSelectedPerson = () => useLibraryStore(state => state.selectedPerson);
