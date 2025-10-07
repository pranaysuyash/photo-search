import { useState, useEffect, useCallback } from "react";
import "./styles/generated-bg.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
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
import { usePhotoStore } from "./store/photoStore";
import { apiClient, type SearchResult } from "./services/api";
import { DEMO_LIBRARY_DIR } from "./constants/directories";

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

  // Ensure a directory is selected (prefer persisted workspace when running in Electron)
  useEffect(() => {
    if (currentDirectory) return;
    let cancelled = false;

    const bootstrapDirectory = async () => {
      const api = typeof window !== "undefined" ? window.electronAPI : undefined;

      if (api?.getStoreSetting) {
        try {
          const stored = await api.getStoreSetting(
            "lastSelectedDirectory"
          );
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
            const storedLocal = window.localStorage.getItem(
              "ps:lastDirectory"
            );
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

      if (!cancelled && !api) {
        setCurrentDirectory(DEMO_LIBRARY_DIR);
      }
    };

    bootstrapDirectory();

    return () => {
      cancelled = true;
    };
  }, [currentDirectory, setCurrentDirectory]);

  // React to Electron menu-driven directory selection
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.electronAPI : undefined;
    if (!api?.onDirectorySelected) return;

    const handler = (_event: unknown, directory: string) => {
      if (typeof directory !== "string" || directory.trim().length === 0) {
        return;
      }
      if (directory === currentDirectory) {
        return;
      }
      setIndexBootstrapped(false);
      setCurrentDirectory(directory);
    };

    api.onDirectorySelected(handler);

    return () => {
      if (api.removeListener) {
        api.removeListener("directory-selected", handler);
      } else if (api.removeAllListeners) {
        api.removeAllListeners("directory-selected");
      }
    };
  }, [currentDirectory, setCurrentDirectory]);

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
      window.dispatchEvent(new CustomEvent("ps:recentDirectories", { detail: next }));
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
      } catch {}
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

  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentDirectory) return;

    try {
      setLoading(true);
      const response = await apiClient.search(
        currentDirectory,
        query,
        "local",
        50,
        0
      );
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
            <Route path="/" element={<Navigate to="/library" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

export default App;
