import React from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import ToastPortal from "./ToastPortal";

export interface OverlayLayerProps {
  busy: string;
  note?: string;
  toast: { message: string; actionLabel?: string; onAction?: () => void } | null;
  setToast: (toast: { message: string; actionLabel?: string; onAction?: () => void } | null) => void;
  toastTimerRef: React.MutableRefObject<number | null>;
}

export const OverlayLayer: React.FC<OverlayLayerProps> = ({ busy, note, toast, setToast, toastTimerRef }) => {
  return (
    <>
      {/* Global progress overlay */}
      {!!busy && (
        <div
          className="fixed inset-0 z-[1050] bg-black/40 flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm">
            <LoadingSpinner size="lg" message={busy} className="text-center" />
            {note && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center">{note}</p>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <ToastPortal>
          <div className="pv-toast" role="status" aria-live="polite">
            <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2 rounded shadow">
              <span className="text-sm">{toast.message}</span>
              {toast.actionLabel && toast.onAction && (
                <button type="button" className="text-sm underline" onClick={toast.onAction}>
                  {toast.actionLabel}
                </button>
              )}
              <button
                type="button"
                aria-label="Close notification"
                className="ml-1"
                onClick={() => {
                  setToast(null);
                  if (toastTimerRef.current) {
                    window.clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = null;
                  }
                }}
              >
                ×
              </button>
            </div>
          </div>
        </ToastPortal>
      )}
    </>
  );
};

export default OverlayLayer;

