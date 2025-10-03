/**
 * Handles demo library bootstrap and first-run enablement
 */
import { useEffect } from "react";
import { apiDemoDir } from "../../api/demo";
import { safeLocalStorage } from "../utils/safeStorage";

export type UseDemoBootstrapReturn = Record<string, never>;

export interface UseDemoBootstrapProps {
  dir: string | null;
  libraryLength: number;
  demoHandlers: {
    handleFirstRunDemo: () => void;
  };
  showToast: (message: string, variant?: "default" | "destructive") => void;
}

export function useDemoBootstrap({
  dir,
  libraryLength,
  demoHandlers,
  showToast,
}: UseDemoBootstrapProps): UseDemoBootstrapReturn {
  useEffect(() => {
    // Check if first run is already done
    const firstRunDone = safeLocalStorage.getItemJSON(
      "ps_first_run_done",
      false
    );

    if (!firstRunDone && !dir && !libraryLength) {
      // Check if demo directory exists and auto-load it
      const checkAndLoadDemo = async () => {
        try {
          const demoResponse = await apiDemoDir();
          if (demoResponse && demoResponse.exists && demoResponse.path) {
            // Demo directory exists, auto-load it
            demoHandlers.handleFirstRunDemo();
            showToast(
              "Demo library loaded. Try searching for 'mountain' or 'beach'",
              "default"
            );
          } else {
            // No demo directory available, fall back to demo mode
            demoHandlers.handleFirstRunDemo();
            showToast(
              "Demo library enabled. Try searching for 'mountain' or 'beach'",
              "default"
            );
          }
        } catch (error) {
          console.warn("Failed to check demo directory:", error);
          // Fall back to demo mode if we can't check
          demoHandlers.handleFirstRunDemo();
          showToast(
            "Demo library enabled. Try searching for 'mountain' or 'beach'",
            "default"
          );
        }
      };

      checkAndLoadDemo();

      // Mark first run as done
      safeLocalStorage.setItemJSON("ps_first_run_done", true);
    }
  }, [dir, libraryLength, demoHandlers, showToast]);

  return {};
}
