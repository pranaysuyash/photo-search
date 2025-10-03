import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui";
import { monitoringService } from "../services/MonitoringService";

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  lastCheck: Date;
  message?: string;
}

interface MonitoringData {
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
  serviceHealth: ServiceHealth[];
  performance: {
    pageLoad: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
  };
  offline: {
    isOnline: boolean;
    queueStats: {
      totalActions: number;
      pendingActions: number;
      failedActions: number;
      storageSize: number;
    };
    networkQuality: number;
  };
}

export function MonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);

      // Get system health from monitoring service
      const systemHealth = await monitoringService.getSystemHealth();

      // Get service health status
      const serviceHealth = await monitoringService.getServiceHealth();

      // Get performance metrics
      const performance = await monitoringService.getPerformanceMetrics();

      // Get offline status
      const offline = await monitoringService.getOfflineStatus();

      setMonitoringData({
        systemHealth,
        serviceHealth,
        performance,
        offline,
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error(
        "[MonitoringDashboard] Failed to fetch monitoring data:",
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);

    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  const getStatusColor = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "degraded":
        return "bg-yellow-500";
      case "unhealthy":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: ServiceHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "Healthy";
      case "degraded":
        return "Degraded";
      case "unhealthy":
        return "Unhealthy";
      default:
        return "Unknown";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">
          Failed to load monitoring data
        </p>
        <Button onClick={fetchMonitoringData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchMonitoringData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData.systemHealth.cpu.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Normal range: 0-80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData.systemHealth.memory.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Normal range: 0-80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoringData.systemHealth.disk.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Normal range: 0-80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(monitoringData.systemHealth.uptime)}
            </div>
            <p className="text-xs text-muted-foreground">System uptime</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monitoringData.serviceHealth.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(
                      service.status
                    )}`}
                  />
                  <span className="font-medium">{service.name}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      service.status === "healthy"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : service.status === "degraded"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {getStatusText(service.status)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {service.responseTime}ms
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {service.lastCheck.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {monitoringData.performance.pageLoad.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page Load
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {monitoringData.performance.firstContentfulPaint.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                First Contentful Paint
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {monitoringData.performance.largestContentfulPaint.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Largest Contentful Paint
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {monitoringData.performance.cumulativeLayoutShift.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Cumulative Layout Shift
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Status */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Wifi
                className={`w-5 h-5 ${
                  monitoringData.offline.isOnline
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              />
              <div>
                <div className="font-medium">Connection</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {monitoringData.offline.isOnline ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {monitoringData.offline.queueStats.pendingActions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pending Actions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatBytes(monitoringData.offline.queueStats.storageSize)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Storage Used
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for accessing monitoring data
export function useMonitoringData() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const systemHealth = await monitoringService.getSystemHealth();
      const serviceHealth = await monitoringService.getServiceHealth();
      const performance = await monitoringService.getPerformanceMetrics();
      const offline = await monitoringService.getOfflineStatus();

      setData({
        systemHealth,
        serviceHealth,
        performance,
        offline,
      });
    } catch (error) {
      console.error("[useMonitoringData] Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
