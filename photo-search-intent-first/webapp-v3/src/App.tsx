import { useState, useEffect } from "react";
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
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { usePhotoStore } from "./store/photoStore";
import { apiClient, type SearchResult } from "./services/api";

function App() {
  const {
    currentDirectory,
    setCurrentDirectory,
    photos,
    setPhotos,
    isLoading,
    setLoading,
  } = usePhotoStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState("library");

  // Load photos when directory changes
  useEffect(() => {
    const loadPhotosAsync = async () => {
      if (currentDirectory) {
        try {
          setLoading(true);
          const response = await apiClient.getLibrary(
            currentDirectory,
            "local",
            100,
            0
          );
          setPhotos(
            response.paths.map((path: string, index: number) => ({
              id: index + 1,
              path,
              src: `/api/photo?path=${encodeURIComponent(path)}`,
              title: path.split("/").pop() || `Photo ${index + 1}`,
            }))
          );
        } catch (error) {
          console.error("Failed to load photos:", error);
          // Use e2e_data as demo directory if available
          const demoDir =
            "/Users/pranay/Projects/adhoc_projects/photo-search/e2e_data";
          try {
            const demoResponse = await apiClient.getLibrary(demoDir);
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
            setPhotos([]);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    loadPhotosAsync();
  }, [currentDirectory, setPhotos, setLoading]);

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
          src: `/api/photo?path=${encodeURIComponent(result.path)}`,
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

  return (
    <Router>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
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
            }
          }}
          currentDirectory={currentDirectory}
          onDirectoryChange={setCurrentDirectory}
          photoCount={photos.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={handleSearch}
            currentView={currentView}
          />

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route
                path="/library"
                element={
                  <PhotoLibrary
                    photos={photos}
                    isLoading={isLoading}
                    currentDirectory={currentDirectory}
                    onDirectorySelect={setCurrentDirectory}
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
                  />
                }
              />
              <Route path="/collections" element={<Collections />} />
              <Route path="/people" element={<People />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/" element={<Navigate to="/library" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
