/**
 * Handles connectivity status, authentication requirements, offline notifications
 */
import { useCallback, useEffect, useState } from "react";
import { useConnectivityAndAuth } from "../useConnectivityAndAuth";

export interface UseConnectivityGateReturn {
  isConnected: boolean;
  authRequired: boolean;
  authTokenInput: string;
  setAuthTokenInput: (token: string) => void;
  connectivity: ReturnType<typeof useConnectivityAndAuth>;
}

export interface UseConnectivityGateProps {
  showToast: (message: string, variant?: "default" | "destructive") => void;
}

export function useConnectivityGate({
  showToast,
}: UseConnectivityGateProps): UseConnectivityGateReturn {
  const [isConnected, setIsConnected] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authTokenInput, setAuthTokenInput] = useState("");

  const connectivity = useConnectivityAndAuth({
    setIsConnected,
    setAuthRequired,
  });

  const setAuthTokenInputCallback = useCallback((token: string) => {
    setAuthTokenInput(token);
  }, []);

  // Handle connectivity changes with toast notifications
  useEffect(() => {
    if (isConnected === false) {
      showToast("You're offline. Some features may be limited.", "default");
    }
  }, [isConnected, showToast]);

  return {
    isConnected,
    authRequired,
    authTokenInput,
    setAuthTokenInput: setAuthTokenInputCallback,
    connectivity,
  };
}
