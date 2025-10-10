import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { useUIStore, type Toast as ToastType } from "@/store/uiStore";

/**
 * ToastContainer - Renders all active toasts
 *
 * Usage:
 * ```tsx
 * // In App.tsx or layout
 * <ToastContainer />
 *
 * // Trigger toasts from anywhere
 * const { showToast } = useToast();
 * showToast.success('Photo added to collection');
 * showToast.error('Failed to index directory');
 * ```
 *
 * Features:
 * - 4 variants: success, error, warning, info
 * - Auto-dismiss with configurable duration
 * - Manual dismiss with X button
 * - Smooth enter/exit animations
 * - Stacking support (max 5 visible)
 * - Action button support
 */
export function ToastContainer() {
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: ToastType;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = getToastIcon(toast.type);
  const colorClasses = getToastColorClasses(toast.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className={`
        pointer-events-auto
        min-w-[300px] max-w-[420px]
        bg-card border rounded-lg shadow-lg
        p-4 flex items-start gap-3
        ${colorClasses.border}
      `}
    >
      <div className={`flex-shrink-0 ${colorClasses.icon}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-semibold text-sm text-foreground mb-1">
            {toast.title}
          </h4>
        )}
        <p className="text-sm text-muted-foreground">{toast.message}</p>

        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className={`
              mt-2 text-xs font-medium underline-offset-4 hover:underline
              ${colorClasses.action}
            `}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function getToastIcon(type: ToastType["type"]) {
  switch (type) {
    case "success":
      return CheckCircle;
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "info":
      return Info;
  }
}

function getToastColorClasses(type: ToastType["type"]) {
  switch (type) {
    case "success":
      return {
        border: "border-green-500/50",
        icon: "text-green-500",
        action: "text-green-600 dark:text-green-400",
      };
    case "error":
      return {
        border: "border-destructive/50",
        icon: "text-destructive",
        action: "text-destructive",
      };
    case "warning":
      return {
        border: "border-yellow-500/50",
        icon: "text-yellow-500",
        action: "text-yellow-600 dark:text-yellow-400",
      };
    case "info":
      return {
        border: "border-blue-500/50",
        icon: "text-blue-500",
        action: "text-blue-600 dark:text-blue-400",
      };
  }
}
