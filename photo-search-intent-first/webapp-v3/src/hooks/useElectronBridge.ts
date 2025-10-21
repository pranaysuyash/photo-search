import { useState, useEffect, useCallback } from "react";

interface ModelStatus {
  ensured: boolean;
  copied: boolean;
  errors: string[];
  source: string | null;
  destination: string | null;
  lastChecked: string;
}

interface ElectronBridgeState {
  isElectron: boolean;
  apiToken: string;
  apiConfig: { base: string; token: string } | null;
  modelStatus: ModelStatus | null;
  isBackendReady: boolean;
  backendError: string | null;
}

interface ElectronBridgeActions {
  selectFolder: () => Promise<string | null>;
  selectImportFolder: () => Promise<string | null>;
  selectPhotoDirectories: () => Promise<string[] | null>;
  scanDirectory: (path: string) => Promise<any>;
  generateThumbnail: (filePath: string, size?: number) => Promise<string>;
  getSecureFileUrl: (filePath: string) => Promise<string>;
  restartBackend: () => Promise<boolean>;
  refreshModels: () => Promise<boolean>;
  setStoreSetting: (key: string, value: string) => Promise<boolean>;
  getStoreSetting: (key: string) => Promise<string>;
}

export function useElectronBridge(): ElectronBridgeState &
  ElectronBridgeActions {
  const [state, setState] = useState<ElectronBridgeState>({
    isElectron: false,
    apiToken: "",
    apiConfig: null,
    modelStatus: null,
    isBackendReady: false,
    backendError: null,
  });

  const initializeElectronState = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    // For local-first mode, we don't need API config or backend
    // Just set up basic Electron state
    setState((prev) => ({
      ...prev,
      apiToken: '',
      apiConfig: null,
      modelStatus: null,
      isBackendReady: false, // Backend is optional for local-first
      backendError: null,
    }));

    console.log("✅ Electron bridge initialized for local-first mode");
  }, []);

  // Check if running in Electron
  useEffect(() => {
    const isElectron =
      typeof window !== "undefined" && window.electronAPI !== undefined;
    setState((prev) => ({ ...prev, isElectron }));

    if (isElectron) {
      initializeElectronState();
    }
  }, [initializeElectronState]);

  const selectFolder = useCallback(async (): Promise<string | null> => {
    if (!state.isElectron || !window.electronAPI) return null;

    const api = window.electronAPI;
    try {
      // Use enhanced photo directory selection if available
      if (api.selectPhotoDirectories) {
        const directories = await api.selectPhotoDirectories();
        return directories && directories.length > 0 ? directories[0] : null;
      }
      // Fallback to legacy method
      if (api.selectFolder) {
        return await api.selectFolder();
      }
      return null;
    } catch (error) {
      console.error("Failed to select folder:", error);
      return null;
    }
  }, [state.isElectron]);

  const selectImportFolder = useCallback(async (): Promise<string | null> => {
    if (!state.isElectron || !window.electronAPI?.selectImportFolder)
      return null;

    const api = window.electronAPI;
    try {
      return await api.selectImportFolder();
    } catch (error) {
      console.error("Failed to select import folder:", error);
      return null;
    }
  }, [state.isElectron]);

  const restartBackend = useCallback(async (): Promise<boolean> => {
    if (!state.isElectron || !window.electronAPI?.restartBackend) return false;

    const api = window.electronAPI;
    try {
      const result = await api.restartBackend();
      if (result.success) {
        // Refresh API config after restart
        const apiConfig = await api.getApiConfig();
        const apiToken = await api.getApiToken();
        setState((prev) => ({
          ...prev,
          apiConfig,
          apiToken,
          isBackendReady: true,
          backendError: null,
        }));
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          backendError: result.message,
          isBackendReady: false,
        }));
        return false;
      }
    } catch (error) {
      console.error("Failed to restart backend:", error);
      setState((prev) => ({
        ...prev,
        backendError: error instanceof Error ? error.message : "Unknown error",
        isBackendReady: false,
      }));
      return false;
    }
  }, [state.isElectron]);

  const refreshModels = useCallback(async (): Promise<boolean> => {
    if (!state.isElectron || !window.electronAPI?.models?.refresh) {
      console.warn("Models API not available");
      return false;
    }

    const api = window.electronAPI;
    try {
      const result = await api.models.refresh();
      setState((prev) => ({
        ...prev,
        modelStatus: result.status,
      }));
      return result.ok;
    } catch (error) {
      console.error("Failed to refresh models:", error);
      return false;
    }
  }, [state.isElectron]);

  const setStoreSetting = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      if (!state.isElectron || !window.electronAPI?.setStoreSetting)
        return false;

      try {
        return await window.electronAPI.setStoreSetting(key, value);
      } catch (error) {
        console.error("Failed to set store setting:", error);
        return false;
      }
    },
    [state.isElectron]
  );

  const getStoreSetting = useCallback(
    async (key: string): Promise<string> => {
      if (!state.isElectron || !window.electronAPI?.getStoreSetting) return "";

      try {
        return await window.electronAPI.getStoreSetting(key);
      } catch (error) {
        console.error("Failed to get store setting:", error);
        return "";
      }
    },
    [state.isElectron]
  );

  const selectPhotoDirectories = useCallback(async (): Promise<string[] | null> => {
    if (!state.isElectron || !window.electronAPI?.selectPhotoDirectories) return null;

    try {
      return await window.electronAPI.selectPhotoDirectories();
    } catch (error) {
      console.error("Failed to select photo directories:", error);
      return null;
    }
  }, [state.isElectron]);

  const scanDirectory = useCallback(async (path: string): Promise<any> => {
    if (!state.isElectron || !window.electronAPI?.scanDirectory) return null;

    try {
      return await window.electronAPI.scanDirectory(path);
    } catch (error) {
      console.error("Failed to scan directory:", error);
      return null;
    }
  }, [state.isElectron]);

  const generateThumbnail = useCallback(async (filePath: string, size: number = 300): Promise<string> => {
    if (!state.isElectron || !window.electronAPI?.generateThumbnail) return "";

    try {
      return await window.electronAPI.generateThumbnail(filePath, size);
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      return "";
    }
  }, [state.isElectron]);

  const getSecureFileUrl = useCallback(async (filePath: string): Promise<string> => {
    if (!state.isElectron || !window.electronAPI?.getSecureFileUrl) return "";

    try {
      return await window.electronAPI.getSecureFileUrl(filePath);
    } catch (error) {
      console.error("Failed to get secure file URL:", error);
      return "";
    }
  }, [state.isElectron]);

  return {
    ...state,
    selectFolder,
    selectImportFolder,
    selectPhotoDirectories,
    scanDirectory,
    generateThumbnail,
    getSecureFileUrl,
    restartBackend,
    refreshModels,
    setStoreSetting,
    getStoreSetting,
  };
}
