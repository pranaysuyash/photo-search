import { useState, useEffect } from "react";

export interface DemoModeHook {
  isDemoMode: boolean;
  demoDirectory: string | null;
  enableDemoMode: () => Promise<void>;
  disableDemoMode: () => void;
}

export function useDemoMode(): DemoModeHook {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoDirectory, setDemoDirectory] = useState<string | null>(null);

  // Check if demo mode was previously enabled
  useEffect(() => {
    const savedDemoMode = localStorage.getItem("photoSearch_demoMode");
    if (savedDemoMode === "true") {
      setIsDemoMode(true);
      // In a real implementation, this would be the path to demo photos
      // For now, we'll use a placeholder
      setDemoDirectory("./demo_photos");
    }
  }, []);

  const enableDemoMode = async (): Promise<void> => {
    try {
      setIsDemoMode(true);
      // In the actual implementation, this would point to the demo photos directory
      // For the frontend, we'll set a flag that the backend can detect
      setDemoDirectory("./demo_photos");
      localStorage.setItem("photoSearch_demoMode", "true");

      // You could dispatch an event or call an API here to notify the backend
      // For now, we'll just set the local state
      console.log("Demo mode enabled - using demo photos directory");
    } catch (error) {
      console.error("Failed to enable demo mode:", error);
      throw error;
    }
  };

  const disableDemoMode = (): void => {
    setIsDemoMode(false);
    setDemoDirectory(null);
    localStorage.removeItem("photoSearch_demoMode");
    console.log("Demo mode disabled");
  };

  return {
    isDemoMode,
    demoDirectory,
    enableDemoMode,
    disableDemoMode,
  };
}
