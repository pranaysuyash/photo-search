import React from "react";
import {
  FolderOpen,
  Search,
  Upload,
  Camera,
  Download,
  Settings,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

interface EmptyStateProps {
  type:
    | "no-directory"
    | "no-photos"
    | "no-results"
    | "no-favorites"
    | "no-collections"
    | "loading"
    | "error"
    | "no-people"
    | "no-map-data"
    | "indexing";
  onAction?: () => void;
  onDemoAction?: () => void;
  errorMessage?: string;
  context?: "search" | "library" | "people" | "map" | "collections";
  searchQuery?: string;
}

export function EmptyState({
  type,
  onAction,
  onDemoAction,
  errorMessage,
  context,
  searchQuery,
}: EmptyStateProps) {
  const states = {
    "no-directory": {
      icon: <FolderOpen className="w-16 h-16 text-gray-300" />,
      title: "Welcome to AI Photo Search!",
      description:
        "Discover your photos with the power of AI. Search naturally like 'beach sunset' or 'family birthday party'. Let's get you started!",
      actionLabel: "Select Photo Folder",
      actionIcon: <FolderOpen className="w-5 h-5" />,
      showDemoOption: true,
    },
    "no-photos": {
      icon: <Camera className="w-16 h-16 text-gray-300" />,
      title: "No Photos Found",
      description:
        "We couldn't find any photos in this directory. Try a different folder or check if your photos are in subfolders.",
      actionLabel: "Choose Different Folder",
      actionIcon: <FolderOpen className="w-5 h-5" />,
    },
    "no-results": {
      icon: <Search className="w-16 h-16 text-gray-300" />,
      title: searchQuery
        ? `No photos match "${searchQuery}"`
        : "No Results Found",
      description:
        context === "search"
          ? "Try different keywords like 'beach sunset', 'family photos', or 'birthday party'. Our AI understands natural language! You can also search for colors, objects, or emotions."
          : "Try adjusting your search terms or filters",
      actionLabel:
        context === "search" ? "Try Sample Searches" : "Clear Search",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
    "no-favorites": {
      icon: <Camera className="w-16 h-16 text-gray-300" />,
      title: "No Favorites Yet",
      description:
        "Heart the photos you love to easily find them later. Start building your personal collection!",
      actionLabel: "Browse Your Photos",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
    "no-collections": {
      icon: <FolderOpen className="w-16 h-16 text-gray-300" />,
      title: "No Collections Yet",
      description:
        "Organize your photos into themed groups like 'Vacations', 'Family', or 'Nature'. Create your first collection!",
      actionLabel: "Create First Collection",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
    "no-people": {
      icon: <Camera className="w-16 h-16 text-gray-300" />,
      title: "No People Detected",
      description:
        "Let us scan your photos for faces. This helps you find photos of specific people instantly!",
      actionLabel: "Scan for Faces",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
    "no-map-data": {
      icon: <Search className="w-16 h-16 text-gray-300" />,
      title: "No Location Data",
      description:
        "Your photos don't have GPS coordinates. Add location data to see them on the map!",
      actionLabel: "Learn How",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
    indexing: {
      icon: (
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      ),
      title: "Analyzing Your Photos",
      description:
        "We're using AI to understand your photos. This takes about 30-60 seconds per 100 photos.",
      actionLabel: null,
      actionIcon: null,
    },
    loading: {
      icon: (
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      ),
      title: "Loading Your Photos",
      description: "Please wait while we load your photo library...",
      actionLabel: null,
      actionIcon: null,
    },
    error: {
      icon: <HelpCircle className="w-16 h-16 text-red-400" />,
      title: "Oops! Something Went Wrong",
      description:
        errorMessage ||
        "We couldn't load your photos. This might be a temporary issue. Try again in a moment.",
      actionLabel: "Try Again",
      actionIcon: <ArrowRight className="w-5 h-5" />,
    },
  };

  const state = states[type];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="mb-6">{state.icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {state.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {state.description}
      </p>

      {/* Demo Library Option for no-directory state */}
      {type === "no-directory" && onDemoAction && (
        <div className="mb-6">
          <DemoLibraryToggle
            onEnableDemo={onDemoAction}
            onSelectDirectory={onAction || (() => {})}
          />
        </div>
      )}

      {state.actionLabel && onAction && type !== "no-directory" && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {state.actionIcon}
          {state.actionLabel}
        </button>
      )}

      {/* Regular action button for no-directory when no demo */}
      {state.actionLabel &&
        onAction &&
        type === "no-directory" &&
        !onDemoAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {state.actionIcon}
            {state.actionLabel}
          </button>
        )}
    </div>
  );
}

interface SampleSearchSuggestionsProps {
  onSearch: (query: string) => void;
}

export function SampleSearchSuggestions({
  onSearch,
}: SampleSearchSuggestionsProps) {
  const sampleSearches = [
    "photos from last summer",
    "my kids playing",
    "that trip to Paris",
    "birthday celebrations",
    "sunset at the beach",
    "our dog running",
    "Christmas morning",
    "backyard BBQ",
    "first day of school",
    "weekend adventures",
    "family dinner",
    "vacation memories",
    "funny moments",
    "beautiful landscapes",
    "selfies with friends",
  ];

  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Try searching for:
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {sampleSearches.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => onSearch(query)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 text-left"
          >
            {query}
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        💡 Just describe what you're looking for in your own words
      </div>
    </div>
  );
}

interface QuickActionsProps {
  onSelectDirectory: () => void;
  onImport: () => void;
  onHelp: () => void;
}

export function QuickActions({
  onSelectDirectory,
  onImport,
  onHelp,
}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      <button
        type="button"
        onClick={onSelectDirectory}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-left group"
      >
        <FolderOpen className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
        <h4 className="font-semibold mb-1">Select Directory</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose a folder with your photos
        </p>
      </button>

      <button
        type="button"
        onClick={onImport}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-left group"
      >
        <Download className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition-transform" />
        <h4 className="font-semibold mb-1">Import Photos</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Import from camera or device
        </p>
      </button>

      <button
        type="button"
        onClick={onHelp}
        className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-left group"
      >
        <HelpCircle className="w-8 h-8 text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
        <h4 className="font-semibold mb-1">Get Help</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View tutorials and documentation
        </p>
      </button>
    </div>
  );
}

interface OnboardingTipsProps {
  currentTip?: number;
}

export function OnboardingTips({ currentTip = 0 }: OnboardingTipsProps) {
  const tips = [
    {
      title: "Natural Language Search",
      description:
        "Search for 'sunset at beach' or 'birthday party with cake' - our AI understands what you're looking for",
    },
    {
      title: "Face Recognition",
      description:
        "Automatically groups photos by people - find all photos of someone instantly",
    },
    {
      title: "Smart Collections",
      description: "Create collections that auto-update based on your criteria",
    },
    {
      title: "Duplicate Detection",
      description: "Find and remove duplicate photos to save space",
    },
  ];

  const tip = tips[currentTip % tips.length];

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mx-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            💡 Tip: {tip.title}
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {tip.description}
          </p>
        </div>
      </div>
    </div>
  );
}

interface DemoLibraryToggleProps {
  onEnableDemo: () => void;
  onSelectDirectory: () => void;
}

export function DemoLibraryToggle({
  onEnableDemo,
  onSelectDirectory,
}: DemoLibraryToggleProps) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mx-6">
      <div className="text-center">
        <div className="mb-4">
          <Camera className="w-12 h-12 text-purple-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Try Photo Search with Demo Photos
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto">
            Experience the power of AI-powered photo search with our curated
            demo library. No setup required - just click below to explore!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onEnableDemo}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            🚀 Try Demo Library
          </button>
          <button
            type="button"
            onClick={onSelectDirectory}
            className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Use My Photos
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          💡 Demo includes 50+ sample photos across various categories
        </div>
      </div>
    </div>
  );
}
