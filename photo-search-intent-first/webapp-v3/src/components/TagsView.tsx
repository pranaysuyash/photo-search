import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag, Grid, List, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "cloud" | "grid" | "list";

interface TagData {
  name: string;
  count: number;
  color: string;
  photos: Array<{ path: string; score: number }>;
}

export function TagsView() {
  const [viewMode, setViewMode] = useState<ViewMode>("cloud");

  // Sample tag data - in a real implementation, this would come from photo metadata
  const tagData: TagData[] = [
    { name: "vacation", count: 89, color: "bg-blue-500", photos: [] },
    { name: "family", count: 67, color: "bg-green-500", photos: [] },
    { name: "nature", count: 54, color: "bg-emerald-500", photos: [] },
    { name: "portrait", count: 43, color: "bg-purple-500", photos: [] },
    { name: "landscape", count: 38, color: "bg-orange-500", photos: [] },
    { name: "sunset", count: 32, color: "bg-red-500", photos: [] },
    { name: "beach", count: 28, color: "bg-cyan-500", photos: [] },
    { name: "mountain", count: 24, color: "bg-indigo-500", photos: [] },
    { name: "city", count: 21, color: "bg-gray-500", photos: [] },
    { name: "food", count: 18, color: "bg-yellow-500", photos: [] },
    { name: "party", count: 15, color: "bg-pink-500", photos: [] },
    { name: "travel", count: 12, color: "bg-teal-500", photos: [] },
  ];

  const totalPhotos = tagData.reduce((sum, tag) => sum + tag.count, 0);

  const handleTagSelect = (tag: TagData) => {
    // In a real implementation, this would navigate to search results for this tag
    console.log(`Selected tag: ${tag.name} (${tag.count} photos)`);
  };

  const getTagSize = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return "text-4xl";
    if (ratio > 0.6) return "text-3xl";
    if (ratio > 0.4) return "text-2xl";
    if (ratio > 0.2) return "text-xl";
    return "text-lg";
  };

  const renderCloudView = () => {
    const maxCount = Math.max(...tagData.map((tag) => tag.count));

    return (
      <div className="p-8">
        <div className="flex flex-wrap gap-4 justify-center items-center min-h-[400px]">
          {tagData.map((tag) => (
            <button
              key={tag.name}
              type="button"
              onClick={() => handleTagSelect(tag)}
              className={cn(
                "group relative px-4 py-2 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg",
                tag.color,
                "text-white font-medium",
                getTagSize(tag.count, maxCount)
              )}
            >
              <span className="relative z-10">#{tag.name}</span>
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 text-xs bg-white text-gray-900 border border-gray-200"
              >
                {tag.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
      {tagData.map((tag) => (
        <Card
          key={tag.name}
          className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
          onClick={() => handleTagSelect(tag)}
        >
          <CardContent className="p-4 text-center">
            <div
              className={cn(
                "w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center",
                tag.color
              )}
            >
              <Hash className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              #{tag.name}
            </h3>
            <Badge variant="secondary" className="text-sm">
              {tag.count} photos
            </Badge>
          </CardContent>
        </Card>
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
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              tag.color
            )}
          >
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              #{tag.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tag applied to photos
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Tags
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {totalPhotos} photos across {tagData.length} tags
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1">
            <Button
              variant={viewMode === "cloud" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cloud")}
              className={cn(
                "px-3 py-2",
                viewMode === "cloud"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              )}
            >
              <Tag className="w-4 h-4 mr-2" />
              Cloud
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-2",
                viewMode === "grid"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              )}
            >
              <Grid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-2",
                viewMode === "list"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              )}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "cloud" && renderCloudView()}
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default TagsView;
