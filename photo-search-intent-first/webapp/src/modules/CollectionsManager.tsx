import React, { useState, useEffect } from 'react';
import { getAPI } from '../services/PhotoVaultAPI';
import { Plus, Trash2, Edit, FolderPlus, Grid, List, ChevronRight } from 'lucide-react';

interface Collection {
  name: string;
  paths: string[];
  count: number;
  preview?: string;
}

export function CollectionsManager() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const api = getAPI();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections();
      const collectionsList = Object.entries(data.collections).map(([name, paths]) => ({
        name,
        paths,
        count: paths.length,
        preview: paths[0]
      }));
      setCollections(collectionsList);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      await api.setCollection(newCollectionName, selectedPaths);
      await loadCollections();
      setIsCreating(false);
      setNewCollectionName('');
      setSelectedPaths([]);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const deleteCollection = async (name: string) => {
    if (!confirm(`Delete collection "${name}"?`)) return;
    
    try {
      await api.deleteCollection(name);
      await loadCollections();
      if (selectedCollection === name) {
        setSelectedCollection(null);
      }
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const CollectionCard = ({ collection }: { collection: Collection }) => (
    <div 
      className="collection-card"
      onClick={() => setSelectedCollection(collection.name)}
    >
      <div className="collection-preview">
        {collection.preview && (
          <img 
            src={api.getThumbnailUrl(collection.preview)} 
            alt={collection.name}
          />
        )}
        <div className="collection-overlay">
          <Grid className="w-5 h-5" />
        </div>
      </div>
      <div className="collection-info">
        <h3>{collection.name}</h3>
        <span className="text-sm text-gray-500">{collection.count} items</span>
      </div>
      <div className="collection-actions">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteCollection(collection.name);
          }}
          className="btn-icon"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const CollectionListItem = ({ collection }: { collection: Collection }) => (
    <div 
      className="collection-list-item"
      onClick={() => setSelectedCollection(collection.name)}
    >
      <ChevronRight className="w-4 h-4 text-gray-400" />
      <FolderPlus className="w-5 h-5 text-blue-500" />
      <div className="flex-1">
        <h3 className="font-medium">{collection.name}</h3>
        <span className="text-sm text-gray-500">{collection.count} items</span>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          deleteCollection(collection.name);
        }}
        className="btn-icon"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="collections-manager">
      <div className="manager-header">
        <h2 className="text-2xl font-bold">Collections</h2>
        <div className="flex items-center gap-3">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'active' : ''}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="create-collection-panel">
          <input
            type="text"
            placeholder="Collection name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="input"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={createCollection} className="btn btn-primary">
              Create
            </button>
            <button 
              onClick={() => {
                setIsCreating(false);
                setNewCollectionName('');
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading collections...</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'collections-grid' : 'collections-list'}>
          {collections.map(collection => 
            viewMode === 'grid' ? 
              <CollectionCard key={collection.name} collection={collection} /> :
              <CollectionListItem key={collection.name} collection={collection} />
          )}
        </div>
      )}

      <style jsx>{`
        .collections-manager {
          padding: 2rem;
          height: 100%;
          overflow-y: auto;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .view-toggle {
          display: flex;
          gap: 0.25rem;
          padding: 0.25rem;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }

        .view-toggle button {
          padding: 0.5rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-toggle button.active {
          background: var(--bg-primary);
          color: var(--accent-primary);
        }

        .create-collection-panel {
          background: var(--bg-secondary);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .collections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .collection-card {
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s;
        }

        .collection-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .collection-preview {
          position: relative;
          aspect-ratio: 1;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .collection-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .collection-overlay {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
        }

        .collection-info {
          padding: 1rem;
        }

        .collection-info h3 {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .collection-actions {
          padding: 0 1rem 1rem;
          display: flex;
          gap: 0.5rem;
        }

        .collections-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .collection-list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .collection-list-item:hover {
          background: var(--bg-tertiary);
        }

        .btn-icon {
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--error);
          color: white;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}