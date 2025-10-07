import { Search, X, Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: (query: string) => void;
  currentView: string;
  currentDirectory?: string | null;
  onDirectoryChange?: (dir: string) => void;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onSearch,
  currentView,
  currentDirectory,
  onDirectoryChange,
}: TopBarProps) {
  const envLogo = (
    import.meta as unknown as { env?: { VITE_BRAND_LOGO?: string } }
  ).env?.VITE_BRAND_LOGO;
  const brandLogo =
    envLogo && envLogo.length > 0 ? envLogo : "/generated/asset_0.png";
  const [showSettings, setShowSettings] = useState(false);
  const [dirInput, setDirInput] = useState<string>(currentDirectory || "");
  const [theme, setTheme] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("theme") || "system";
    }
    return "system";
  });

  const applyTheme = (t: string) => {
    setTheme(t);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", t);
      }
      const root = document.documentElement;
      if (t === "dark") root.classList.add("dark");
      else if (t === "light") root.classList.remove("dark");
      else {
        // system: follow prefers-color-scheme
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (mq?.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    } catch {}
  };
  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const clearSearch = () => {
    onSearchChange("");
    onSearch("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div
      className={cn(
        "top-bar bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
        "border-b border-slate-200/60 dark:border-slate-700/60",
        "py-3 px-4 flex items-center justify-between"
      )}
    >
      {/* Left brand area */}
      <div className="flex items-center gap-2 min-w-0 pr-3">
        {/* Hide image gracefully if missing */}
        <img
          src={brandLogo}
          alt="Brand"
          className="h-8 w-8 rounded-md object-cover select-none"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
          }}
          draggable={false}
        />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
          Photo Search
        </span>
      </div>

      {/* Center search area */}
      <div className="flex items-center space-x-2 flex-1 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyUp={handleKeyPress}
            placeholder={`Search your ${currentView}...`}
            className="pl-10 pr-10 py-2 h-10 w-full bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 transition-colors focus-visible:ring-1 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/50"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
              onClick={clearSearch}
            >
              <X className="h-4 w-4 text-slate-500" />
            </Button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          className="h-10 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
        >
          Search
        </Button>
      </div>

      {/* Right settings button (offline-only; no indicators) */}
      <div className="relative flex items-center ml-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <SettingsIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </Button>

        {showSettings && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-3 shadow-xl">
            <div className="mb-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Directory
              </div>
              <Input
                type="text"
                value={dirInput}
                onChange={(e) => setDirInput(e.target.value)}
                placeholder="/path/to/photos"
                className="h-9"
                aria-label="Photos directory"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onDirectoryChange?.(dirInput);
                    setShowSettings(false);
                  }}
                >
                  Use Directory
                </Button>
              </div>
            </div>
            <div className="mb-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Theme
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={theme === "light" ? "default" : "outline"}
                  aria-label="Light theme"
                  onClick={() => applyTheme("light")}
                >
                  <Sun className="h-4 w-4 mr-1" /> Light
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={theme === "dark" ? "default" : "outline"}
                  aria-label="Dark theme"
                  onClick={() => applyTheme("dark")}
                >
                  <Moon className="h-4 w-4 mr-1" /> Dark
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={theme === "system" ? "default" : "outline"}
                  aria-label="System theme"
                  onClick={() => applyTheme("system")}
                >
                  System
                </Button>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
