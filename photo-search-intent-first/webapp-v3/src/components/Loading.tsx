/**
 * Loading Components - Skeleton loaders, spinners, and progress bars
 *
 * Usage patterns:
 * - Use LoadingSkeleton for content placeholders (photo grids, lists)
 * - Use Spinner for inline loading indicators
 * - Use ProgressBar for determinate progress (indexing, uploads)
 */

/**
 * LoadingSkeleton - Animated skeleton placeholder for content
 *
 * Usage:
 * ```tsx
 * {isLoading ? <LoadingSkeleton variant="photo-grid" /> : <PhotoGrid />}
 * ```
 */
interface LoadingSkeletonProps {
  variant?: "photo-grid" | "photo-card" | "list-item" | "text" | "rectangle";
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = "rectangle",
  count = 1,
  className = "",
}: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case "photo-grid":
        return (
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}
          >
            {Array.from({ length: count }, () => crypto.randomUUID()).map(
              (id) => (
                <div key={id} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg" />
                </div>
              )
            )}
          </div>
        );

      case "photo-card":
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        );

      case "list-item":
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }, () => crypto.randomUUID()).map(
              (id) => (
                <div key={id} className="animate-pulse flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              )
            )}
          </div>
        );

      case "text":
        return (
          <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }, () => crypto.randomUUID()).map(
              (id) => (
                <div key={id} className="animate-pulse">
                  <div className="h-4 bg-muted rounded" />
                </div>
              )
            )}
          </div>
        );

      case "rectangle":
      default:
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }, () => crypto.randomUUID()).map(
              (id) => (
                <div key={id} className="animate-pulse">
                  <div className="h-32 bg-muted rounded-lg" />
                </div>
              )
            )}
          </div>
        );
    }
  };

  return <>{renderSkeleton()}</>;
}

/**
 * Spinner - Animated loading spinner
 *
 * Usage:
 * ```tsx
 * <Spinner size="md" />
 * {isLoading && <Spinner className="ml-2" />}
 * ```
 */
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <output
      className={`
        inline-block
        ${sizeClasses[size]}
        border-current border-t-transparent
        rounded-full
        animate-spin
        ${className}
      `}
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}

/**
 * ProgressBar - Progress indicator for determinate operations
 *
 * Usage:
 * ```tsx
 * <ProgressBar value={progress} max={100} label="Indexing photos..." />
 * ```
 */
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium text-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * LoadingOverlay - Full-screen loading overlay
 *
 * Usage:
 * ```tsx
 * {globalLoading && <LoadingOverlay message="Processing..." />}
 * ```
 */
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998] flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

/**
 * SuspenseFallback - Fallback for React.lazy() components
 *
 * Usage:
 * ```tsx
 * <Suspense fallback={<SuspenseFallback label="Loading view..." />}>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
interface SuspenseFallbackProps {
  label?: string;
}

export function SuspenseFallback({
  label = "Loading...",
}: SuspenseFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
