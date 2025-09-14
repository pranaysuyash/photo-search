import { 
  Calendar, 
  Camera, 
  Filter, 
  Hash, 
  MapPin, 
  Star, 
  X, 
  Zap,
  Aperture,
  DollarSign,
  Clock,
  Tag,
  Heart,
  Type,
  Image,
  Palette
} from "lucide-react";
import { useState } from "react";

interface AdvancedFilterPanelProps {
  // Current filter values
  favOnly: boolean;
  setFavOnly: (value: boolean) => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  camera: string;
  setCamera: (value: string) => void;
  isoMin: string;
  setIsoMin: (value: string) => void;
  isoMax: string;
  setIsoMax: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  fMin: string;
  setFMin: (value: string) => void;
  fMax: string;
  setFMax: (value: string) => void;
  place: string;
  setPlace: (value: string) => void;
  useCaps: boolean;
  setUseCaps: (value: boolean) => void;
  useOcr: boolean;
  setUseOcr: (value: boolean) => void;
  hasText: boolean;
  setHasText: (value: boolean) => void;
  ratingMin: number;
  setRatingMin: (value: number) => void;
  person: string;
  setPerson: (value: string) => void;
  collection: string;
  setCollection: (value: string) => void;
  color: string;
  setColor: (value: string) => void;
  orientation: string;
  setOrientation: (value: string) => void;
  
  // Available filter options (would be loaded from metadata)
  availableCameras?: string[];
  availableCollections?: string[];
  popularISOs?: number[];
  popularApertures?: number[];
  yearRange?: [number, number];
  popularColors?: string[];
  popularPersons?: string[];
  
  // Actions
  onApply: () => void;
  onClose: () => void;
  onClearAll: () => void;
}

