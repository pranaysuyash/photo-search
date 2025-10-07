import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Bookmark,
  Brain,
  Calendar,
  ChevronLeft,
  Database,
  FolderOpen,
  Globe,
  Grid,
  HardDrive,
  Map as MapIcon,
  MapPin,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { thumbUrl } from "../api";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
  badge?: string;
  category?: string;
}

interface ModernSidebarProps {
  selectedView: string;
  onViewChange: (view: string) => void;
  stats?: {
    totalPhotos: number;
    collections: number;
    people: number;
    favorites: number;
  };
  collections?: Record<string, string[]>; // Add collections prop
  onOpenCollection?: (collectionName: string) => void; // Add callback for opening collections
  dir?: string; // Add dir prop for thumbnails
  aiStatus?: {
    indexReady: boolean;
    fastIndexType: string;
    freeSpace: number;
  };
  darkMode?: boolean;
  onDarkModeToggle?: () => void;
  onSettingsClick?: () => void;
  onPowerUserClick?: () => void;
  onSelectLibrary?: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  selectedView,
  onViewChange,
  stats = { totalPhotos: 0, collections: 0, people: 0, favorites: 0 },
  collections = {}, // Add default empty object
  onOpenCollection, // Add the callback
  dir = "", // Add dir prop
  aiStatus = { indexReady: true, fastIndexType: "FAISS", freeSpace: 45.2 },
  darkMode = false,
  onDarkModeToggle,
  onSettingsClick,
  onPowerUserClick,
  onSelectLibrary,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreen = () => {
      setIsCompact(window.innerWidth < 1024);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const mainItems: SidebarItem[] = [
    {
      id: "library",
      label: "All Photos",
      icon: Grid,
      count: stats.totalPhotos,
    },
    { id: "results", label: "Search Results", icon: Search },
    { id: "map", label: "Map View", icon: MapIcon },
    { id: "places", label: "Places", icon: MapPin },
    { id: "people", label: "People", icon: Users, count: stats.people },
  ];

  const organizationItems: SidebarItem[] = [
    {
      id: "collections",
      label: "Collections",
      icon: FolderOpen,
      count: stats.collections,
    },
    { id: "tags", label: "Tags", icon: Tag },
    { id: "smart", label: "Smart Albums", icon: Sparkles },
    { id: "trips", label: "Trips", icon: Calendar },
  ];

  const smartFeatures: SidebarItem[] = [
    { id: "saved", label: "Saved Searches", icon: Bookmark },
    // Tasks removed from user app
  ];

  const formatCount = (count?: number) => {
    if (!count) return null;
    if (count > 999) return `${Math.floor(count / 1000)}k`;
    return count.toString();
  };

  const sidebarVariants = {
    expanded: { width: isCompact ? 256 : 320 },
    collapsed: { width: 64 },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const renderNavItem = (item: SidebarItem) => {
    const isActive = selectedView === item.id;
    const Icon = item.icon;
    const count = formatCount(item.count);

    return (
      <motion.button
        key={item.id}
        variants={itemVariants}
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onViewChange(item.id)}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
          {
            "bg-primary text-primary-foreground shadow-sm": isActive,
            "text-muted-foreground hover:bg-secondary": !isActive,
          }
        )}
      >
        <Icon
          className={clsx("w-5 h-5 flex-shrink-0", {
            "text-primary-foreground": isActive,
            "text-muted-foreground group-hover:text-foreground": !isActive,
          })}
        />

        {!isCollapsed && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between flex-1"
            >
              <span className="font-medium text-sm">{item.label}</span>
              {count && (
                <span
                  className={clsx(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    {
                      "bg-primary-foreground/20 text-primary-foreground":
                        isActive,
                      "bg-secondary text-muted-foreground": !isActive,
                    }
                  )}
                >
                  {count}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.button>
    );
  };

  const prefersReducedMotion = useReducedMotion();
  return (
    <>
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative bg-card border-r border-border flex flex-col shadow-sm"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <motion.div
              {...(prefersReducedMotion
                ? {}
                : {
                    whileHover: { rotate: 360 },
                    transition: { duration: 0.5 },
                  })}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm bg-primary text-primary-foreground"
            >
              <Brain className="w-7 h-7" />
            </motion.div>
            {!isCollapsed && (
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              >
                <h1 className="text-xl font-semibold text-foreground">
                  PhotoVault
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered management
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Main sections */}
          <div className="space-y-2">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                Browse
              </h3>
            )}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {mainItems.map(renderNavItem)}
            </motion.div>
          </div>

          {/* Organization */}
          {(!isCollapsed || isCompact) && (
            <div className="space-y-2">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Organization
                </h3>
              )}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {organizationItems.map(renderNavItem)}
              </motion.div>
            </div>
          )}

