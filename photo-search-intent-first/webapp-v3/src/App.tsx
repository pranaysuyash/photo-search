import { useState, useEffect, useCallback, useRef } from "react";
import "./styles/generated-bg.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { PhotoLibrary } from "./components/PhotoLibrary";
import { Collections } from "./components/Collections";
import { People } from "./components/People";
import { Trips } from "./components/Trips";
import { Analytics } from "./components/Analytics";
import PlacesView from "./components/PlacesView";
import TagsView from "./components/TagsView";
import Favorites from "./components/Favorites";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Preferences } from "./components/Preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePhotoStore } from "./store/photoStore";
import { apiClient, type SearchResult } from "./services/api";
import { DEMO_LIBRARY_DIR } from "./constants/directories";
import { useElectronBridge } from "./hooks/useElectronBridge";

// Day 1 components
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";
import { LoadingOverlay } from "./components/Loading";
import { useUIStore } from "./store/uiStore";
import Day1Demo from "./Day1Demo";
import { GridDemo } from "./components/GridDemo";

function AppContent() {
  const {
    currentDirectory,
    setCurrentDirectory,
    photos,
    setPhotos,
    isLoading,
    setLoading,
    favoriteEntries,
    setFavoriteEntries,
    updateFavoriteForPath,
  } = usePhotoStore();

  const [analyticsCounts, setAnalyticsCounts] = useState({
    people: 0,
    places: 0,
    favorites: 0,
    tags: 0,
  });
  const [tripsCount, setTripsCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("library");
  const navigate = useNavigate();
  const [indexBootstrapped, setIndexBootstrapped] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const modifierKeyLabel = isMac ? "⌘" : "Ctrl";

  // Day 1: Global UI state
  const { globalLoading, loadingMessage } = useUIStore();

  const ShortcutRow = ({
    action,
    keys,
  }: {
    action: string;
    keys: string[];
  }) => (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-100/80 dark:bg-slate-800/60 px-3 py-2 text-sm">
      <span className="text-slate-600 dark:text-slate-200">{action}</span>
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
        {keys.map((key) => (
          <kbd
            key={key}
            className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 shadow-inner"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );

  // Use Electron bridge hook
  const { isElectron, getStoreSetting, setStoreSetting, selectImportFolder } =
    useElectronBridge();

  // Ensure a directory is selected (prefer persisted workspace when running in Electron)
  useEffect(() => {
    if (currentDirectory) return;
    let cancelled = false;

    const bootstrapDirectory = async () => {
      if (isElectron) {
        try {
          const stored = await getStoreSetting("lastSelectedDirectory");
          if (
            !cancelled &&
            typeof stored === "string" &&
            stored.trim().length > 0
          ) {
            setCurrentDirectory(stored);
            return;
          }
        } catch (error) {
          console.warn("Failed to read last selected directory:", error);
        }
      }

      if (!cancelled) {
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            const storedLocal = window.localStorage.getItem("ps:lastDirectory");
            if (
              storedLocal &&
              typeof storedLocal === "string" &&
              storedLocal.trim().length > 0
            ) {
              setCurrentDirectory(storedLocal);
              return;
            }
          }
        } catch (error) {
          console.warn("Failed to read cached directory from storage:", error);
        }
      }

      if (!cancelled && !isElectron) {
        setCurrentDirectory(DEMO_LIBRARY_DIR);
      }
    };

    bootstrapDirectory();

    return () => {
      cancelled = true;
    };
  }, [currentDirectory, setCurrentDirectory, isElectron, getStoreSetting]);

  // React to Electron menu-driven directory selection events when exposed
  useEffect(() => {
    if (!isElectron) return;

    const api = window.electronAPI;
    if (!api) return;

    const channel = "directory:selected";
    const handler = (_event: unknown, directory: unknown) => {
      if (typeof directory === "string" && directory.trim().length > 0) {
        setCurrentDirectory(directory);
      }
    };

    let cleanup: (() => void) | undefined;

    if (typeof api.onDirectorySelected === "function") {
      const boundHandler = (_event: unknown, directory: unknown) =>
        handler(_event, directory);
      api.onDirectorySelected(boundHandler);
      cleanup = () => {
        api.removeListener?.(channel, boundHandler);
      };
    } else if (typeof api.on === "function") {
      const boundHandler = (_event: unknown, directory: unknown) =>
        handler(_event, directory);
      api.on(channel, boundHandler);
      cleanup = () => {
        api.removeListener?.(channel, boundHandler);
      };
    }

    return cleanup;
  }, [isElectron, setCurrentDirectory]);

  // Ensure Electron secure bridge has access to the active directory for direct photo reads
  useEffect(() => {
    if (!isElectron) return;
    const next = currentDirectory?.trim();
    if (!next) return;

    const secure = window.secureElectronAPI;
    const legacy = window.electronAPI;

    const securePromise = secure?.setAllowedRoot?.(next);
    securePromise?.catch((error) => {
      console.warn("Failed to set secure allowed root:", error);
    });

    const legacyPromise = legacy?.setAllowedRoot?.(next);
    legacyPromise?.catch((error: unknown) => {
      console.warn("Failed to set legacy allowed root:", error);
    });
  }, [currentDirectory, isElectron]);

  // Handle Electron menu IPC events for import/export
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const handleMenuExportLibrary = async () => {
      if (!currentDirectory) return;
      try {
        const result = await apiClient.exportLibrary(currentDirectory, "json", {
          include_metadata: true,
        });
        // Trigger download of the exported data
        const blob = new Blob(
          [
            typeof result.data === "string"
              ? result.data
              : JSON.stringify(result.data, null, 2),
          ],
          {
            type: result.format === "csv" ? "text/csv" : "application/json",
          }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `library_export.${result.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Exported ${result.count} photos from library`);
      } catch (error) {
        console.error("Export library failed:", error);
        alert("Failed to export library");
      }
    };

    const handleMenuExportSearch = async () => {
      if (!currentDirectory || !searchQuery.trim()) return;
      try {
        const result = await apiClient.exportSearch(
          currentDirectory,
          searchQuery,
          "json",
          { include_metadata: true }
        );
        // Trigger download of the exported data
        const blob = new Blob(
          [
            typeof result.data === "string"
              ? result.data
              : JSON.stringify(result.data, null, 2),
          ],
          {
            type: result.format === "csv" ? "text/csv" : "application/json",
          }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `search_${searchQuery.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}_export.${result.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Exported ${result.count} search results for "${searchQuery}"`);
      } catch (error) {
        console.error("Export search failed:", error);
        alert("Failed to export search results");
      }
    };

    const handleMenuExportFavorites = async () => {
      if (!currentDirectory) return;
      try {
        const result = await apiClient.exportFavorites(
          currentDirectory,
          "json"
        );
        // Trigger download of the exported data
        const blob = new Blob(
          [
            typeof result.data === "string"
              ? result.data
              : JSON.stringify(result.data, null, 2),
          ],
          {
            type: result.format === "csv" ? "text/csv" : "application/json",
          }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `favorites_export.${result.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Exported ${result.count} favorite photos`);
      } catch (error) {
        console.error("Export favorites failed:", error);
        alert("Failed to export favorites");
      }
    };

    const handleMenuImport = async () => {
      if (!currentDirectory) return;
      try {
        const sourceDir = await selectImportFolder();
        if (!sourceDir) return; // User cancelled

        const result = await apiClient.importPhotos(
          sourceDir,
          currentDirectory,
          { recursive: true, copy: true }
        );
        alert(
          `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors`
        );

        // Refresh the photo library after import
        const [favoritesResult, response] = await Promise.all([
          apiClient
            .getFavorites(currentDirectory)
            .catch(() => ({ favorites: [] })),
          apiClient.getLibrary(currentDirectory, "local", 100, 0),
        ]);
        setFavoriteEntries(favoritesResult.favorites);
        setPhotos(
          response.paths.map((path: string, index: number) => ({
            id: index + 1,
            path,
            src: apiClient.getPhotoUrl(path),
            title: path.split("/").pop() || `Photo ${index + 1}`,
          }))
        );
      } catch (error) {
        console.error("Import failed:", error);
        alert("Failed to import photos");
      }
    };

    const handleOpenPreferences = () => setShowPreferences(true);

    // Set up IPC listeners
    window.electronAPI.on?.("menu:export-library", handleMenuExportLibrary);
    window.electronAPI.on?.("menu:export-search", handleMenuExportSearch);
    window.electronAPI.on?.("menu:export-favorites", handleMenuExportFavorites);
    window.electronAPI.on?.("menu:import", handleMenuImport);
    window.electronAPI.on?.("open-preferences", handleOpenPreferences);

    return () => {
      // Cleanup listeners
      if (window.electronAPI?.off) {
        window.electronAPI.off("menu:export-library", handleMenuExportLibrary);
        window.electronAPI.off("menu:export-search", handleMenuExportSearch);
        window.electronAPI.off(
          "menu:export-favorites",
          handleMenuExportFavorites
        );
        window.electronAPI.off("menu:import", handleMenuImport);
        window.electronAPI.off("open-preferences", handleOpenPreferences);
      }
    };
  }, [
    isElectron,
    currentDirectory,
    searchQuery,
    setFavoriteEntries,
    setPhotos,
    selectImportFolder,
  ]);

  // Persist current directory to Electron store
  useEffect(() => {
    if (!isElectron || !currentDirectory) return;
    setStoreSetting("currentDirectory", currentDirectory).catch((error) => {
      console.warn("Failed to persist current directory:", error);
    });
  }, [currentDirectory, isElectron, setStoreSetting]);

  // Reset indexing when switching directories
  useEffect(() => {
    if (!currentDirectory) return;
    setIndexBootstrapped(false);
  }, [currentDirectory]);

  useEffect(() => {
    if (!currentDirectory) return;
    if (typeof window === "undefined") return;
    try {
      const storage = window.localStorage;
      if (!storage) return;
      storage.setItem("ps:lastDirectory", currentDirectory);

      const raw = storage.getItem("ps:recentDirectories");
      let recent: string[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            recent = parsed.filter((item) => typeof item === "string");
          }
        } catch {
          recent = [];
        }
      }

      const next = [
        currentDirectory,
        ...recent.filter((item) => item !== currentDirectory),
      ].slice(0, 8);
      storage.setItem("ps:recentDirectories", JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent("ps:recentDirectories", { detail: next })
      );
    } catch (error) {
      console.warn("Failed to persist recent directories:", error);
    }
  }, [currentDirectory]);

  // Load photos when directory changes
  useEffect(() => {
    const loadPhotosAsync = async () => {
      if (!currentDirectory) return;

      try {
        setLoading(true);
        // Kick off automatic indexing exactly once per dir selection
        if (!indexBootstrapped) {
          try {
            await apiClient.startIndex(currentDirectory, "local");
            setIndexBootstrapped(true);
          } catch {
            // Index might already exist; proceed silently
          }
        }

        const favoritesPromise = apiClient
          .getFavorites(currentDirectory)
          .catch((favoritesError) => {
            console.warn("Failed to load favorites:", favoritesError);
            return { favorites: [] };
          });

        const libraryPromise = apiClient.getLibrary(
          currentDirectory,
          "local",
          100,
          0
        );

        const [favoritesResult, response] = await Promise.all([
          favoritesPromise,
          libraryPromise,
        ]);

        setFavoriteEntries(favoritesResult.favorites);
        setPhotos(
          response.paths.map((path: string, index: number) => ({
            id: index + 1,
            path,
            src: apiClient.getPhotoUrl(path),
            title: path.split("/").pop() || `Photo ${index + 1}`,
          }))
        );
      } catch (error) {
        console.error("Failed to load photos:", error);
        // Use e2e_data as demo directory if available
        try {
          const [demoFavorites, demoResponse] = await Promise.all([
            apiClient
              .getFavorites(DEMO_LIBRARY_DIR)
              .catch(() => ({ favorites: [] })),
            apiClient.getLibrary(DEMO_LIBRARY_DIR),
          ]);

          setFavoriteEntries(demoFavorites.favorites);
          setPhotos(
            demoResponse.paths.map((path: string, index: number) => ({
              id: index + 1,
              path,
              src: apiClient.getPhotoUrl(path),
              title: path.split("/").pop() || `Photo ${index + 1}`,
            }))
          );
        } catch (demoError) {
          console.warn("Demo photos not available:", demoError);
          setFavoriteEntries([]);
          setPhotos([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPhotosAsync();
  }, [
    currentDirectory,
    indexBootstrapped,
    setFavoriteEntries,
    setLoading,
    setPhotos,
  ]);

  // Poll index status briefly after bootstrapping to refresh counts/photos
  useEffect(() => {
    if (!currentDirectory || !indexBootstrapped) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const s = await apiClient.getIndexStatus(currentDirectory);
        // When indexing completes or has coverage, refresh photos/analytics
        if (
          (s.state && s.state !== "running") ||
          (typeof s.coverage === "number" && s.coverage >= 1)
        ) {
          if (!cancelled) {
            // refresh photos and analytics
            const [favoritesResult, lib] = await Promise.all([
              apiClient
                .getFavorites(currentDirectory)
                .catch(() => ({ favorites: [] })),
              apiClient.getLibrary(currentDirectory, "local", 100, 0),
            ]);

            setFavoriteEntries(favoritesResult.favorites);
            setPhotos(
              lib.paths.map((path: string, index: number) => ({
                id: index + 1,
                path,
                src: apiClient.getPhotoUrl(path),
                title: path.split("/").pop() || `Photo ${index + 1}`,
              }))
            );
            const ana = await apiClient.getAnalytics(currentDirectory);
            setAnalyticsCounts((prev) => ({
              ...prev,
              people: Array.isArray(ana.people_clusters)
                ? ana.people_clusters.length
                : 0,
              places: Array.isArray(ana.places) ? ana.places.length : 0,
              tags: Array.isArray(ana.tags) ? ana.tags.length : 0,
              favorites:
                typeof ana.favorites_total === "number"
                  ? ana.favorites_total
                  : prev.favorites,
            }));
            const trips = await apiClient.getTrips(currentDirectory);
            setTripsCount(Array.isArray(trips.trips) ? trips.trips.length : 0);
            return; // stop polling
          }
        }
      } catch (error) {
        console.warn("Failed to poll for index bootstrap:", error);
      }
      if (!cancelled) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [currentDirectory, indexBootstrapped, setFavoriteEntries, setPhotos]);

  // Load analytics and trips counts for sidebar badges
  useEffect(() => {
    const fetchCounts = async () => {
      if (!currentDirectory) return;
      try {
        const ana = await apiClient.getAnalytics(currentDirectory);
        setAnalyticsCounts((prev) => ({
          ...prev,
          people: Array.isArray(ana.people_clusters)
            ? ana.people_clusters.length
            : 0,
          places: Array.isArray(ana.places) ? ana.places.length : 0,
          tags: Array.isArray(ana.tags) ? ana.tags.length : 0,
          favorites:
            typeof ana.favorites_total === "number"
              ? ana.favorites_total
              : prev.favorites,
        }));
      } catch {
        setAnalyticsCounts((prev) => ({
          ...prev,
          people: 0,
          places: 0,
          tags: 0,
        }));
      }
      try {
        const trips = await apiClient.getTrips(currentDirectory);
        setTripsCount(Array.isArray(trips.trips) ? trips.trips.length : 0);
      } catch {
        setTripsCount(0);
      }
    };
    fetchCounts();
  }, [currentDirectory]);

  useEffect(() => {
    setAnalyticsCounts((prev) => ({
      ...prev,
      favorites: favoriteEntries.length,
    }));
  }, [favoriteEntries]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      const isTypingElement = Boolean(
        activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.getAttribute("role") === "textbox")
      );
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      if (isTypingElement) {
        return;
      }

      if (event.shiftKey && event.key === "?") {
        event.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (event.shiftKey && key === "p") {
        event.preventDefault();
        setCurrentView("places");
        navigate("/places");
        return;
      }

      if (event.shiftKey && key === "t") {
        event.preventDefault();
        setCurrentView("tags");
        navigate("/tags");
        return;
      }

      if (event.shiftKey && key === "l") {
        event.preventDefault();
        setCurrentView("library");
        navigate("/library");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentDirectory) return;

    try {
      setLoading(true);
      const response = await apiClient.search(currentDirectory, query, {
        provider: "local",
        topK: 50,
      });
      setPhotos(
        response.results.map((result: SearchResult, index: number) => ({
          id: index + 1,
          path: result.path,
          src: apiClient.getPhotoUrl(result.path),
          title: result.path.split("/").pop() || `Photo ${index + 1}`,
          score: result.score,
        }))
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = useCallback(
    async (path: string, nextFavorite: boolean) => {
      if (!currentDirectory) return;

      updateFavoriteForPath(path, nextFavorite);

      try {
        await apiClient.setFavorite(currentDirectory, path, nextFavorite);
        try {
          const refreshed = await apiClient.getFavorites(currentDirectory);
          setFavoriteEntries(refreshed.favorites);
        } catch (refreshError) {
          console.warn("Failed to refresh favorites:", refreshError);
        }
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        updateFavoriteForPath(path, !nextFavorite);
      }
    },
    [currentDirectory, setFavoriteEntries, updateFavoriteForPath]
  );

  return (
    <>
      {/* Day 1: Global loading overlay */}
      {globalLoading && (
        <LoadingOverlay message={loadingMessage || undefined} />
      )}

      {/* Day 1: Toast notifications */}
      <ToastContainer />

      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
        {/* Background patterns for main canvas */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-br from-green-200 to-blue-200 dark:from-green-800 dark:to-blue-800 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-orange-200 to-pink-200 dark:from-orange-800 dark:to-pink-800 rounded-full blur-3xl"></div>
        </div>

        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>

        <Sidebar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            if (view === "collections") {
              navigate("/collections");
            } else if (view === "library") {
              navigate("/library");
            } else if (view === "search") {
              navigate("/search");
            } else if (view === "people") {
              navigate("/people");
            } else if (view === "places") {
              navigate("/places");
            } else if (view === "tags") {
              navigate("/tags");
            } else if (view === "trips") {
              navigate("/trips");
            } else if (view === "favorites") {
              navigate("/favorites");
            } else if (view === "analytics") {
              navigate("/analytics");
            }
          }}
          currentDirectory={currentDirectory}
          onDirectoryChange={setCurrentDirectory}
          photoCount={photos.length}
          peopleCount={analyticsCounts.people}
          placesCount={analyticsCounts.places}
          favoritesCount={analyticsCounts.favorites}
          tagsCount={analyticsCounts.tags}
          tripsCount={tripsCount}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            currentView={currentView}
            currentDirectory={currentDirectory}
            onDirectoryChange={setCurrentDirectory}
            onSearchInputRef={(node) => {
              searchInputRef.current = node;
            }}
            isLoading={isLoading}
          />

          <main className="flex-1 overflow-auto relative">
            {/* Subtle background pattern for empty states */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none bg-[radial-gradient(circle_at_2px_2px,rgba(59,130,246,0.3)_1px,transparent_0)] bg-[length:40px_40px]"></div>
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none bg-[conic-gradient(from_0deg_at_50%_50%,rgba(147,51,234,0.1),rgba(59,130,246,0.1),rgba(16,185,129,0.1),rgba(147,51,234,0.1))]"></div>
            {/* Generated canvas background (asset_47.png) as ultra-subtle overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06] bg-no-repeat bg-center bg-cover"
              data-bg="generated-asset"
            ></div>

            <Routes>
              <Route
                path="/library"
                element={
                  <PhotoLibrary
                    photos={photos}
                    isLoading={isLoading}
                    currentDirectory={currentDirectory}
                    onDirectorySelect={setCurrentDirectory}
                    onToggleFavorite={handleToggleFavorite}
                  />
                }
              />
              <Route
                path="/search"
                element={
                  <PhotoLibrary
                    photos={photos}
                    isLoading={isLoading}
                    currentDirectory={currentDirectory}
                    onDirectorySelect={setCurrentDirectory}
                    onToggleFavorite={handleToggleFavorite}
                  />
                }
              />
              <Route path="/collections" element={<Collections />} />
              <Route path="/people" element={<People />} />
              <Route
                path="/places"
                element={<PlacesView currentDirectory={currentDirectory} />}
              />
              <Route
                path="/tags"
                element={<TagsView currentDirectory={currentDirectory} />}
              />
              <Route path="/trips" element={<Trips />} />
              <Route
                path="/favorites"
                element={<Favorites onToggleFavorite={handleToggleFavorite} />}
              />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/day1-demo" element={<Day1Demo />} />
              <Route path="/grid-demo" element={<GridDemo />} />
              <Route path="/" element={<Navigate to="/library" replace />} />
            </Routes>
          </main>

          <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Keyboard shortcuts</DialogTitle>
                <DialogDescription>
                  Quickly navigate and perform common actions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <ShortcutRow
                  action="Focus search"
                  keys={[modifierKeyLabel, "K"]}
                />
                <ShortcutRow action="Open shortcuts" keys={["Shift", "?"]} />
                <ShortcutRow action="Go to library" keys={["Shift", "L"]} />
                <ShortcutRow action="Go to places" keys={["Shift", "P"]} />
                <ShortcutRow action="Go to tags" keys={["Shift", "T"]} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Preferences Dialog */}
          <Preferences
            open={showPreferences}
            onOpenChange={setShowPreferences}
          />
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
