import React, { useState } from 'react';
import { X, Filter, Sliders, Zap } from 'lucide-react';
import { QuickFilters } from './QuickFilters';

interface FilterPanelProps {
  show: boolean;
  onClose: () => void;
  onApply: () => void;
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
  // Metadata for filter suggestions
  availableCameras?: string[];
  yearRange?: [number, number];
}

export function FilterPanel({
  show,
  onClose,
  onApply,
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
  availableCameras = [],
  yearRange
}: FilterPanelProps) {
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');

  if (!show) return null;

  const clearAllFilters = () => {
    setFavOnly(false);
    setTagFilter('');
    setCamera('');
    setIsoMin('');
    setIsoMax('');
    setDateFrom('');
    setDateTo('');
    setFMin('');
    setFMax('');
    setPlace('');
    setUseCaps(false);
    setUseOcr(false);
    setHasText(false);
  };

  const anyActive = Boolean(
    favOnly || tagFilter || camera || isoMin || isoMax || dateFrom || dateTo || fMin || fMax || place || useCaps || useOcr || hasText
  )

  return (
    <div className="absolute right-6 top-20 z-50 bg-white border border-gray-200 shadow-lg rounded-lg w-[500px] max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold">Advanced Filters</span>
        </div>
        <div className="flex items-center gap-2">
          {anyActive && (
            <button type="button" className="text-sm px-2 py-1 border rounded text-gray-700 hover:bg-gray-50" onClick={clearAllFilters} title="Clear all filters">Clear all</button>
          )}
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 p-1"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('quick')}
          className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm border-r ${
            activeTab === 'quick'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          Quick Filters
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm ${
            activeTab === 'advanced'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Advanced
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'quick' ? (
          <QuickFilters
            cameras={availableCameras}
            yearRange={yearRange}
            camera={camera}
            setCamera={setCamera}
            isoMin={isoMin}
            setIsoMin={setIsoMin}
            isoMax={isoMax}
            setIsoMax={setIsoMax}
            fMin={fMin}
            setFMin={setFMin}
            fMax={fMax}
            setFMax={setFMax}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            onApplyFilters={onApply}
            onClearFilters={clearAllFilters}
            compact
          />
        ) : (
          <div className="space-y-4 text-sm">
            {/* Basic Filters */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Basic Filters</h4>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-fav">Favorites only</label>
                <input
                  id="flt-fav"
                  type="checkbox"
                  checked={favOnly}
                  onChange={(e) => setFavOnly(e.target.checked)}
                />
              </div>
              <div>
                <label className="block mb-1" htmlFor="flt-tags">
                  Tags (comma-separated)
                </label>
                <input
                  id="flt-tags"
                  className="w-full border rounded px-2 py-1"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="portrait, landscape, vacation"
                />
              </div>
              <div>
                <label className="block mb-1" htmlFor="flt-place">
                  Location/Place
                </label>
                <input
                  id="flt-place"
                  className="w-full border rounded px-2 py-1"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="New York, Beach, Mountains"
                />
              </div>
            </div>

            {/* Search Features */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="font-medium text-gray-900">Search Features</h4>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-caps">
                  <span>Use AI captions</span>
                  <div className="text-xs text-gray-500">Search in generated image descriptions</div>
                </label>
                <input
                  id="flt-caps"
                  type="checkbox"
                  checked={useCaps}
                  onChange={(e) => setUseCaps(e.target.checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-ocr">
                  <span>Use OCR</span>
                  <div className="text-xs text-gray-500">Search for text within images</div>
                </label>
                <input
                  id="flt-ocr"
                  type="checkbox"
                  checked={useOcr}
                  onChange={(e) => setUseOcr(e.target.checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="flt-hastext">
                  <span>Has text</span>
                  <div className="text-xs text-gray-500">Only images containing readable text</div>
                </label>
                <input
                  id="flt-hastext"
                  type="checkbox"
                  checked={hasText}
                  onChange={(e) => setHasText(e.target.checked)}
                />
              </div>
            </div>

            {/* Manual Input Fields */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="font-medium text-gray-900">Manual Input</h4>
              <div>
                <label className="block mb-1" htmlFor="flt-camera-manual">
                  Camera Model
                </label>
                <input
                  id="flt-camera-manual"
                  className="w-full border rounded px-2 py-1"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  placeholder="Canon EOS R5, iPhone 12 Pro"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-iso-min-manual">
                    ISO Min
                  </label>
                  <input
                    id="flt-iso-min-manual"
                    type="number"
                    min="50"
                    max="102400"
                    className="w-full border rounded px-2 py-1"
                    value={isoMin}
                    onChange={(e) => setIsoMin(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-iso-max-manual">
                    ISO Max
                  </label>
                  <input
                    id="flt-iso-max-manual"
                    type="number"
                    min="50"
                    max="102400"
                    className="w-full border rounded px-2 py-1"
                    value={isoMax}
                    onChange={(e) => setIsoMax(e.target.value)}
                    placeholder="3200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-fmin-manual">
                    f-stop Min
                  </label>
                  <input
                    id="flt-fmin-manual"
                    type="number"
                    step="0.1"
                    min="0.7"
                    max="32"
                    className="w-full border rounded px-2 py-1"
                    value={fMin}
                    onChange={(e) => setFMin(e.target.value)}
                    placeholder="1.4"
                  />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-fmax-manual">
                    f-stop Max
                  </label>
                  <input
                    id="flt-fmax-manual"
                    type="number"
                    step="0.1"
                    min="0.7"
                    max="32"
                    className="w-full border rounded px-2 py-1"
                    value={fMax}
                    onChange={(e) => setFMax(e.target.value)}
                    placeholder="8.0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1" htmlFor="flt-date-from-manual">
                    Date From
                  </label>
                  <input
                    id="flt-date-from-manual"
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1" htmlFor="flt-date-to-manual">
                    Date To
                  </label>
                  <input
                    id="flt-date-to-manual"
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center p-4 border-t bg-gray-50">
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
    </div>
  );
}