          {/* Collections */}
          {(!isCollapsed || isCompact) &&
            Object.keys(collections).length > 0 && (
              <div className="space-y-2">
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    Collections
                  </h3>
                )}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                      },
                    },
                  }}
                  className="space-y-1"
                >
                  {Object.entries(collections)
                    .slice(0, isCollapsed ? 3 : 5) // Show fewer when collapsed
                    .map(([name, paths]) => (
                      <motion.button
                        key={name}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onOpenCollection?.(name)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group",
                          "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {/* Collection thumbnail preview */}
                        <div className="relative w-8 h-8 flex-shrink-0">
                          {paths.length > 0 && dir ? (
                            <img
                              src={thumbUrl(dir, "local", paths[0], 64)}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                // Fallback to icon if thumbnail fails
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <FolderOpen
                            className={clsx(
                              "w-5 h-5 flex-shrink-0",
                              paths.length > 0 && dir ? "hidden" : ""
                            )}
                          />
                          {paths.length > 1 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-[8px] text-primary-foreground font-medium">
                                {paths.length > 9 ? "9+" : paths.length}
                              </span>
                            </div>
                          )}
                        </div>

                        {!isCollapsed && (
                          <AnimatePresence mode="wait">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center justify-between flex-1"
                            >
                              <span
                                className="font-medium text-sm truncate"
                                title={name}
                              >
                                {name}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                                {paths.length}
                              </span>
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </motion.button>
                    ))}
                  {/* Show "View All Collections" link if there are more */}
                  {Object.keys(collections).length > (isCollapsed ? 3 : 5) &&
                    !isCollapsed && (
                      <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onViewChange("collections")}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 group text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <FolderOpen className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">
                          View All Collections (
                          {Object.keys(collections).length})
                        </span>
                      </motion.button>
                    )}
                </motion.div>
              </div>
            )}

          {/* Smart Features */}
          {(!isCollapsed || isCompact) && (
            <div className="space-y-2">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  Smart Features
                </h3>
              )}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {smartFeatures.map(renderNavItem)}
              </motion.div>
            </div>
          )}
        </nav>

        {/* AI Status Panel */}
        {!isCollapsed && (
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-t border-border"
          >
            <div className="rounded-2xl p-4 border border-border bg-secondary text-foreground">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-success rounded-full animate-ping opacity-75" />
                </div>
                <span className="text-sm font-semibold text-success">
                  AI System Ready
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Index</span>
                  <Activity className="w-3 h-3 text-success" />
                </div>
                <div className="flex items-center justify-between">
                  <span>{aiStatus.fastIndexType}</span>
                  <Database className="w-3 h-3 text-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <span>OCR</span>
                  <Globe className="w-3 h-3 text-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <span>{aiStatus.freeSpace}GB</span>
                  <HardDrive className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-3 bg-card">
          {!isCollapsed ? (
            <>
              <motion.button
                {...(prefersReducedMotion
                  ? {}
                  : { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 } })}
                onClick={onSelectLibrary}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 font-semibold"
              >
                <HardDrive className="w-5 h-5" />
                <span>Select Library</span>
              </motion.button>
              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  {...(prefersReducedMotion
                    ? {}
                    : {
                        whileHover: { scale: 1.05 },
                        whileTap: { scale: 0.95 },
                      })}
                  onClick={onSettingsClick}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </motion.button>
                <motion.button
                  {...(prefersReducedMotion
                    ? {}
                    : {
                        whileHover: { scale: 1.05 },
                        whileTap: { scale: 0.95 },
                      })}
                  onClick={onPowerUserClick}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Power User</span>
                </motion.button>
                <motion.button
                  {...(prefersReducedMotion
                    ? {}
                    : {
                        whileHover: { scale: 1.05 },
                        whileTap: { scale: 0.95 },
                      })}
                  onClick={onDarkModeToggle}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {darkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <motion.button
                {...(prefersReducedMotion
                  ? {}
                  : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
                onClick={onSelectLibrary}
                className="w-full flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                <HardDrive className="w-6 h-6" />
              </motion.button>
              <motion.button
                {...(prefersReducedMotion
                  ? {}
                  : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
                onClick={onSettingsClick}
                className="w-full flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
              <motion.button
                {...(prefersReducedMotion
                  ? {}
                  : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
                onClick={onPowerUserClick}
                className="w-full flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Power user features"
              >
                <Zap className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <motion.button
          {...(prefersReducedMotion
            ? {}
            : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-24 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.3 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Mobile Overlay */}
      {isCompact && !isCollapsed && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          onClick={() => setIsCollapsed(true)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
};

export default ModernSidebar;
