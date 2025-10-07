import { useMemo, useState } from "react";
import { Tag, Grid, List } from "lucide-react";

interface TagsViewProps {
  allTags: string[];
  tagsMap: Record<string, string[]>;
  setBusy: (busy: string | boolean) => void;
  setNote: (note: string) => void;
  setResults: (results: Array<{ path: string; score: number }>) => void;
}

type ViewMode = "grid" | "list";

export function TagsView({
  allTags,
  tagsMap,
  setBusy,
  setNote,
  setResults,
}: TagsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Process tag data from allTags and tagsMap
  const tagData = useMemo(() => {
    return allTags
      .map((tag) => {
        // Find all photos that have this tag
        const photosWithTag = Object.entries(tagsMap)
          .filter(([, tags]) => tags.includes(tag))
          .map(([path]) => ({ path, score: Math.random() })); // Random score for demo

        return {
          name: tag,
          count: photosWithTag.length,
          photos: photosWithTag,
        };
      })
      .filter((tag) => tag.count > 0) // Only show tags that have photos
      .sort((a, b) => b.count - a.count); // Sort by photo count descending
  }, [allTags, tagsMap]);

  const totalPhotos = useMemo(
    () => tagData.reduce((sum, tag) => sum + tag.count, 0),
    [tagData]
  );

  const handleTagSelect = (tag: (typeof tagData)[0]) => {
    setBusy("Loading photos tagged with " + tag.name);
    // Simulate API call delay
    setTimeout(() => {
      setResults(tag.photos);
      setNote(`Showing ${tag.count} photos tagged with "${tag.name}"`);
      setBusy(false);
    }, 500);
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {tagData.map((tag) => (
        <button
          key={tag.name}
          type="button"
          onClick={() => handleTagSelect(tag)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTagSelect(tag);
            }
          }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {tag.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tag.count} photos
              </p>
            </div>
          </div>
          <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
        </button>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {tagData.map((tag) => (
        <button
          key={tag.name}
          type="button"
          onClick={() => handleTagSelect(tag)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTagSelect(tag);
            }
          }}
          className="flex items-center gap-4 p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors w-full text-left"
        >
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Tag className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {tag.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tag applied to {tag.count} photo{tag.count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tag.count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              photos
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tags
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {totalPhotos} photos across {tagData.length} tags
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default TagsView;
