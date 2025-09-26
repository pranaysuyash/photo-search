/**
 * Handles demo library bootstrap and first-run enablement
 */
import { useEffect } from "react";
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
      // Auto-enable demo mode for first-time users
      demoHandlers.handleFirstRunDemo();
      showToast(
        "Demo library enabled. Try searching for 'mountain' or 'beach'",
        "default"
      );

      // Mark first run as done
      safeLocalStorage.setItemJSON("ps_first_run_done", true);
    }
  }, [dir, libraryLength, demoHandlers, showToast]);

  return {};
}
