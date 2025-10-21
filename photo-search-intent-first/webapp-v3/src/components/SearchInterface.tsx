/**
 * SearchInterface.tsx
 *
 * INTENT: Advanced search interface with real-time suggestions, expandable filter panel,
 * search history, saved searches, and query syntax highlighting. Provides powerful
 * search capabilities for photo collections.
 *
 * DESIGN PHILOSOPHY:
 * - Progressive Disclosure: Start simple, reveal complexity as needed
 * - Real-time Feedback: Instant suggestions and validation
 * - Keyboard First: Complete keyboard navigation support
 * - Visual Clarity: Clear hierarchy and visual feedback
 * - Accessibility: Screen reader support and focus management
 *
 * FEATURES:
 * - Real-time search suggestions with fuzzy matching
 * - Expandable advanced filter panel
 * - Search history with frequency-based ranking
 * - Saved searches with custom names
 * - Query syntax highlighting and validation
 * - Filter chips for active filters
 * - Keyboard shortcuts and navigation
 * - Export search results
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  type KeyboardEvent,
  type ChangeEvent
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  X,
  Clock,
  Star,
  Calendar,
  MapPin,
  Camera,
  Tag,
  User,
  Heart,
  Image,
  Video,
  ChevronDown,
  ChevronUp,
  Save,
  Download,
  Trash2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "./SearchInterface.css";

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    address?: string;
  };
  camera?: {
    make?: string;
    model?: string;
  };
  technical?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    minISO?: number;
    maxISO?: number;
    minAperture?: number;
    maxAperture?: number;
  };
  people?: string[];
  tags?: string[];
  collections?: string[];
  favorites?: boolean;
  hasText?: boolean;
  mediaType?: "image" | "video" | "all";
  minRating?: number;
  sortBy?: "relevance" | "date" | "name" | "size" | "rating";
  sortOrder?: "asc" | "desc";
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "query" | "tag" | "person" | "location" | "camera";
  icon?: React.ReactNode;
  frequency?: number;
  lastUsed?: Date;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

interface SearchInterfaceProps {
  query: string;
  filters: SearchFilters;
  suggestions: SearchSuggestion[];
  searchHistory: string[];
  savedSearches: SavedSearch[];
  onQueryChange: (query: string) => void;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (query: string, filters: SearchFilters) => void;
  onSaveSearch: (name: string, query: string, filters: SearchFilters) => void;
  onDeleteSavedSearch: (id: string) => void;
  onExportResults: () => void;
  className?: string;
  placeholder?: string;
  isLoading?: boolean;
  resultCount?: number;
}

/**
 * Query syntax highlighting
 */
