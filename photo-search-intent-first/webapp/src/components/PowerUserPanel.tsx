import React, { useState } from "react";
import { cn } from "../lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui";
import { useDir } from "../stores";
import { offlineCapableGetLibrary } from "../api/offline";
import { enhancedOfflineStorage } from "../services/EnhancedOfflineStorage";
import { thumbnailGenerator } from "../services/ThumbnailGenerator";

interface PowerUserFeature {
  id: string;
  title: string;
  description: string;
  shortcuts: string[];
  category: "search" | "navigation" | "productivity" | "advanced";
  isEnabled?: boolean;
}

interface PowerUserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const POWER_USER_FEATURES: PowerUserFeature[] = [
  {
    id: "advanced-search",
    title: "Advanced Search",
    description: "Build complex queries with multiple filters",
    shortcuts: ["A", "Ctrl+F"],
    category: "search",
  },
  {
    id: "search-history",
    title: "Search History",
    description: "Access recent searches and quickly rerun",
    shortcuts: ["Ctrl+H"],
    category: "search",
  },
  {
    id: "timeline-jump",
    title: "Timeline Navigation",
    description: "Quick jump to specific time periods",
    shortcuts: ["T", "M", "L", "O"],
    category: "navigation",
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description: "30+ shortcuts for power users",
    shortcuts: ["Shift+?"],
    category: "productivity",
  },
  {
    id: "batch-operations",
    title: "Batch Operations",
    description: "Select and act on multiple photos",
    shortcuts: ["Ctrl+A", "Ctrl+D", "Delete"],
    category: "productivity",
  },
  {
    id: "view-modes",
    title: "View Modes",
    description: "Switch between grid, list, and detail views",
    shortcuts: ["Shift+G", "Shift+L"],
    category: "navigation",
  },
  {
    id: "metadata-filters",
    title: "Metadata Filters",
    description: "Filter by camera, settings, and technical details",
    shortcuts: ["F"],
    category: "advanced",
  },
  {
    id: "collections",
    title: "Smart Collections",
    description: "Create and manage photo collections",
    shortcuts: ["Ctrl+N"],
    category: "advanced",
  },
];

const CATEGORY_COLORS = {
  search: "bg-blue-100 text-blue-800",
  navigation: "bg-green-100 text-green-800",
  productivity: "bg-purple-100 text-purple-800",
  advanced: "bg-orange-100 text-orange-800",
};

const CATEGORY_LABELS = {
  search: "Search",
  navigation: "Navigation",
  productivity: "Productivity",
  advanced: "Advanced",
};

export function PowerUserPanel({ isOpen, onClose }: PowerUserPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    PowerUserFeature["category"] | "all"
  >("all");
  const [enabledFeatures, setEnabledFeatures] = useState<Set<string>>(
    new Set()
  );
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);
  const dir = useDir();

  const filteredFeatures =
    selectedCategory === "all"
      ? POWER_USER_FEATURES
      : POWER_USER_FEATURES.filter(
          (feature) => feature.category === selectedCategory
        );

  const toggleFeature = (featureId: string) => {
    const newEnabled = new Set(enabledFeatures);
    if (newEnabled.has(featureId)) {
      newEnabled.delete(featureId);
    } else {
      newEnabled.add(featureId);
    }
    setEnabledFeatures(newEnabled);
  };

  const runDevAction = async (action: () => Promise<void>) => {
    if (!import.meta.env.DEV) {
      return;
    }
    setDevBusy(true);
    try {
      await action();
    } finally {
      setDevBusy(false);
    }
  };

  const handleSeedDemoPhotos = () =>
    runDevAction(async () => {
      if (!dir) {
        setDevMessage("Select a library directory before seeding demo photos.");
        return;
      }
      await offlineCapableGetLibrary(dir);
      setDevMessage("Seeded demo photos into offline cache.");
    });

  const handleGenerateThumbnails = () =>
    runDevAction(async () => {
      if (!dir) {
        setDevMessage("Select a library directory before generating thumbnails.");
        return;
      }
      const photos = await enhancedOfflineStorage.getAllPhotos();
      const before = photos.filter((photo) => !photo.thumbnail).length;
      thumbnailGenerator.enqueueMissing(dir, photos);
      setDevMessage(
        before > 0
          ? `Queued thumbnail generation for ${before} photos.`
          : "No missing thumbnails detected."
      );
    });

  const handleClearOfflineCache = () =>
    runDevAction(async () => {
      await enhancedOfflineStorage.clearAll();
      setDevMessage("Cleared offline cache. Seed again to repopulate.");
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-background rounded-lg border shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">Power User Features</h2>
              <p className="text-muted-foreground mt-1">
                Advanced features and shortcuts for experienced users
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 p-4 border-b">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All Features
            </Button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSelectedCategory(key as PowerUserFeature["category"])
                }
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Features Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFeatures.map((feature) => (
                <Card
                  key={feature.id}
                  className={cn(
                    "transition-all hover:shadow-md",
                    enabledFeatures.has(feature.id) && "ring-2 ring-primary"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {feature.title}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            CATEGORY_COLORS[feature.category]
                          )}
                        >
                          {CATEGORY_LABELS[feature.category]}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeature(feature.id)}
                        className="h-8 w-8 p-0"
                      >
                        {enabledFeatures.has(feature.id) ? "✓" : "+"}
                      </Button>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {feature.shortcuts.map((shortcut, index) => (
                        <kbd
                          key={index}
                          className="px-2 py-1 text-xs bg-muted border rounded font-mono"
                        >
                          {shortcut}
                        </kbd>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="border-t bg-muted/40 p-4">
              <Card className="bg-background/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Offline Debug Utilities
                  </CardTitle>
                  <CardDescription>
                    Tools to seed demo data, regenerate thumbnails, and clear caches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={devBusy}
                      onClick={handleSeedDemoPhotos}
                    >
                      Seed demo photos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={devBusy}
                      onClick={handleGenerateThumbnails}
                    >
                      Generate missing thumbnails
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={devBusy}
                      onClick={handleClearOfflineCache}
                    >
                      Clear offline cache
                    </Button>
                  </div>
                  {devMessage && (
                    <p className="text-sm text-muted-foreground">{devMessage}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-muted/50">
            <div className="text-sm text-muted-foreground">
              {enabledFeatures.size} features enabled
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnabledFeatures(new Set())}
              >
                Clear All
              </Button>
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
