import { useCallback } from "react";
import { API_BASE, apiDemoDir, apiIndex, apiWorkspaceAdd } from "../api";
import { useLibraryContext } from "../contexts/LibraryContext";
import { useSettingsActions, useUIActions } from "../stores/useStores";
import { handleError } from "../utils/errors";

interface UseDemoLibraryHandlersOptions {
  enableDemoLibrary: boolean;
  modalControls: { openFolder: () => void };
  engine?: string;
  needsHf: boolean;
  hfToken?: string;
  needsOAI: boolean;
  openaiKey?: string;
  setShowOnboarding: (show: boolean) => void;
}

interface DemoLibraryHandlers {
  handleWelcomeStartDemo: () => Promise<void>;
  handleFirstRunQuickStart: (paths: string[]) => Promise<void>;
  handleFirstRunCustom: () => void;
  handleFirstRunDemo: () => Promise<void>;
}

/**
 * Centralizes the callback logic for onboarding/demo flows so App.tsx can
 * focus on orchestration instead of inline async handlers.
 */
export function useDemoLibraryHandlers({
  enableDemoLibrary,
  modalControls,
  engine,
  needsHf,
  hfToken,
  needsOAI,
  openaiKey,
  setShowOnboarding,
}: UseDemoLibraryHandlersOptions): DemoLibraryHandlers {
  const uiActions = useUIActions();
  const settingsActions = useSettingsActions();
  const { actions: lib } = useLibraryContext();

  const handleWelcomeStartDemo = useCallback(async () => {
    if (!enableDemoLibrary) {
      uiActions.setNote("Demo library is disabled in settings.");
      return;
    }

    try {
      const demoResponse = await apiDemoDir();
      if (!demoResponse || !demoResponse.path) {
        uiActions.setNote("Demo data is not available on this system.");
        return;
      }

      settingsActions.setDir(demoResponse.path);
      uiActions.setShowWelcome(false);

      try {
        await apiWorkspaceAdd(demoResponse.path);
        await lib.index({
          dir: demoResponse.path,
          provider: engine || "local",
        });
      } catch (error) {
        console.error("Failed to add demo path or index:", error);
        handleError(error, {
          logToServer: true,
          context: {
            action: "demo_setup",
            component: "useDemoLibraryHandlers.handleWelcomeStartDemo",
            dir: demoResponse.path,
          },
        });
        uiActions.setNote(
          error instanceof Error ? error.message : "Failed to setup demo"
        );
      }
    } catch (error) {
      handleError(error, {
        logToServer: true,
        context: {
          action: "demo_setup",
          component: "useDemoLibraryHandlers.handleWelcomeStartDemo",
        },
      });
      uiActions.setNote(
        error instanceof Error ? error.message : "Demo data is not available"
      );
    }
  }, [enableDemoLibrary, engine, lib, settingsActions, uiActions]);

  const handleFirstRunQuickStart = useCallback(
    async (paths: string[]) => {
      try {
        const existing: string[] = [];
        for (const path of paths) {
          try {
            const response = await fetch(`${API_BASE}/scan_count`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify([path]),
            });
            if (response.ok) {
              const payload = (await response.json()) as {
                items?: Array<{ exists?: boolean }>;
              };
              if (payload.items?.[0]?.exists) existing.push(path);
            }
          } catch {
            // Ignore scan failures so remaining paths can still succeed.
          }
        }

        if (existing.length === 0) {
          setShowOnboarding(false);
          try {
            localStorage.setItem("hasSeenOnboarding", "true");
          } catch (error) {
            console.warn("Failed to set onboarding flag:", error);
          }
          return;
        }

        settingsActions.setDir(existing[0]);
        for (const path of existing) {
          try {
            await apiWorkspaceAdd(path);
          } catch (error) {
            console.warn(`Failed to add workspace path ${path}:`, error);
          }
          try {
            await apiIndex(
              path,
              engine || "local",
              24,
              needsHf ? hfToken : undefined,
              needsOAI ? openaiKey : undefined
            );
          } catch (error) {
            console.warn(`Failed to index path ${path}:`, error);
          }
        }

        setShowOnboarding(false);
        try {
          localStorage.setItem("hasSeenOnboarding", "true");
        } catch (error) {
          console.warn("Failed to set onboarding flag:", error);
        }
      } catch (error) {
        uiActions.setNote(
          error instanceof Error ? error.message : "Quick start failed"
        );
      }
    },
    [
      engine,
      hfToken,
      needsHf,
      needsOAI,
      openaiKey,
      setShowOnboarding,
      settingsActions,
      uiActions,
    ]
  );

  const handleFirstRunCustom = useCallback(() => {
    modalControls.openFolder();
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
    } catch (error) {
      console.warn("Failed to set onboarding flag:", error);
    }
  }, [modalControls, setShowOnboarding]);

  const handleFirstRunDemo = useCallback(async () => {
    await handleWelcomeStartDemo();
    setShowOnboarding(false);
    try {
      localStorage.setItem("hasSeenOnboarding", "true");
    } catch (error) {
      console.warn("Failed to set onboarding flag:", error);
    }
  }, [handleWelcomeStartDemo, setShowOnboarding]);

  return {
    handleWelcomeStartDemo,
    handleFirstRunQuickStart,
    handleFirstRunCustom,
    handleFirstRunDemo,
  };
}