const highlightQuery = (query: string): React.ReactNode => {
  const parts = query.split(/(\s+|[()&|!"])/);
  
  return parts.map((part, index) => {
    if (part.match(/^(AND|OR|NOT)$/i)) {
      return (
        <span key={index} className="search-query-operator">
          {part}
        </span>
      );
    }
    if (part.match(/^[()&|!"]$/)) {
      return (
        <span key={index} className="search-query-symbol">
          {part}
        </span>
      );
    }
    if (part.match(/^\w+:/)) {
      return (
        <span key={index} className="search-query-field">
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

/**
 * Search Interface Component
 */
export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  query,
  filters,
  suggestions,
  searchHistory,
  savedSearches,
  onQueryChange,
  onFiltersChange,
  onSearch,
  onSaveSearch,
  onDeleteSavedSearch,
  onExportResults,
  className,
  placeholder = "Search your photos...",
  isLoading = false,
  resultCount,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) {
      return searchHistory.slice(0, 5).map((historyItem, index) => ({
        id: `history-${index}`,
        text: historyItem,
        type: "query" as const,
        icon: <Clock className="h-4 w-4" />,
      }));
    }

    const queryLower = query.toLowerCase();
    return suggestions
      .filter((suggestion) =>
        suggestion.text.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => {
        // Sort by frequency and recency
        const aScore = (a.frequency || 0) + (a.lastUsed ? 1 : 0);
        const bScore = (b.frequency || 0) + (b.lastUsed ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 8);
  }, [query, suggestions, searchHistory]);

  // Handle input change
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    onQueryChange(newQuery);
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  }, [onQueryChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === "Enter") {
        onSearch(query, filters);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedSuggestion = filteredSuggestions[selectedSuggestionIndex];
          onQueryChange(selectedSuggestion.text);
          onSearch(selectedSuggestion.text, filters);
        } else {
          onSearch(query, filters);
        }
        setShowSuggestions(false);
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  }, [showSuggestions, filteredSuggestions, selectedSuggestionIndex, query, filters, onQueryChange, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    onQueryChange(suggestion.text);
    onSearch(suggestion.text, filters);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [filters, onQueryChange, onSearch]);

  // Handle saved search click
  const handleSavedSearchClick = useCallback((savedSearch: SavedSearch) => {
    onQueryChange(savedSearch.query);
    onFiltersChange(savedSearch.filters);
    onSearch(savedSearch.query, savedSearch.filters);
    setShowSuggestions(false);
  }, [onQueryChange, onFiltersChange, onSearch]);

  // Handle save search
  const handleSaveSearch = useCallback(() => {
    if (saveSearchName.trim() && query.trim()) {
      onSaveSearch(saveSearchName.trim(), query, filters);
      setSaveSearchName("");
      setShowSaveDialog(false);
    }
  }, [saveSearchName, query, filters, onSaveSearch]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    onQueryChange("");
    onFiltersChange({});
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onQueryChange, onFiltersChange]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.location) count++;
    if (filters.camera) count++;
    if (filters.people?.length) count++;
    if (filters.tags?.length) count++;
    if (filters.collections?.length) count++;
    if (filters.favorites) count++;
    if (filters.hasText) count++;
    if (filters.mediaType && filters.mediaType !== "all") count++;
    if (filters.minRating) count++;
    return count;
  }, [filters]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("search-interface", className)}>
      {/* Main Search Bar */}
      <div className="search-interface-main">
        <div className="search-interface-input-container">
          <Search className="search-interface-icon" />
          
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="search-interface-input"
            aria-label="Search photos"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            role="combobox"
          />

          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="search-interface-clear"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {isLoading && (
            <div className="search-interface-loading">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            </div>
          )}
        </div>

        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "search-interface-filter-toggle",
            activeFilterCount > 0 && "search-interface-filter-active"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="search-interface-filter-count">
              {activeFilterCount}
            </Badge>
          )}
          {showFilters ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Search Actions */}
        <div className="search-interface-actions">
          <Button
            onClick={() => onSearch(query, filters)}
            disabled={!query.trim()}
            className="search-interface-search-button"
          >
            Search
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && (filteredSuggestions.length > 0 || savedSearches.length > 0) && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="search-interface-suggestions"
            role="listbox"
          >
            {/* Recent Searches / Suggestions */}
            {filteredSuggestions.length > 0 && (
              <div className="search-interface-suggestions-section">
                <h4 className="search-interface-suggestions-title">
                  {query.trim() ? "Suggestions" : "Recent Searches"}
                </h4>
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "search-interface-suggestion-item",
                      index === selectedSuggestionIndex && "search-interface-suggestion-selected"
                    )}
                    role="option"
                    aria-selected={index === selectedSuggestionIndex}
                  >
                    {suggestion.icon}
                    <span className="search-interface-suggestion-text">
                      {highlightQuery(suggestion.text)}
                    </span>
                    {suggestion.type !== "query" && (
                      <Badge variant="outline" className="search-interface-suggestion-type">
                        {suggestion.type}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <div className="search-interface-suggestions-section">
                <h4 className="search-interface-suggestions-title">Saved Searches</h4>
                {savedSearches.slice(0, 3).map((savedSearch) => (
                  <button
                    key={savedSearch.id}
                    onClick={() => handleSavedSearchClick(savedSearch)}
                    className="search-interface-suggestion-item"
                  >
                    <Star className="h-4 w-4" />
                    <div className="search-interface-saved-search">
                      <span className="search-interface-saved-search-name">
                        {savedSearch.name}
                      </span>
                      <span className="search-interface-saved-search-query">
                        {savedSearch.query}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSavedSearch(savedSearch.id);
                      }}
                      className="search-interface-delete-saved"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="search-interface-filters"
          >
            <div className="search-interface-filters-content">
              {/* Date Range Filter */}
              <div className="search-interface-filter-group">
                <label className="search-interface-filter-label">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </label>
                <div className="search-interface-filter-inputs">
                  <Input
                    type="date"
                    value={filters.dateRange?.start?.toISOString().split('T')[0] || ""}
                    onChange={(e) => {
                      const start = e.target.value ? new Date(e.target.value) : undefined;
                      onFiltersChange({
                        ...filters,
                        dateRange: start ? { ...filters.dateRange, start } : undefined,
                      });
                    }}
                    className="search-interface-filter-input"
                  />
                  <span className="text-sm text-slate-500">to</span>
                  <Input
                    type="date"
                    value={filters.dateRange?.end?.toISOString().split('T')[0] || ""}
                    onChange={(e) => {
                      const end = e.target.value ? new Date(e.target.value) : undefined;
                      onFiltersChange({
                        ...filters,
                        dateRange: end ? { ...filters.dateRange, end } : undefined,
                      });
                    }}
                    className="search-interface-filter-input"
                  />
                </div>
              </div>

              {/* Location Filter */}
              <div className="search-interface-filter-group">
                <label className="search-interface-filter-label">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Input
                  placeholder="Enter location or address"
                  value={filters.location?.address || ""}
                  onChange={(e) => {
                    onFiltersChange({
                      ...filters,
                      location: e.target.value ? { address: e.target.value } : undefined,
                    });
                  }}
                  className="search-interface-filter-input"
                />
              </div>

              {/* Camera Filter */}
              <div className="search-interface-filter-group">
                <label className="search-interface-filter-label">
                  <Camera className="h-4 w-4" />
                  Camera
                </label>
                <div className="search-interface-filter-inputs">
                  <Input
                    placeholder="Camera make"
                    value={filters.camera?.make || ""}
                    onChange={(e) => {
                      onFiltersChange({
                        ...filters,
                        camera: { ...filters.camera, make: e.target.value || undefined },
                      });
                    }}
                    className="search-interface-filter-input"
                  />
                  <Input
                    placeholder="Camera model"
                    value={filters.camera?.model || ""}
                    onChange={(e) => {
                      onFiltersChange({
                        ...filters,
                        camera: { ...filters.camera, model: e.target.value || undefined },
                      });
                    }}
                    className="search-interface-filter-input"
                  />
                </div>
              </div>

              {/* Media Type Filter */}
              <div className="search-interface-filter-group">
                <label className="search-interface-filter-label">
                  <Image className="h-4 w-4" />
                  Media Type
                </label>
                <div className="search-interface-filter-buttons">
                  {[
                    { value: "all", label: "All", icon: <Image className="h-4 w-4" /> },
                    { value: "image", label: "Photos", icon: <Image className="h-4 w-4" /> },
                    { value: "video", label: "Videos", icon: <Video className="h-4 w-4" /> },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={filters.mediaType === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onFiltersChange({
                          ...filters,
                          mediaType: option.value as "image" | "video" | "all",
                        });
                      }}
                      className="search-interface-filter-button"
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="search-interface-filter-group">
                <label className="search-interface-filter-label">Quick Filters</label>
                <div className="search-interface-filter-buttons">
                  <Button
                    variant={filters.favorites ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        favorites: !filters.favorites,
                      });
                    }}
                    className="search-interface-filter-button"
                  >
                    <Heart className="h-4 w-4" />
                    Favorites
                  </Button>
                  
                  <Button
                    variant={filters.hasText ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        hasText: !filters.hasText,
                      });
                    }}
                    className="search-interface-filter-button"
                  >
                    <Tag className="h-4 w-4" />
                    Has Text
                  </Button>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="search-interface-filter-actions">
              <Button
                variant="outline"
                onClick={() => {
                  onFiltersChange({});
                }}
                className="search-interface-clear-filters"
              >
                Clear All Filters
              </Button>
              
              <Button
                onClick={() => {
                  onSearch(query, filters);
                  setShowFilters(false);
                }}
                className="search-interface-apply-filters"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="search-interface-active-filters">
          {filters.dateRange && (
            <Badge variant="secondary" className="search-interface-filter-chip">
              <Calendar className="h-3 w-3" />
              Date: {filters.dateRange.start?.toLocaleDateString()} - {filters.dateRange.end?.toLocaleDateString()}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                className="search-interface-chip-remove"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.location?.address && (
            <Badge variant="secondary" className="search-interface-filter-chip">
              <MapPin className="h-3 w-3" />
              {filters.location.address}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, location: undefined })}
                className="search-interface-chip-remove"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.favorites && (
            <Badge variant="secondary" className="search-interface-filter-chip">
              <Heart className="h-3 w-3" />
              Favorites
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, favorites: false })}
                className="search-interface-chip-remove"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Result Count */}
      {resultCount !== undefined && (
        <div className="search-interface-results">
          <span className="search-interface-result-count">
            {resultCount.toLocaleString()} {resultCount === 1 ? "result" : "results"}
          </span>
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Search Name</label>
              <Input
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Enter a name for this search"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveSearch();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Query</label>
              <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                {query || "No query"}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim()}>
                Save Search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchInterface;