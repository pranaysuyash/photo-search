import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { offlineService } from '../services/OfflineService';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [syncPending, setSyncPending] = useState(false);

  useEffect(() => {
    // Set initial status
    setIsOnline(offlineService.getStatus());

    // Subscribe to status changes
    const unsubscribe = offlineService.onStatusChange((online) => {
      setIsOnline(online);
      setShowToast(true);
      
      if (online) {
        setSyncPending(true);
        // Sync queue when back online
        offlineService.syncQueue().then(() => {
          setSyncPending(false);
        });
      }

      // Hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    });

    return unsubscribe;
  }, []);

  if (isOnline && !showToast && !syncPending) {
    return null;
  }

  return (
    <>
      {/* Persistent offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg shadow-lg">
          <WifiOff className="w-5 h-5" />
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            isOnline
              ? 'bg-green-500 text-white'
              : 'bg-orange-500 text-white'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5" />
              <div>
                <div className="font-medium">Back Online</div>
                {syncPending && (
                  <div className="text-sm opacity-90">Syncing changes...</div>
                )}
              </div>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              <div>
                <div className="font-medium">You're Offline</div>
                <div className="text-sm opacity-90">Changes will sync when reconnected</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sync pending indicator */}
      {syncPending && isOnline && !showToast && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Syncing offline changes...</span>
        </div>
      )}
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
    const checkQueue = () => {
      try {
        const queue = localStorage.getItem('offline_action_queue');
        setHasOfflineQueue(queue ? JSON.parse(queue).length > 0 : false);
      } catch {
        setHasOfflineQueue(false);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isOnline, hasOfflineQueue };
}

// Offline-aware button component
interface OfflineButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onlineOnly?: boolean;
  offlineText?: string;
}

export function OfflineButton({ 
  onlineOnly = false, 
  offlineText = 'Offline',
  children,
  disabled,
  ...props 
}: OfflineButtonProps) {
  const { isOnline } = useOfflineStatus();
  
  const isDisabled = disabled || (onlineOnly && !isOnline);
  
  return (
    <button
      {...props}
      disabled={isDisabled}
      title={!isOnline && onlineOnly ? 'This action requires an internet connection' : props.title}
    >
      {!isOnline && onlineOnly ? (
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {offlineText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}