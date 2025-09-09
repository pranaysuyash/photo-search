import React, { useState } from "react";
import {
  FolderOpen,
  Search,
  Image,
  Upload,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Wand2,
  LifeBuoy,
} from "lucide-react";

interface EnhancedEmptyStateProps {
  type: "no-directory" | "no-photos" | "no-results" | "indexing";
  searchQuery?: string;
  onAction?: () => void;
  onDemoAction?: () => void;
  // Extended context actions
  onClearSearch?: () => void;
  onOpenFilters?: () => void;
  onOpenAdvanced?: () => void;
  onOpenHelp?: () => void;
  onStartTour?: () => void;
  onOpenJobs?: () => void;
  sampleQueries?: string[];
  onRunSample?: (q: string) => void;
  hasActiveFilters?: boolean;
  indexingProgress?: number;
  estimatedTime?: string;
}

export function EnhancedEmptyState({
  type,
  searchQuery,
  onAction,
  onDemoAction,
  onClearSearch,
  onOpenFilters,
  onOpenAdvanced,
  onOpenHelp,
  onStartTour,
  onOpenJobs,
  sampleQueries,
  onRunSample,
  hasActiveFilters,
  indexingProgress = 0,
  estimatedTime,
}: EnhancedEmptyStateProps) {
  const [showTips, setShowTips] = useState(false);
  const defaultSamples = ["beach sunset", "birthday cake", "mountain hike", "red car"];
  const samples = Array.isArray(sampleQueries) && sampleQueries.length > 0 ? sampleQueries : defaultSamples;

  const getContent = () => {
    switch (type) {
      case "no-directory":
        return {
          icon: <FolderOpen className="w-16 h-16 text-gray-400" />,
          title: "Welcome to Photo Search",
          description:
            "Get started by selecting a folder containing your photos. We'll analyze them to make them searchable.",
          actionLabel: "Select Photo Folder",
          action: onAction,
          demoActionLabel: "Try Demo Photos",
          demoAction: onDemoAction,
          tips: [
            "Choose a folder with JPEG, PNG, or other common photo formats",
            "We'll scan and analyze your photos using AI for natural language search",
            "Your photos stay on your device - we only create searchable indexes",
            "You can always add more folders later from the settings",
          ],
        };

      case "no-photos":
        return {
          icon: <Image className="w-16 h-16 text-gray-400" />,
          title: "No Photos Found",
          description:
            "This folder doesn't contain any photos yet. Add some photos or select a different folder.",
          actionLabel: "Select Different Folder",
          action: onAction,
          tips: [
            "Make sure your photos are in common formats like JPEG, PNG, or TIFF",
            "Check that the folder contains actual photo files, not just subfolders",
            "If you just added photos, try refreshing the library",
            "You can also import photos from other locations",
          ],
        };

      case "no-results":
        return {
          icon: <Search className="w-16 h-16 text-gray-400" />,
          title: `No results for "${searchQuery}"`,
          description:
            "Try adjusting your search terms or filters. Here are some suggestions:",
          suggestions: [
            "Use simpler words or phrases",
            "Try searching for colors, objects, or locations",
            "Check your spelling",
            "Remove filters if any are applied",
            "Try searching for people or events",
          ],
          actionLabel: "Clear Search",
          action: onAction,
        };

      case "indexing":
        return {
          icon: <Upload className="w-16 h-16 text-blue-500 animate-pulse" />,
          title: "Indexing Your Photos",
          description: `Analyzing your photos to make them searchable. ${indexingProgress}% complete.`,
          progress: indexingProgress,
          estimatedTime,
          tips: [
            "This process analyzes each photo using AI to understand its content",
            "You'll be able to search by objects, scenes, colors, and more",
            "The process typically takes about 30 seconds per 100 photos",
            "You can continue using other features while indexing runs",
          ],
        };

      default:
        return {
          icon: <HelpCircle className="w-16 h-16 text-gray-400" />,
          title: "Something went wrong",
          description: "We're having trouble loading this content.",
          actionLabel: "Try Again",
          action: onAction,
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center" role={type === "indexing" ? "status" : undefined} aria-live={type === "indexing" ? "polite" : undefined}>
      <div className="mb-6">{content.icon}</div>

      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
        {content.title}
      </h2>

      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed">
        {content.description}
      </p>

      {/* Progress bar for indexing */}
      {content.progress !== undefined && (
        <div className="w-full max-w-md mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${content.progress}%` }}
            />
          </div>
          {content.estimatedTime && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Estimated time remaining: {content.estimatedTime}
            </p>
          )}
        </div>
      )}

      {/* Suggestions for no-results */}
      {content.suggestions && (
        <div className="mb-6 text-left max-w-md">
          <ul className="space-y-2">
            {content.suggestions.map((suggestion, index) => (
              <li key={`suggestion-${suggestion.substring(0, 10)}-${index}`} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-500 mt-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onOpenFilters && (
              <button type="button" onClick={onOpenFilters} className="px-3 py-1.5 rounded border text-sm flex items-center gap-1">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
            )}
            {onOpenAdvanced && (
              <button type="button" onClick={onOpenAdvanced} className="px-3 py-1.5 rounded border text-sm flex items-center gap-1">
                <Wand2 className="w-4 h-4" /> Advanced
              </button>
            )}
            {hasActiveFilters && onClearSearch && (
              <button type="button" onClick={onClearSearch} className="px-3 py-1.5 rounded border text-sm">Clear filters</button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {samples.map((q) => (
              <button key={q} type="button" onClick={() => onRunSample && onRunSample(q)} className="px-2 py-1.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-6 flex-wrap justify-center">
        {content.action && (
          <button
            type="button"
            onClick={content.action}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {content.actionLabel}
          </button>
        )}
        {content.demoAction && (
          <button
            type="button"
            onClick={content.demoAction}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {content.demoActionLabel}
          </button>
        )}
        {type === "no-directory" && onStartTour && (
          <button type="button" onClick={onStartTour} className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Start Tour
          </button>
        )}
        {type === "indexing" && onOpenJobs && (
          <button type="button" onClick={onOpenJobs} className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            View Progress
          </button>
        )}
        {onOpenHelp && (
          <button type="button" onClick={onOpenHelp} className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <LifeBuoy className="w-4 h-4" /> Help
          </button>
        )}
      </div>

      {/* Expandable tips section */}
      {content.tips && (
        <div className="max-w-md">
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {showTips ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showTips ? "Hide tips" : "Show tips"}
          </button>

          {showTips && (
            <div className="mt-4 text-left">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                  💡 Tips
                </h4>
                <ul className="space-y-2">
                  {content.tips.map((tip, index) => (
                    <li
                      key={`tip-${tip.substring(0, 10)}-${index}`}
                      className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200"
                    >
                      <span className="text-blue-500 mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
