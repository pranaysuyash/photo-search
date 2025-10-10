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

    try {
      // Get initial API config
      const apiConfig = await api.getApiConfig();
      const apiToken = await api.getApiToken();

      // Get model status
      const modelStatus = await api.models.getStatus();

      setState((prev) => ({
        ...prev,
        apiToken,
        apiConfig,
        modelStatus,
        isBackendReady: true,
      }));
    } catch (error) {
      console.warn("Failed to initialize Electron state:", error);
      setState((prev) => ({
        ...prev,
        backendError: error instanceof Error ? error.message : "Unknown error",
      }));
    }
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
    if (!state.isElectron || !window.electronAPI?.selectFolder) return null;

    const api = window.electronAPI;
    try {
      return await api.selectFolder();
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
    if (!state.isElectron || !window.electronAPI?.models?.refresh) return false;

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

  return {
    ...state,
    selectFolder,
    selectImportFolder,
    restartBackend,
    refreshModels,
    setStoreSetting,
    getStoreSetting,
  };
}
