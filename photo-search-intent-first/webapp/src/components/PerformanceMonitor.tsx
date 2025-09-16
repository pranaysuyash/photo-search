/**
 * Enhanced Performance monitoring component with React Profiler integration
 */
import {
  memo,
  useEffect,
  useState,
  Profiler,
  ProfilerOnRenderCallback,
} from "react";
import { imageLoadingService } from "../services/ImageLoadingService";
import { performanceAnalyzer } from "../utils/performanceAnalyzer";

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceStats {
  renderTime: number;
  memoryUsage: number;
  imageCache: {
    size: number;
    totalSize: number;
    hitRate: number;
  };
  networkRequests: number;
  renderMetrics: {
    totalRenders: number;
    averageRenderTime: number;
    slowestComponent: string;
  };
  apiMetrics: {
    totalRequests: number;
    averageResponseTime: number;
    slowestEndpoint: string;
  };
}

interface RenderMeasurement {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

const PerformanceMonitor = memo(() => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [renderMeasurements, setRenderMeasurements] = useState<
    RenderMeasurement[]
  >([]);
  const [apiMeasurements, setApiMeasurements] = useState<
    Array<{
      url: string;
      duration: number;
      timestamp: number;
    }>
  >([]);

  // React Profiler callback
  const onRenderCallback: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const measurement: RenderMeasurement = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    };

    setRenderMeasurements((prev) => {
      const newMeasurements = [...prev, measurement];
      // Keep only last 100 measurements
      return newMeasurements.slice(-100);
    });

