import { AlertCircle, Wifi, WifiOff, X } from "lucide-react";
import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { offlineService } from "../services/OfflineService";
import { OfflineQueueManager } from "./OfflineQueueManager";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const toastRef = useRef<HTMLDivElement>(null);
  const closeToastRef = useRef<HTMLButtonElement>(null);

  // Check queue count
  const checkQueueCount = useCallback(() => {
    offlineService.getQueue()
      .then(queue => setQueueCount(queue.length))
      .catch(() => setQueueCount(0));
  }, []);

  useEffect(() => {
    // Set initial status
    setIsOnline(offlineService.getStatus());
    checkQueueCount();

    // Subscribe to status changes
    const unsubscribe = offlineService.onStatusChange((online) => {
      setIsOnline(online);
      setShowToast(true);

      if (online) {
        setSyncPending(true);
        // Sync queue when back online
        offlineService.syncQueue().then(() => {
          setSyncPending(false);
          checkQueueCount();
        });
      }

      // Focus the close button when toast appears
      setTimeout(() => {
        if (showToast && closeToastRef.current) {
          closeToastRef.current.focus();
        }
      }, 100);
    });

    // Set up interval to check queue count
    const interval = setInterval(checkQueueCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [checkQueueCount, showToast]);

  // Close toast manually
  const closeToast = useCallback(() => {
    setShowToast(false);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close toast with Escape key
      if (e.key === 'Escape' && showToast && toastRef.current) {
        closeToast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showToast, closeToast]);

  if (isOnline && !showToast && !syncPending && queueCount === 0) {
    return null;
  }

  return (
    <>
      {/* Persistent offline indicator */})
      {!isOnline && (
        <div 
          role="status"
          aria-label="Offline mode active"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-lg"
          tabIndex={0}
        >
          <WifiOff className="w-5 h-5" aria-hidden="true" />
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          ref={toastRef}
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-xs ${
            isOnline ? "bg-green-500 text-white" : "bg-orange-500 text-white"
          }`}
          tabIndex={-1}
        >
          <button 
            type="button" 
            onClick={closeToast}
            ref={closeToastRef}
            className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium">Back Online</div>
                {syncPending && (
                  <div className="text-sm opacity-90">Syncing changes...</div>
                )}
              </div>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium">You're Offline</div>
                <div className="text-sm opacity-90">
                  Changes will sync when reconnected
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sync pending indicator */}
      {syncPending && isOnline && !showToast && (
        <div 
          role="status"
          aria-label="Syncing offline changes"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg"
          tabIndex={0}
        >
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">
            Syncing offline changes...
          </span>
        </div>
      )}

      {/* Queue Manager */}
      <OfflineQueueManager />
    </>
  );
}

// Hook for components to check offline status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasOfflineQueue, setHasOfflineQueue] = useState(false);

  useEffect(() => {
    setIsOnline(offlineService.getStatus());

    const unsubscribe = offlineService.onStatusChange(setIsOnline);

    // Check for queued actions
    const checkQueue = async () => {
      try {
        const queue = await offlineService.getQueue();
        setHasOfflineQueue(queue.length > 0);
      } catch {
        setHasOfflineQueue(false);
      }
    };

    checkQueue();
    const interval = setInterval(() => {
      checkQueue();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isOnline, hasOfflineQueue };
}

// Offline-aware button component
interface OfflineButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onlineOnly?: boolean;
  offlineText?: string;
}

export function OfflineButton({
  onlineOnly = false,
  offlineText = "Offline",
  children,
  disabled,
  ...props
}: OfflineButtonProps) {
  const { isOnline } = useOfflineStatus();

  const isDisabled = disabled || (onlineOnly && !isOnline);

  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      title={
        !isOnline && onlineOnly
          ? "This action requires an internet connection"
          : props.title
      }
      aria-disabled={isDisabled}
      className={`${props.className || ''} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
    >
      {!isOnline && onlineOnly ? (
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          {offlineText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
