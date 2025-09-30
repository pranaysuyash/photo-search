import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, FolderOpen, HardDrive, Calendar, Trash2, Plus, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { apiWorkspaceAdd, apiWorkspaceRemove, apiScanCount } from '../api';

interface FolderMetadata {
  path: string;
  exists: boolean;
  fileCount?: number;
  totalSize?: string;
  lastModified?: string;
  indexingStatus: 'indexed' | 'indexing' | 'not_indexed' | 'error';
}

interface EnhancedWorkspaceProps {
  workspace: string[];
  setWorkspace: (workspace: string[]) => void;
  selectedFolders?: string[];
  onSelectionChange?: (selected: string[]) => void;
  showSelection?: boolean;
}

export default function EnhancedWorkspace({
  workspace,
  setWorkspace,
  selectedFolders = [],
  onSelectionChange,
  showSelection = false
}: EnhancedWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [folderMetadata, setFolderMetadata] = useState<Map<string, FolderMetadata>>(new Map());
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'exists' | 'missing' | 'indexed'>('all');

  // Filter folders based on search term and filter
  const filteredFolders = useMemo(() => {
    return workspace.filter(folder => {
      const matchesSearch = folder.toLowerCase().includes(searchTerm.toLowerCase());

      if (selectedFilter === 'all') return matchesSearch;

      const metadata = folderMetadata.get(folder);
      if (!metadata) return matchesSearch;

      switch (selectedFilter) {
        case 'exists':
          return metadata.exists && matchesSearch;
        case 'missing':
          return !metadata.exists && matchesSearch;
        case 'indexed':
          return metadata.indexingStatus === 'indexed' && matchesSearch;
        default:
          return matchesSearch;
      }
    });
  }, [workspace, searchTerm, selectedFilter, folderMetadata]);

  // Load folder metadata
  const loadFolderMetadata = useCallback(async (folderPath: string) => {
    if (loadingFolders.has(folderPath)) return;

    setLoadingFolders(prev => new Set(prev).add(folderPath));

    try {
      const [exists, scanResult] = await Promise.allSettled([
        fetch('/api/scan_count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: folderPath })
        }),
        fetch('/api/scan_count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: folderPath })
        })
      ]);

      const metadata: FolderMetadata = {
        path: folderPath,
        exists: exists.status === 'fulfilled' && exists.value.ok,
        indexingStatus: 'not_indexed'
      };

      if (scanResult.status === 'fulfilled' && scanResult.value.ok) {
        const scanData = await scanResult.value.json();
        metadata.fileCount = scanData.count || 0;
        metadata.totalSize = scanData.total_size || '0 B';
        metadata.indexingStatus = scanData.count > 0 ? 'indexed' : 'not_indexed';
      }

      setFolderMetadata(prev => new Map(prev).set(folderPath, metadata));
    } catch (error) {
      console.error('Error loading folder metadata:', error);
      setFolderMetadata(prev => new Map(prev).set(folderPath, {
        path: folderPath,
        exists: false,
        indexingStatus: 'error'
      }));
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    }
  }, [loadingFolders]);

  // Add new folder
  const addFolder = async () => {
    if (!newFolderPath.trim()) return;

    try {
      const r = await apiWorkspaceAdd(newFolderPath.trim());
      setWorkspace(r.folders || []);
      setNewFolderPath('');

      // Load metadata for the new folder
      await loadFolderMetadata(newFolderPath.trim());
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  // Remove folder
  const removeFolder = async (folderPath: string) => {
    try {
      const r = await apiWorkspaceRemove(folderPath);
      setWorkspace(r.folders || []);

      // Remove from metadata cache
      setFolderMetadata(prev => {
        const next = new Map(prev);
        next.delete(folderPath);
        return next;
      });
    } catch (error) {
      console.error('Error removing folder:', error);
    }
  };

  // Toggle folder selection
  const toggleFolderSelection = (folderPath: string) => {
    if (!onSelectionChange) return;

    const newSelection = selectedFolders.includes(folderPath)
      ? selectedFolders.filter(f => f !== folderPath)
      : [...selectedFolders, folderPath];

    onSelectionChange(newSelection);
  };

  // Select all filtered folders
  const selectAllFiltered = () => {
    if (!onSelectionChange) return;
    onSelectionChange(filteredFolders);
  };

  // Clear all selections
  const clearAllSelections = () => {
    if (!onSelectionChange) return;
    onSelectionChange([]);
  };

  // Get folder name from path
  const getFolderName = (path: string) => {
    return path.split('/').pop() || path;
  };

  // Get parent directory
  const getParentDirectory = (path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  };

  // Load metadata on mount and when workspace changes
  React.useEffect(() => {
    workspace.forEach(folder => {
      if (!folderMetadata.has(folder)) {
        loadFolderMetadata(folder);
      }
    });
  }, [workspace, folderMetadata, loadFolderMetadata]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Workspace ({workspace.length} folders)
          </CardTitle>
          {showSelection && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                disabled={filteredFolders.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedFolders.length === 0}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'exists', 'missing', 'indexed'] as const).map(filter => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
              >
                {filter === 'all' && 'All'}
                {filter === 'exists' && 'Exists'}
                {filter === 'missing' && 'Missing'}
                {filter === 'indexed' && 'Indexed'}
              </Button>
            ))}
          </div>
        )}

        {/* Add New Folder */}
        <div className="flex gap-2">
          <Input
            placeholder="Add folder path..."
            value={newFolderPath}
            onChange={(e) => setNewFolderPath(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addFolder()}
          />
          <Button onClick={addFolder} disabled={!newFolderPath.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Folder List */}
        {filteredFolders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {workspace.length === 0 ? (
              <div>
                <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No folders in workspace yet.</p>
                <p className="text-sm">Add folders above to get started.</p>
              </div>
            ) : (
              <p>No folders match your search criteria.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredFolders.map((folder) => {
              const metadata = folderMetadata.get(folder);
              const isSelected = selectedFolders.includes(folder);
              const isLoading = loadingFolders.has(folder);

              return (
                <div
                  key={folder}
                  className={`border rounded-lg p-3 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {showSelection && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFolderSelection(folder)}
                          className="mt-1"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FolderOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="font-medium truncate" title={folder}>
                            {getFolderName(folder)}
                          </span>
                          {metadata && (
                            <Badge variant={metadata.exists ? "default" : "destructive"} className="text-xs">
                              {metadata.exists ? 'Exists' : 'Missing'}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <div className="truncate" title={getParentDirectory(folder)}>
                            {getParentDirectory(folder)}
                          </div>
                        </div>

                        {metadata && (
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {metadata.fileCount !== undefined && (
                              <div className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                {metadata.fileCount.toLocaleString()} files
                              </div>
                            )}
                            {metadata.totalSize && (
                              <div className="flex items-center gap-1">
                                {metadata.totalSize}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={
                                  metadata.indexingStatus === 'indexed' ? 'default' :
                                  metadata.indexingStatus === 'indexing' ? 'secondary' :
                                  metadata.indexingStatus === 'error' ? 'destructive' : 'outline'
                                }
                                className="text-xs"
                              >
                                {metadata.indexingStatus === 'indexed' && 'Indexed'}
                                {metadata.indexingStatus === 'indexing' && 'Indexing...'}
                                {metadata.indexingStatus === 'error' && 'Error'}
                                {metadata.indexingStatus === 'not_indexed' && 'Not Indexed'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFolder(folder)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {isLoading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Selection Summary */}
        {showSelection && selectedFolders.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {selectedFolders.length} folder{selectedFolders.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange?.([])}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}