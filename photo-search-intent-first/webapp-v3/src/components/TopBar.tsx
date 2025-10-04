import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Calendar,
  Star,
  MoreHorizontal,
  Zap,
  Camera,
  Shuffle,
  Download,
  Share2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
  currentView: string;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onSearch,
  currentView,
}: TopBarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch(searchQuery);
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "library":
        return "Library";
      case "search":
        return "Search Results";
      case "people":
        return "People";
      case "places":
        return "Places";
      case "favorites":
        return "Favorites";
      case "tags":
        return "Tags";
      case "memories":
        return "Memories";
      default:
        return "Photos";
    }
  };

  return (
    <div className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/60 dark:bg-slate-900/90 dark:border-slate-700/60 shadow-sm">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Title and Search */}
        <div className="flex items-center space-x-6 flex-1">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
              {getViewTitle()}
            </h2>
            {currentView === "search" && searchQuery && (
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                "{searchQuery}"
              </Badge>
            )}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <div
              className={cn(
                "relative transition-all duration-200",
                isSearchFocused && "scale-105"
              )}
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search photos, people, places..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "pl-10 pr-4 py-2 w-full bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all duration-200",
                  "focus:bg-white dark:focus:bg-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50",
                  isSearchFocused && "shadow-lg"
                )}
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  ×
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <Zap className="h-4 w-4 mr-2" />
            Smart Search
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Surprise Me
          </Button>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-7 px-2",
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 shadow-sm"
                  : "hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <Grid3X3 className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-7 px-2",
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 shadow-sm"
                  : "hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <SortAsc className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => console.log("Sort by date")}>
                <Calendar className="h-4 w-4 mr-2" />
                Date Added
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Sort by name")}>
                <Camera className="h-4 w-4 mr-2" />
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Sort by size")}>
                <Settings2 className="h-4 w-4 mr-2" />
                File Size
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Sort by rating")}>
                <Star className="h-4 w-4 mr-2" />
                Rating
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Star className="h-4 w-4 mr-2" />
                Favorites Only
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Camera className="h-4 w-4 mr-2" />
                RAW Files
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>This Week</DropdownMenuItem>
              <DropdownMenuItem>This Month</DropdownMenuItem>
              <DropdownMenuItem>This Year</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Selection
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share Album
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings2 className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
