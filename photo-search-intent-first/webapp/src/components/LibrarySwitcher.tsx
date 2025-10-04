import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { apiDemoDir, apiWorkspaceList } from "../api";
import { useWorkspace } from "../stores/workspaceStore";
import { isElectron } from "../api";
import { useDemoLibraryHandlers } from "../hooks/useDemoLibraryHandlers";

interface LibrarySwitcherProps {
  currentDir: string | null;
  onLibraryChange: (dir: string | null) => void;
  enableDemoLibrary: boolean;
}

interface Library {
  id: string;
  name: string;
  path: string | null; // null for demo library
  isDemo: boolean;
}

export const LibrarySwitcher: React.FC<LibrarySwitcherProps> = ({
  currentDir,
  onLibraryChange,
  enableDemoLibrary,
}) => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cachedWorkspace = useWorkspace();
  const { handleWelcomeStartDemo } = useDemoLibraryHandlers({
    enableDemoLibrary,
    modalControls: { openFolder: () => {} },
    engine: "local",
    needsHf: false,
    needsOAI: false,
    setShowOnboarding: () => {},
  });

  const loadLibraries = useCallback(async () => {
    setIsLoading(true);
    try {
      const allLibs: Library[] = [];

      const browserDemoLibrary: Library = {
        id: "demo-browser",
        name: "Demo Library (Web)",
        path: "__browser_demo__",
        isDemo: true,
      };

      if (!isElectron()) {
        allLibs.push(browserDemoLibrary);
      }

      // Try to get workspace libraries from API first
      try {
        const [workspaceResult, demoDir] = await Promise.all([
          apiWorkspaceList(),
          enableDemoLibrary ? apiDemoDir() : Promise.resolve(null),
        ]);

        const workspaceLibs: Library[] = (workspaceResult.folders || []).map(
          (folder: string) => ({
            id: `workspace-${folder}`,
            name: folder.split("/").pop() || folder, // Use folder name
            path: folder,
            isDemo: false,
          })
        );

        allLibs.push(...workspaceLibs);

        // Add demo library if available and enabled
        if (demoDir && enableDemoLibrary) {
          allLibs.unshift({
            id: "demo",
            name: "Demo Library",
            path: demoDir,
            isDemo: true,
          });
        }
      } catch (error) {
        console.warn("Backend not available, using offline mode:", error);

        // Offline fallback: use cached workspace data
        const cachedLibs: Library[] = cachedWorkspace.map((folder: string) => ({
          id: `cached-${folder}`,
          name: folder.split("/").pop() || folder,
          path: folder,
          isDemo: false,
        }));
        allLibs.push(...cachedLibs);

        // Add demo library if enabled (using local demo data)
        if (enableDemoLibrary) {
          allLibs.unshift({
            id: "demo-offline",
            name: "Demo Library (Offline)",
            path: "/demo", // Placeholder path for offline demo
            isDemo: true,
          });
        }

        // If running in Electron, add option to select directory
        if (isElectron()) {
          allLibs.push({
            id: "select-directory",
            name: "Select Directory...",
            path: null,
            isDemo: false,
          });
        }
      }

      setLibraries(allLibs);
    } catch (error) {
      console.error("Failed to load libraries:", error);
      // Even on error, provide basic options
      const fallbackLibs: Library[] = [];

      if (enableDemoLibrary && !isElectron()) {
        fallbackLibs.push(browserDemoLibrary);
      }

      if (isElectron()) {
        fallbackLibs.push({
          id: "select-directory-fallback",
          name: "Select Directory...",
          path: null,
          isDemo: false,
        });
      }

      setLibraries(fallbackLibs);
    } finally {
      setIsLoading(false);
    }
  }, [enableDemoLibrary, cachedWorkspace]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const handleLibrarySelect = async (library: Library) => {
    if (library.isDemo) {
      if (library.path === "__browser_demo__") {
        onLibraryChange(library.path);
        return;
      }
      // Handle demo library selection
      try {
        await handleWelcomeStartDemo();
        onLibraryChange(library.path);
      } catch (error) {
        console.error("Failed to load demo library:", error);
      }
    } else if (
      library.id === "select-directory" ||
      library.id === "select-directory-fallback"
    ) {
      // Handle directory selection
      try {
        if (isElectron() && window.electronAPI?.selectFolder) {
          const selectedDir = await window.electronAPI.selectFolder();
          if (selectedDir) {
            onLibraryChange(selectedDir);
          }
        } else {
          // In web browser, show message that directory selection is not available
          alert(
            "Directory selection is only available in the desktop app. Please enter a directory path manually or use the demo library."
          );
        }
      } catch (error) {
        console.error("Failed to select directory:", error);
      }
    } else {
      // Handle regular library selection
      onLibraryChange(library.path);
    }
  };

  const currentLibrary = libraries.find((lib) => lib.path === currentDir);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <label
          htmlFor="library-select"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Library:
        </label>
        <select
          id="library-select"
          value={currentLibrary?.id || ""}
          onChange={(e) => {
            const selectedLib = libraries.find(
              (lib) => lib.id === e.target.value
            );
            if (selectedLib) {
              handleLibrarySelect(selectedLib);
            }
          }}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading}
          title="Select photo library"
        >
          {isLoading ? (
            <option>Loading...</option>
          ) : (
            <>
              {libraries.length === 0 && (
                <option value="">No libraries available</option>
              )}
              {libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.isDemo ? "🎯 " : "📁 "}
                  {library.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {currentLibrary?.isDemo && (
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          Demo library with sample photos
        </div>
      )}
    </div>
  );
};

export default LibrarySwitcher;
