import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tag as TagIcon, Grid, List, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  apiClient,
  type TagCount,
  type TagsIndexResponse,
  type SearchResult,
} from "@/services/api";
import { usePhotoStore } from "@/store/photoStore";

interface TagsViewProps {
  currentDirectory: string;
}

type ViewMode = "cloud" | "grid" | "list";

interface EnrichedTag extends TagCount {
  colorClass: string;
}

const COLOR_PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
];

function mapResults(results: SearchResult[]) {
  return results.map((result, index) => ({
    id: index + 1,
    path: result.path,
    src: apiClient.getPhotoUrl(result.path),
    title: result.path.split("/").pop() || `Photo ${index + 1}`,
    score: result.score,
  }));
}

export function TagsView({ currentDirectory }: TagsViewProps) {
  const navigate = useNavigate();
  const {
    setPhotos,
    setLoading: setLibraryLoading,
    setSearchQuery,
    setCurrentView,
  } = usePhotoStore((state) => ({
    setPhotos: state.setPhotos,
    setLoading: state.setLoading,
    setSearchQuery: state.setSearchQuery,
    setCurrentView: state.setCurrentView,
  }));

  const [viewMode, setViewMode] = useState<ViewMode>("cloud");
  const [tags, setTags] = useState<EnrichedTag[]>([]);
  const [indexResponse, setIndexResponse] = useState<TagsIndexResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentDirectory) {
      setTags([]);
      setIndexResponse(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.getTagsIndex(currentDirectory);
        if (cancelled) return;

        const enriched: EnrichedTag[] = response.tagCounts.map((tag, index) => ({
          ...tag,
          colorClass: COLOR_PALETTE[index % COLOR_PALETTE.length],
        }));
        setTags(enriched);
        setIndexResponse(response);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load tag data", err);
        setError(
          err instanceof Error ? err.message : "Unable to load tags index"
        );
        setTags([]);
        setIndexResponse(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentDirectory]);

  const totalTaggedPhotos = useMemo(
    () => tags.reduce((sum, tag) => sum + tag.count, 0),
    [tags]
  );

  const maxTagCount = useMemo(
    () => tags.reduce((max, tag) => Math.max(max, tag.count), 0),
    [tags]
  );

  const handleTagSelect = useCallback(
    async (tag: EnrichedTag) => {
      if (!currentDirectory) return;

      setCurrentView("search");
      setSearchQuery(tag.name);
      setLibraryLoading(true);

      try {
        const response = await apiClient.search(currentDirectory, tag.name, {
          provider: "local",
          topK: 80,
          tags: [tag.name],
        });
        setPhotos(mapResults(response.results));
        navigate("/search");
      } catch (err) {
        console.error("Tag search failed", err);
      } finally {
        setLibraryLoading(false);
      }
    },
    [
      currentDirectory,
      navigate,
      setCurrentView,
      setLibraryLoading,
      setPhotos,
      setSearchQuery,
    ]
  );

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
      <div className="w-14 h-14 rounded-full bg-slate-200/70 dark:bg-slate-700/40 flex items-center justify-center mb-4">
        <TagIcon className="w-7 h-7" />
      </div>
      <p className="text-base font-medium mb-1">{message}</p>
      <p className="text-xs text-slate-400 max-w-sm">
        Run AI tagging or apply manual tags to begin exploring tagged collections.
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
      {Array.from({ length: 10 }).map((_, index) => (
        <Card key={`tag-loading-${index}`} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-200/70 dark:bg-slate-700/70 animate-pulse mx-auto" />
            <div className="h-4 w-2/3 bg-slate-200/80 dark:bg-slate-700/60 animate-pulse mx-auto rounded" />
            <div className="h-3 w-1/3 bg-slate-200/70 dark:bg-slate-700/50 animate-pulse mx-auto rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const getCloudSize = (count: number) => {
    if (maxTagCount === 0) return "text-lg";
    const ratio = count / maxTagCount;
    if (ratio > 0.8) return "text-4xl";
    if (ratio > 0.6) return "text-3xl";
    if (ratio > 0.4) return "text-2xl";
    if (ratio > 0.2) return "text-xl";
    return "text-lg";
  };

  const renderCloudView = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderEmptyState(error);
    if (tags.length === 0) return renderEmptyState("No tags detected yet.");

    return (
      <div className="p-8">
        <div className="flex flex-wrap gap-4 justify-center items-center min-h-[360px]">
          {tags.map((tag) => (
            <button
              key={tag.name}
              type="button"
              onClick={() => handleTagSelect(tag)}
              className={cn(
                "group relative px-4 py-2 rounded-full text-white shadow-lg hover:shadow-xl transition-transform duration-200",
                tag.colorClass,
                "hover:scale-110"
              )}
            >
              <span
                className={cn(
                  "relative z-10 font-semibold transition-colors",
                  getCloudSize(tag.count)
                )}
              >
                #{tag.name}
              </span>
              <div className="absolute inset-0 rounded-full bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 text-xs bg-white/90 text-slate-800 border border-slate-200"
              >
                {tag.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderEmptyState(error);
    if (tags.length === 0) return renderEmptyState("No tags detected yet.");

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
        {tags.map((tag) => (
          <Card
            key={tag.name}
            className="group cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
            onClick={() => handleTagSelect(tag)}
          >
            <CardContent className="p-5 text-center space-y-3">
              <div
                className={cn(
                  "w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white",
                  tag.colorClass
                )}
              >
                <Hash className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                #{tag.name}
              </h3>
              <Badge variant="secondary" className="text-sm">
                {tag.count.toLocaleString()} photos
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderListView = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderEmptyState(error);
    if (tags.length === 0) return renderEmptyState("No tags detected yet.");

    return (
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {tags.map((tag) => (
          <button
            key={tag.name}
            type="button"
            onClick={() => handleTagSelect(tag)}
            className="flex items-center gap-4 p-6 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors w-full text-left"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white",
                tag.colorClass
              )}
            >
              <TagIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                #{tag.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Appears on {tag.count.toLocaleString()} photos
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {tag.count.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                photos
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="bg-white/85 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Tags
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalTaggedPhotos.toLocaleString()} tag assignments across {tags.length} tags
            </p>
            {indexResponse?.allTags?.length ? (
              <p className="text-xs text-slate-400 mt-1">
                {indexResponse.allTags.slice(0, 6).join(", ")}
                {indexResponse.allTags.length > 6 ? "…" : ""}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 bg-slate-100/60 dark:bg-slate-800/60 rounded-lg p-1">
            <Button
              variant={viewMode === "cloud" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cloud")}
              className={cn(
                "px-3 py-2",
                viewMode === "cloud"
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              )}
            >
              <TagIcon className="w-4 h-4 mr-2" />
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
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
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
                  : "hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              )}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === "cloud" && renderCloudView()}
        {viewMode === "grid" && renderGridView()}
        {viewMode === "list" && renderListView()}
      </div>
    </div>
  );
}

export default TagsView;
