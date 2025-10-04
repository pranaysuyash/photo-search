import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Library,
  Search,
  Users,
  MapPin,
  Heart,
  Tag,
  Calendar,
  Folder,
  ChevronRight,
  ChevronDown,
  Settings,
  Camera,
  Globe,
  Clock,
  Sparkles,
  Image,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  currentDirectory: string | null;
  onDirectoryChange: (directory: string) => void;
  photoCount: number;
}

const navigationItems = [
  {
    id: "library",
    label: "Library",
    icon: Library,
    count: null,
    color: "text-blue-600",
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    count: null,
    color: "text-green-600",
  },
  {
    id: "collections",
    label: "Collections",
    icon: Folder,
    count: null,
    color: "text-yellow-600",
  },
  {
    id: "people",
    label: "People",
    icon: Users,
    count: 142,
    color: "text-purple-600",
  },
  {
    id: "places",
    label: "Places",
    icon: MapPin,
    count: 28,
    color: "text-orange-600",
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: Heart,
    count: 89,
    color: "text-red-600",
  },
  { id: "tags", label: "Tags", icon: Tag, count: 156, color: "text-cyan-600" },
  {
    id: "trips",
    label: "Trips",
    icon: Calendar,
    count: 12,
    color: "text-indigo-600",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    count: null,
    color: "text-emerald-600",
  },
];

const smartAlbums = [
  { name: "Recent", icon: Clock, count: 47, color: "text-blue-500" },
  { name: "Screenshots", icon: Camera, count: 23, color: "text-gray-500" },
  { name: "Shared", icon: Globe, count: 12, color: "text-green-500" },
  { name: "AI Generated", icon: Sparkles, count: 8, color: "text-purple-500" },
];

const recentSearches = [
  "sunset beach",
  "family photos",
  "vacation 2024",
  "birthday party",
  "nature landscape",
];

export function Sidebar({
  currentView,
  onViewChange,
  currentDirectory,
  onDirectoryChange,
  photoCount,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showRecentSearches, setShowRecentSearches] = useState(true);
  const [showSmartAlbums, setShowSmartAlbums] = useState(true);

  const handleDirectorySelect = () => {
    // Use e2e_data as demo directory for testing
    const demoDir =
      "/Users/pranay/Projects/adhoc_projects/photo-search/e2e_data";
    onDirectoryChange(demoDir);
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 flex flex-col p-3 shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="mb-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {navigationItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "mb-2 p-2 transition-all duration-200",
                currentView === item.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  currentView === item.id ? "text-white" : item.color
                )}
              />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Image className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Photo Search
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {photoCount} photos
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
        </div>

        {/* Directory Selector */}
        <Button
          variant="outline"
          onClick={handleDirectorySelect}
          className="w-full justify-start text-left bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors"
        >
          <Folder className="h-4 w-4 mr-2 text-slate-500" />
          <span className="truncate text-sm">
            {currentDirectory || "Select Photos Folder"}
          </span>
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "default" : "ghost"}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full justify-start text-left transition-all duration-200 group",
                  currentView === item.id
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md scale-[1.02]"
                    : "hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:scale-[1.01]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 mr-3 transition-colors",
                    currentView === item.id ? "text-white" : item.color
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.count && (
                  <Badge
                    variant={currentView === item.id ? "secondary" : "outline"}
                    className={cn(
                      "text-xs transition-colors",
                      currentView === item.id
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {item.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        <Separator className="my-6 bg-slate-200/60 dark:bg-slate-700/60" />

        {/* Smart Albums */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowSmartAlbums(!showSmartAlbums)}
            className="w-full justify-start p-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
          >
            {showSmartAlbums ? (
              <ChevronDown className="h-3 w-3 mr-2" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-2" />
            )}
            Smart Albums
          </Button>

          {showSmartAlbums && (
            <div className="space-y-1 ml-4">
              {smartAlbums.map((album) => {
                const Icon = album.icon;
                return (
                  <Button
                    key={album.name}
                    variant="ghost"
                    className="w-full justify-start text-left py-2 px-3 text-sm hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <Icon className={cn("h-3 w-3 mr-3", album.color)} />
                    <span className="flex-1">{album.name}</span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {album.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="my-6 bg-slate-200/60 dark:bg-slate-700/60" />

        {/* Recent Searches */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowRecentSearches(!showRecentSearches)}
            className="w-full justify-start p-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
          >
            {showRecentSearches ? (
              <ChevronDown className="h-3 w-3 mr-2" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-2" />
            )}
            Recent Searches
          </Button>

          {showRecentSearches && (
            <div className="space-y-1 ml-4">
              {recentSearches.map((search) => (
                <Button
                  key={search}
                  variant="ghost"
                  className="w-full justify-start text-left py-2 px-3 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  <Search className="h-3 w-3 mr-3 text-slate-400" />
                  <span className="truncate">{search}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <Button
          variant="ghost"
          className="w-full justify-start text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Settings className="h-4 w-4 mr-3 text-slate-500" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </div>
  );
}