    // Record in performance analyzer
    performanceAnalyzer.recordRenderTime(actualDuration);
  }; // Monitor API calls
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const firstArg = args[0];
      let url: string;

      if (typeof firstArg === "string") {
        url = firstArg;
      } else if (firstArg instanceof Request) {
        url = firstArg.url;
      } else if (firstArg instanceof URL) {
        url = firstArg.href;
      } else {
        url = "unknown";
      }

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        setApiMeasurements((prev) => {
          const newMeasurements = [
            ...prev,
            {
              url: url.split("?")[0], // Remove query params for grouping
              duration,
              timestamp: Date.now(),
            },
          ];
          // Keep only last 50 measurements
          return newMeasurements.slice(-50);
        });

        // Record in performance analyzer
        performanceAnalyzer.recordApiCallTime(duration);

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        setApiMeasurements((prev) =>
          [
            ...prev,
            {
              url: url.split("?")[0],
              duration,
              timestamp: Date.now(),
            },
          ].slice(-50)
        );
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const updateStats = () => {
      const cacheStats = imageLoadingService.getCacheStats();
      const memory = (performance as { memory?: PerformanceMemory }).memory;

      // Calculate render metrics
      const recentRenders = renderMeasurements.slice(-20);
      const totalRenders = recentRenders.length;
      const averageRenderTime =
        totalRenders > 0
          ? recentRenders.reduce((sum, m) => sum + m.actualDuration, 0) /
            totalRenders
          : 0;
      const slowestComponent =
        totalRenders > 0
          ? recentRenders.reduce(
              (slowest, m) =>
                m.actualDuration > slowest.duration
                  ? { name: m.id, duration: m.actualDuration }
                  : slowest,
              { name: "", duration: 0 }
            ).name
          : "";

      // Calculate API metrics
      const recentApis = apiMeasurements.slice(-20);
      const totalRequests = recentApis.length;
      const averageResponseTime =
        totalRequests > 0
          ? recentApis.reduce((sum, m) => sum + m.duration, 0) / totalRequests
          : 0;
      const slowestEndpoint =
        totalRequests > 0
          ? recentApis.reduce(
              (slowest, m) =>
                m.duration > slowest.duration
                  ? { url: m.url, duration: m.duration }
                  : slowest,
              { url: "", duration: 0 }
            ).url
          : "";

      const newStats: PerformanceStats = {
        renderTime: performance.now(),
        memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0,
        imageCache: cacheStats,
        networkRequests: performance.getEntriesByType("navigation").length,
        renderMetrics: {
          totalRenders,
          averageRenderTime,
          slowestComponent,
        },
        apiMetrics: {
          totalRequests,
          averageResponseTime,
          slowestEndpoint,
        },
      };

      setStats(newStats);
    };

    const interval = setInterval(updateStats, 2000);
    updateStats();

    return () => clearInterval(interval);
  }, [renderMeasurements, apiMeasurements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (process.env.NODE_ENV !== "development" || !isVisible || !stats) {
    return null;
  }

  return (
    <>
      {/* React Profiler wrapper for the entire app */}
      <Profiler id="App" onRender={onRenderCallback}>
        <div />
      </Profiler>

      <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-[9999] max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">🚀 Performance Monitor</h3>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white ml-4 text-lg"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {/* Memory Section */}
          <div className="border-b border-gray-600 pb-2">
            <div className="text-blue-400 font-semibold mb-1">Memory</div>
            <div>
              <span className="text-gray-300">Heap:</span>{" "}
              <span
                className={
                  stats.memoryUsage > 100 ? "text-red-400" : "text-green-400"
                }
              >
                {stats.memoryUsage.toFixed(1)}MB
              </span>
            </div>
          </div>

          {/* Render Performance Section */}
          <div className="border-b border-gray-600 pb-2">
            <div className="text-purple-400 font-semibold mb-1">
              Render Performance
            </div>
            <div>
              <span className="text-gray-300">Avg Render:</span>{" "}
              <span
                className={
                  stats.renderMetrics.averageRenderTime > 16
                    ? "text-red-400"
                    : stats.renderMetrics.averageRenderTime > 8
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              >
                {stats.renderMetrics.averageRenderTime.toFixed(1)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-300">Total Renders:</span>{" "}
              <span className="text-cyan-400">
                {stats.renderMetrics.totalRenders}
              </span>
            </div>
            {stats.renderMetrics.slowestComponent && (
              <div>
                <span className="text-gray-300">Slowest:</span>{" "}
                <span className="text-orange-400">
                  {stats.renderMetrics.slowestComponent}
                </span>
              </div>
            )}
          </div>

          {/* API Performance Section */}
          <div className="border-b border-gray-600 pb-2">
            <div className="text-green-400 font-semibold mb-1">
              API Performance
            </div>
            <div>
              <span className="text-gray-300">Avg Response:</span>{" "}
              <span
                className={
                  stats.apiMetrics.averageResponseTime > 1000
                    ? "text-red-400"
                    : stats.apiMetrics.averageResponseTime > 500
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              >
                {stats.apiMetrics.averageResponseTime.toFixed(0)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-300">Total Requests:</span>{" "}
              <span className="text-cyan-400">
                {stats.apiMetrics.totalRequests}
              </span>
            </div>
            {stats.apiMetrics.slowestEndpoint && (
              <div>
                <span className="text-gray-300">Slowest:</span>{" "}
                <span className="text-orange-400 truncate block">
                  {stats.apiMetrics.slowestEndpoint.split("/").pop()}
                </span>
              </div>
            )}
          </div>

          {/* Image Cache Section */}
          <div className="border-b border-gray-600 pb-2">
            <div className="text-yellow-400 font-semibold mb-1">
              Image Cache
            </div>
            <div>
              <span className="text-gray-300">Items:</span>{" "}
              <span className="text-green-400">{stats.imageCache.size}</span>
            </div>
            <div>
              <span className="text-gray-300">Size:</span>{" "}
              <span className="text-green-400">
                {(stats.imageCache.totalSize / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>
            <div>
              <span className="text-gray-300">Hit Rate:</span>{" "}
              <span
                className={
                  stats.imageCache.hitRate > 0.8
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              >
                {(stats.imageCache.hitRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Performance Analysis Section */}
          <div className="border-b border-gray-600 pb-2">
            <div className="text-indigo-400 font-semibold mb-1">
              Performance Score
            </div>
            {(() => {
              const analysis = performanceAnalyzer.getAnalysis();
              return (
                <>
                  <div>
                    <span className="text-gray-300">Score:</span>{" "}
                    <span
                      className={
                        analysis.performanceScore > 80
                          ? "text-green-400"
                          : analysis.performanceScore > 60
                          ? "text-yellow-400"
                          : "text-red-400"
                      }
                    >
                      {analysis.performanceScore.toFixed(0)}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Memory:</span>{" "}
                    <span
                      className={
                        analysis.memoryTrend === "increasing"
                          ? "text-red-400"
                          : analysis.memoryTrend === "decreasing"
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {analysis.memoryTrend}
                    </span>
                  </div>
                  {analysis.recommendations.length > 0 && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-400">
                        💡 {analysis.recommendations[0]}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="text-gray-400 text-center pt-2 border-t border-gray-600">
            <div className="text-xs">Ctrl+Shift+P to toggle</div>
            <div className="text-xs mt-1">
              <button
                type="button"
                onClick={() => {
                  setRenderMeasurements([]);
                  setApiMeasurements([]);
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Clear Metrics
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

PerformanceMonitor.displayName = "PerformanceMonitor";

export default PerformanceMonitor;
