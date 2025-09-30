import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, BarChart3, Clock, Cpu, HardDrive, Zap } from 'lucide-react';
import { usePerformanceMonitor, PerformanceMetrics, PerformanceAlert } from '../services/PerformanceMonitor';

interface PerformanceDashboardProps {
  visible?: boolean;
  onClose?: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ visible = false, onClose }) => {
  const { metrics, alerts, generateReport, clearAlerts } = usePerformanceMonitor();
  const [expanded, setExpanded] = useState(false);

  if (!visible) return null;

  const formatMemory = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(2)}ms`;
  };

  const getMemoryStatusColor = (percent: number) => {
    if (percent > 90) return 'text-red-600';
    if (percent > 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAlertIcon = (type: 'warning' | 'critical') => {
    return type === 'critical' ? (
      <AlertTriangle className="w-4 h-4 text-red-600" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-yellow-600" />
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-100 rounded"
              title={expanded ? "Collapse" : "Expand"}
            >
              <BarChart3 className="w-4 h-4 text-gray-600" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded"
                title="Close"
              >
                <span className="text-gray-400 hover:text-gray-600">×</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
          {/* Memory Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className={`text-sm font-mono ${getMemoryStatusColor(metrics.memoryUsage.usagePercent)}`}>
                {metrics.memoryUsage.usagePercent}%
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-mono">{formatMemory(metrics.memoryUsage.usedJSHeapSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-mono">{formatMemory(metrics.memoryUsage.totalJSHeapSize)}</span>
              </div>
              <div className="flex justify-between">
                <span>Limit:</span>
                <span className="font-mono">{formatMemory(metrics.memoryUsage.jsHeapSizeLimit)}</span>
              </div>
            </div>
          </div>

          {/* Library Performance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Library Performance</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-mono">{metrics.library.totalItems.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Loaded Items:</span>
                <span className="font-mono">{metrics.library.loadedItems.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Load Time:</span>
                <span className="font-mono">{formatTime(metrics.library.averageLoadTime)}</span>
              </div>
            </div>
          </div>

          {/* Rendering Performance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Rendering Performance</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Virtualization:</span>
                <span className={`font-mono ${metrics.rendering.virtualizationEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                  {metrics.rendering.virtualizationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Visible Items:</span>
                <span className="font-mono">{metrics.rendering.visibleItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Grid Render Time:</span>
                <span className="font-mono">{formatTime(metrics.rendering.gridRenderTime)}</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Recent Alerts</span>
                </div>
                <button
                  onClick={clearAlerts}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {alerts.slice(-3).map((alert, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{alert.message}</div>
                      <div className="text-gray-600">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-xs text-blue-800 space-y-1">
              <div className="font-medium">💡 Performance Tips:</div>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                {metrics.memoryUsage.usagePercent > 75 && (
                  <li>High memory usage detected. Consider closing other tabs.</li>
                )}
                {metrics.library.totalItems > 10000 && !metrics.rendering.virtualizationEnabled && (
                  <li>Large library detected. Enable virtualized grid for better performance.</li>
                )}
                {metrics.rendering.gridRenderTime > 100 && (
                  <li>Slow grid rendering. Consider reducing visible items.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => {
              const report = generateReport();
              navigator.clipboard.writeText(report);
              // You could show a toast notification here
            }}
            className="w-full text-xs text-gray-600 hover:text-gray-800 text-center"
          >
            Copy Performance Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;