export function AdvancedFilterPanel({
  favOnly,
  setFavOnly,
  tagFilter,
  setTagFilter,
  camera,
  setCamera,
  isoMin,
  setIsoMin,
  isoMax,
  setIsoMax,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  fMin,
  setFMin,
  fMax,
  setFMax,
  place,
  setPlace,
  useCaps,
  setUseCaps,
  useOcr,
  setUseOcr,
  hasText,
  setHasText,
  ratingMin,
  setRatingMin,
  person,
  setPerson,
  collection,
  setCollection,
  color,
  setColor,
  orientation,
  setOrientation,
  availableCameras = [],
  availableCollections = [],
  popularISOs = [100, 200, 400, 800, 1600, 3200],
  popularApertures = [1.4, 1.8, 2.8, 4.0, 5.6, 8.0],
  yearRange,
  popularColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFFFFF", "#000000"],
  popularPersons = [],
  onApply,
  onClose,
  onClearAll,
}: AdvancedFilterPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>("basic");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    exif: false,
    search: false,
    rating: false,
    people: false,
    collections: false,
    colors: false,
    orientation: false,
  });

  // Check if any filters are active
  const hasActiveFilters = 
    favOnly || tagFilter || camera || isoMin || isoMax || fMin || fMax || 
    dateFrom || dateTo || place || useCaps || useOcr || hasText || 
    ratingMin > 0 || person || collection || color || orientation;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const categories = [
    {
      id: "basic",
      label: "Basic",
      icon: Filter,
    },
    {
      id: "exif",
      label: "EXIF",
      icon: Camera,
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
    },
    {
      id: "rating",
      label: "Rating",
      icon: Star,
    },
    {
      id: "people",
      label: "People",
      icon: Heart,
    },
    {
      id: "collections",
      label: "Collections",
      icon: Image,
    },
    {
      id: "colors",
      label: "Colors",
      icon: Palette,
    },
    {
      id: "orientation",
      label: "Orientation",
      icon: Aperture,
    },
  ];

  const clearAllFilters = () => {
    onClearAll();
  };

  return (
    <div className="advanced-filter-panel">
      <div className="advanced-filter-header">
        <div className="advanced-filter-title">
          <Filter className="w-5 h-5" />
          <span>Advanced Filters</span>
        </div>
        <div className="advanced-filter-actions">
          <button
            type="button"
            onClick={onClose}
            className="close-btn"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="category-navigation border-b overflow-x-auto">
        <div className="flex">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex flex-col items-center justify-center p-3 min-w-20 flex-shrink-0 ${
                  activeCategory === category.id
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Content */}
      <div className="filter-content flex-1 overflow-y-auto p-4">
        {/* Basic Filters */}
        {activeCategory === "basic" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("basic")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Basic Filters
                </h3>
                <button className="text-gray-500">
                  {expandedSections.basic ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.basic && (
                <div className="filter-section-content mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="flt-fav" className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>Favorites only</span>
                    </label>
                    <input
                      id="flt-fav"
                      type="checkbox"
                      checked={favOnly}
                      onChange={(e) => setFavOnly(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 flex items-center gap-2" htmlFor="flt-tags">
                      <Tag className="w-4 h-4" />
                      Tags (comma-separated)
                    </label>
                    <input
                      id="flt-tags"
                      className="w-full border rounded px-3 py-2"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      placeholder="portrait, landscape, vacation"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 flex items-center gap-2" htmlFor="flt-place">
                      <MapPin className="w-4 h-4" />
                      Location/Place
                    </label>
                    <input
                      id="flt-place"
                      className="w-full border rounded px-3 py-2"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="New York, Beach, Mountains"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXIF Filters */}
        {activeCategory === "exif" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("exif")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Camera & EXIF Data
                </h3>
                <button className="text-gray-500">
                  {expandedSections.exif ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.exif && (
                <div className="filter-section-content mt-3 space-y-4">
                  <div>
                    <label className="block mb-1 flex items-center gap-2" htmlFor="flt-camera">
                      <Camera className="w-4 h-4" />
                      Camera
                    </label>
                    <select
                      id="flt-camera"
                      className="w-full border rounded px-3 py-2"
                      value={camera}
                      onChange={(e) => setCamera(e.target.value)}
                    >
                      <option value="">Any Camera</option>
                      {availableCameras.map((cam) => (
                        <option key={cam} value={cam}>{cam}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-1 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      ISO Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min ISO</label>
                        <input
                          type="number"
                          min="50"
                          max="102400"
                          step="100"
                          value={isoMin}
                          onChange={(e) => setIsoMin(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                          placeholder="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max ISO</label>
                        <input
                          type="number"
                          min="50"
                          max="102400"
                          step="100"
                          value={isoMax}
                          onChange={(e) => setIsoMax(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                          placeholder="3200"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {popularISOs.map((iso) => (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            const isoStr = iso.toString();
                            if (isoMin === isoStr && isoMax === isoStr) {
                              setIsoMin("");
                              setIsoMax("");
                            } else {
                              setIsoMin(isoStr);
                              setIsoMax(isoStr);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded border ${
                            isoMin === iso.toString() && isoMax === iso.toString()
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {iso}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block mb-1 flex items-center gap-2">
                      <Aperture className="w-4 h-4" />
                      Aperture (f-stop)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min f-stop</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.7"
                          max="32"
                          value={fMin}
                          onChange={(e) => setFMin(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                          placeholder="1.4"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max f-stop</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.7"
                          max="32"
                          value={fMax}
                          onChange={(e) => setFMax(e.target.value)}
                          className="w-full text-xs border rounded px-2 py-1"
                          placeholder="8.0"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {popularApertures.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => {
                            const fStr = f.toString();
                            if (fMin === fStr && fMax === fStr) {
                              setFMin("");
                              setFMax("");
                            } else {
                              setFMin(fStr);
                              setFMax(fStr);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded border ${
                            fMin === f.toString() && fMax === f.toString()
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          f/{f}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">From</label>
                        <input
                          type="date"
                          className="w-full text-xs border rounded px-2 py-1"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">To</label>
                        <input
                          type="date"
                          className="w-full text-xs border rounded px-2 py-1"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {yearRange && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                          }}
                          className={`px-2 py-1 text-xs rounded border ${
                            !dateFrom && !dateTo
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          Any Year
                        </button>
                        {Array.from(
                          { length: Math.min(6, yearRange[0] - yearRange[1] + 1) },
                          (_, i) => yearRange[0] - i,
                        ).map((year) => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              const startOfYear = `${year}-01-01`;
                              const endOfYear = `${year}-12-31`;
                              if (dateFrom === startOfYear && dateTo === endOfYear) {
                                setDateFrom("");
                                setDateTo("");
                              } else {
                                setDateFrom(startOfYear);
                                setDateTo(endOfYear);
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded border ${
                              dateFrom === `${year}-01-01` && dateTo === `${year}-12-31`
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Features */}
        {activeCategory === "search" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("search")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search Features
                </h3>
                <button className="text-gray-500">
                  {expandedSections.search ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.search && (
                <div className="filter-section-content mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="flt-caps" className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      <span>Use AI captions</span>
                      <div className="text-xs text-gray-500">
                        Search in generated image descriptions
                      </div>
                    </label>
                    <input
                      id="flt-caps"
                      type="checkbox"
                      checked={useCaps}
                      onChange={(e) => setUseCaps(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="flt-ocr" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      <span>Use OCR</span>
                      <div className="text-xs text-gray-500">
                        Search for text within images
                      </div>
                    </label>
                    <input
                      id="flt-ocr"
                      type="checkbox"
                      checked={useOcr}
                      onChange={(e) => setUseOcr(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label htmlFor="flt-hastext" className="flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      <span>Has text</span>
                      <div className="text-xs text-gray-500">
                        Only images containing readable text
                      </div>
                    </label>
                    <input
                      id="flt-hastext"
                      type="checkbox"
                      checked={hasText}
                      onChange={(e) => setHasText(e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rating Filters */}
        {activeCategory === "rating" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("rating")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Rating
                </h3>
                <button className="text-gray-500">
                  {expandedSections.rating ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.rating && (
                <div className="filter-section-content mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Minimum rating:</span>
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={`px-3 py-2 rounded ${
                          ratingMin === rating
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        onClick={() => setRatingMin(rating)}
                      >
                        {rating === 0 ? "Any" : "★".repeat(rating)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* People Filters */}
        {activeCategory === "people" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("people")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  People
                </h3>
                <button className="text-gray-500">
                  {expandedSections.people ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.people && (
                <div className="filter-section-content mt-3">
                  <div>
                    <label className="block mb-1" htmlFor="flt-person">
                      Person Name
                    </label>
                    <input
                      id="flt-person"
                      className="w-full border rounded px-3 py-2"
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      placeholder="Enter person name"
                    />
                  </div>
                  
                  {popularPersons.length > 0 && (
                    <div className="mt-3">
                      <label className="block mb-1 text-sm">Popular People</label>
                      <div className="flex flex-wrap gap-2">
                        {popularPersons.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`px-3 py-1 text-sm rounded ${
                              person === p
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={() => setPerson(person === p ? "" : p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collections Filters */}
        {activeCategory === "collections" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("collections")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Collections
                </h3>
                <button className="text-gray-500">
                  {expandedSections.collections ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.collections && (
                <div className="filter-section-content mt-3">
                  <div>
                    <label className="block mb-1" htmlFor="flt-collection">
                      Collection
                    </label>
                    <select
                      id="flt-collection"
                      className="w-full border rounded px-3 py-2"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                    >
                      <option value="">All Collections</option>
                      {availableCollections.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color Filters */}
        {activeCategory === "colors" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("colors")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Dominant Colors
                </h3>
                <button className="text-gray-500">
                  {expandedSections.colors ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.colors && (
                <div className="filter-section-content mt-3">
                  <div>
                    <label className="block mb-1">Select Color</label>
                    <div className="flex flex-wrap gap-2">
                      {popularColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            color === c ? "border-gray-800" : "border-gray-300"
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(color === c ? "" : c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block mb-1" htmlFor="flt-color">
                      Custom Color
                    </label>
                    <input
                      id="flt-color"
                      type="color"
                      className="w-full h-10 border rounded"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orientation Filters */}
        {activeCategory === "orientation" && (
          <div className="space-y-4">
            <div className="filter-section">
              <div 
                className="filter-section-header flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection("orientation")}
              >
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Aperture className="w-4 h-4" />
                  Orientation
                </h3>
                <button className="text-gray-500">
                  {expandedSections.orientation ? "−" : "+"}
                </button>
              </div>
              
              {expandedSections.orientation && (
                <div className="filter-section-content mt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "", label: "Any" },
                      { value: "landscape", label: "Landscape" },
                      { value: "portrait", label: "Portrait" },
                      { value: "square", label: "Square" },
                    ].map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        className={`p-3 rounded border ${
                          orientation === o.value
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setOrientation(o.value)}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="filter-footer flex justify-between items-center p-4 border-t bg-gray-50">
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Clear All Filters
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={onApply}
          >
            Apply Filters
          </button>
        </div>
      </div>

      <style>{`
        .advanced-filter-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 500px;
          background: white;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
        }

        .advanced-filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .advanced-filter-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .advanced-filter-actions {
          display: flex;
          gap: 0.5rem;
        }

        .close-btn {
          padding: 0.5rem;
          border-radius: 0.375rem;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .category-navigation {
          background: white;
        }

        .filter-content {
          flex: 1;
          overflow-y: auto;
        }

        .filter-section {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .filter-section-header {
          cursor: pointer;
        }

        .filter-footer {
          background: #f9fafb;
        }

        @media (max-width: 640px) {
          .advanced-filter-panel {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}