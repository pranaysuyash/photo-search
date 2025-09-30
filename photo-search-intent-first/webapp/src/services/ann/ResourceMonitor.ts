/**
 * System resource monitoring service
 */

import { SystemResources, ResourceUsage, NetworkStatus } from './types';

export interface ResourceMonitorConfig {
  interval: number;
  enableMemoryMonitoring: boolean;
  enableCPUMonitoring: boolean;
  enableGPUMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  storageMonitoringInterval: number;
  alertThresholds: {
    memory: number; // percentage
    cpu: number; // percentage
    gpu?: number; // percentage
    storage: number; // percentage
  };
}

export interface ResourceAlert {
  type: 'memory' | 'cpu' | 'gpu' | 'storage' | 'network';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class ResourceMonitor {
  private config: ResourceMonitorConfig;
  private currentResources: SystemResources;
  private history: ResourceUsage[] = [];
  private alerts: ResourceAlert[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<ResourceMonitorConfig> = {}) {
    this.config = {
      interval: 5000,
      enableMemoryMonitoring: true,
      enableCPUMonitoring: true,
      enableGPUMonitoring: true,
      enableNetworkMonitoring: true,
      storageMonitoringInterval: 30000,
      alertThresholds: {
        memory: 85, // 85%
        cpu: 80, // 80%
        gpu: 90, // 90%
        storage: 90 // 90%
      },
      ...config
    };

    this.currentResources = this.getInitialResources();
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('[ResourceMonitor] Initializing resource monitoring...');

      // Initialize resource detection
      await this.detectSystemCapabilities();

      // Get initial resource snapshot
      this.currentResources = await this.collectResourceMetrics();

      console.log('[ResourceMonitor] Resource monitoring initialized successfully');
      return true;
    } catch (error) {
      console.error('[ResourceMonitor] Failed to initialize:', error);
      return false;
    }
  }

  start(): void {
    if (this.isMonitoring) {
      return;
    }

    console.log('[ResourceMonitor] Starting resource monitoring...');
    this.isMonitoring = true;

    // Start monitoring interval
    this.intervalId = setInterval(async () => {
      try {
        await this.updateResourcesInternal();
      } catch (error) {
        console.error('[ResourceMonitor] Error updating resources:', error);
      }
    }, this.config.interval);

    // Emit start event
    this.emitEvent('monitoringStarted', { timestamp: Date.now() });
  }

  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[ResourceMonitor] Stopping resource monitoring...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isMonitoring = false;

    // Emit stop event
    this.emitEvent('monitoringStopped', { timestamp: Date.now() });
  }

  getCurrentResources(): SystemResources {
    return { ...this.currentResources };
  }

  getResourceHistory(count: number = 100): ResourceUsage[] {
    return this.history.slice(-count);
  }

  getAlerts(severity?: 'warning' | 'critical'): ResourceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
    this.emitEvent('alertsCleared', { timestamp: Date.now() });
  }

  updateResources(resources: Partial<SystemResources>): void {
    const before = { ...this.currentResources };

    // Update resources
    if (resources.totalMemory !== undefined) this.currentResources.totalMemory = resources.totalMemory;
    if (resources.availableMemory !== undefined) this.currentResources.availableMemory = Math.max(0, resources.availableMemory);
    if (resources.totalCPU !== undefined) this.currentResources.totalCPU = resources.totalCPU;
    if (resources.availableCPU !== undefined) this.currentResources.availableCPU = Math.max(0, Math.min(100, resources.availableCPU));
    if (resources.totalGPU !== undefined) this.currentResources.totalGPU = resources.totalGPU;
    if (resources.availableGPU !== undefined) this.currentResources.availableGPU = resources.availableGPU;
    if (resources.totalStorage !== undefined) this.currentResources.totalStorage = resources.totalStorage;
    if (resources.availableStorage !== undefined) this.currentResources.availableStorage = Math.max(0, resources.availableStorage);
    if (resources.network !== undefined) this.currentResources.network = resources.network;

    // Calculate usage percentages
    const usage = this.calculateResourceUsage();

    // Add to history
    this.history.push({
      ...usage,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }

    // Check for alerts
    this.checkAlerts(usage);

    // Emit update event
    this.emitEvent('resourcesUpdated', {
      before,
      after: { ...this.currentResources },
      usage,
      timestamp: Date.now()
    });
  }

  private async updateResourcesInternal(): Promise<void> {
    const newResources = await this.collectResourceMetrics();
    this.updateResources(newResources);
  }

  private async collectResourceMetrics(): Promise<SystemResources> {
    const metrics = await Promise.allSettled([
      this.collectMemoryMetrics(),
      this.collectCPUMetrics(),
      this.collectGPUMetrics(),
      this.collectStorageMetrics(),
      this.collectNetworkMetrics()
    ]);

    return {
      totalMemory: metrics[0].status === 'fulfilled' ? metrics[0].value.total : this.currentResources.totalMemory,
      availableMemory: metrics[0].status === 'fulfilled' ? metrics[0].value.available : this.currentResources.availableMemory,
      totalCPU: metrics[1].status === 'fulfilled' ? metrics[1].value.total : this.currentResources.totalCPU,
      availableCPU: metrics[1].status === 'fulfilled' ? metrics[1].value.available : this.currentResources.availableCPU,
      totalGPU: metrics[2].status === 'fulfilled' ? metrics[2].value?.total : this.currentResources.totalGPU,
      availableGPU: metrics[2].status === 'fulfilled' ? metrics[2].value?.available : this.currentResources.availableGPU,
      totalStorage: metrics[3].status === 'fulfilled' ? metrics[3].value.total : this.currentResources.totalStorage,
      availableStorage: metrics[3].status === 'fulfilled' ? metrics[3].value.available : this.currentResources.availableStorage,
      network: metrics[4].status === 'fulfilled' ? metrics[4].value : this.currentResources.network
    };
  }

  private async collectMemoryMetrics(): Promise<{ total: number; available: number }> {
    if (!this.config.enableMemoryMonitoring) {
      return { total: this.currentResources.totalMemory, available: this.currentResources.availableMemory };
    }

    try {
      // Browser memory API
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
          available: Math.round((memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1024 / 1024) // MB
        };
      }

      // Device memory API
      if ('deviceMemory' in navigator) {
        const totalGB = (navigator as any).deviceMemory || 4;
        return {
          total: totalGB * 1024, // Convert to MB
          available: totalGB * 1024 * 0.7 // Assume 70% available
        };
      }

      // Fallback estimation
      return {
        total: 8192, // 8GB default
        available: 5734 // 70% of 8GB
      };
    } catch (error) {
      console.warn('[ResourceMonitor] Error collecting memory metrics:', error);
      return { total: this.currentResources.totalMemory, available: this.currentResources.availableMemory };
    }
  }

  private async collectCPUMetrics(): Promise<{ total: number; available: number }> {
    if (!this.config.enableCPUMonitoring) {
      return { total: this.currentResources.totalCPU, available: this.currentResources.availableCPU };
    }

    try {
      // Hardware concurrency for CPU core count
      const cpuCores = navigator.hardwareConcurrency || 4;

      // Estimate CPU usage (this is approximate)
      let estimatedUsage = 50; // Default 50% usage

      // Use performance API for better estimation
      if ('measureMemory' in performance) {
        try {
          const memory = await (performance as any).measureMemory();
          // This is a rough estimate based on memory pressure
          estimatedUsage = Math.min(100, Math.max(0, memory.bytes / (1024 * 1024 * 100) * 10));
        } catch (error) {
          // measureMemory may not be available
        }
      }

      return {
        total: cpuCores * 100, // Total capacity as percentage
        available: Math.max(0, cpuCores * 100 - estimatedUsage)
      };
    } catch (error) {
      console.warn('[ResourceMonitor] Error collecting CPU metrics:', error);
      return { total: this.currentResources.totalCPU, available: this.currentResources.availableCPU };
    }
  }

  private async collectGPUMetrics(): Promise<{ total: number; available: number } | null> {
    if (!this.config.enableGPUMonitoring) {
      return this.currentResources.totalGPU ? {
        total: this.currentResources.totalGPU,
        available: this.currentResources.availableGPU || 0
      } : null;
    }

    try {
      // Check if we're in a test environment or missing document
      if (typeof document === 'undefined' || !document.createElement) {
        return null;
      }

      // Check for WebGPU support
      if ('gpu' in navigator) {
        const gpu = (navigator as any).gpu;
        if (gpu) {
          // This is a very rough estimate
          return {
            total: 4096, // 4GB default
            available: 3072 // 75% available
          };
        }
      }

      // WebGL context as fallback
      try {
        if (typeof document !== 'undefined' && document.createElement) {
          const canvas = document.createElement('canvas');
          if (canvas && typeof canvas.getContext === 'function') {
            let gl = null;
            try {
              gl = canvas.getContext('webgl');
            } catch (e) {
              try {
                gl = canvas.getContext('experimental-webgl');
              } catch (e2) {
                // Neither WebGL context is available
              }
            }
            if (gl) {
              // Check for debug renderer info safely
              try {
                const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                  // This doesn't give us exact memory, but we can estimate
                  return {
                    total: 2048, // 2GB default estimate
                    available: 1536 // 75% available
                  };
                }
              } catch (error) {
                // Extension not available
              }
            }
          }
        }
      } catch (canvasError) {
        // Canvas not available in this environment
        console.warn('[ResourceMonitor] Canvas not available for GPU detection');
      }

      return null; // No GPU detected
    } catch (error) {
      console.warn('[ResourceMonitor] Error collecting GPU metrics:', error);
      return null;
    }
  }

  private async collectStorageMetrics(): Promise<{ total: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
        const estimate = await (navigator as any).storage.estimate();
        return {
          total: Math.round((estimate.quota || 0) / 1024 / 1024), // MB
          available: Math.round((estimate.quota - (estimate.usage || 0)) / 1024 / 1024) // MB
        };
      }

      // Fallback to localStorage estimation
      try {
        const testKey = 'storage_test';
        const testData = 'x'.repeat(1024 * 1024); // 1MB test data

        // Estimate available storage
        let availableMB = 100; // Default 100MB
        let totalMB = 1000; // Default 1GB

        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);

        return { total: totalMB, available: availableMB };
      } catch (error) {
        // If localStorage fails, return defaults
        return { total: 1000, available: 100 };
      }
    } catch (error) {
      console.warn('[ResourceMonitor] Error collecting storage metrics:', error);
      return { total: this.currentResources.totalStorage, available: this.currentResources.availableStorage };
    }
  }

  private async collectNetworkMetrics(): Promise<NetworkStatus | undefined> {
    if (!this.config.enableNetworkMonitoring) {
      return this.currentResources.network;
    }

    try {
      // Check online status
      const online = navigator.onLine;

      // Estimate bandwidth (very rough estimate)
      let bandwidth = 10; // 10 Mbps default
      let latency = 50; // 50ms default

      // Use Navigation Timing API for better estimates
      if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const fetchTime = navigation.responseEnd - navigation.fetchStart;
          latency = Math.round(fetchTime);

          // Rough bandwidth estimation based on fetch time and document size
          if (navigation.transferSize > 0) {
            bandwidth = Math.max(1, Math.round((navigation.transferSize * 8) / (fetchTime / 1000) / 1024));
          }
        }
      }

      // Connection API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          if (connection.downlink) bandwidth = connection.downlink;
          if (connection.rtt) latency = connection.rtt;
        }
      }

      return {
        online,
        bandwidth,
        latency,
        reliability: online ? 0.95 : 0 // Assume 95% reliability when online
      };
    } catch (error) {
      console.warn('[ResourceMonitor] Error collecting network metrics:', error);
      return this.currentResources.network;
    }
  }

  private calculateResourceUsage(): ResourceUsage {
    const { totalMemory, availableMemory, totalCPU, availableCPU, totalGPU, availableGPU, totalStorage, availableStorage } = this.currentResources;

    return {
      memory: totalMemory > 0 ? Math.round(((totalMemory - availableMemory) / totalMemory) * 100) : 0,
      cpu: totalCPU > 0 ? Math.round(((totalCPU - availableCPU) / totalCPU) * 100) : 0,
      gpu: totalGPU && totalGPU > 0 ? Math.round(((totalGPU - (availableGPU || 0)) / totalGPU) * 100) : undefined,
      storage: totalStorage > 0 ? Math.round(((totalStorage - availableStorage) / totalStorage) * 100) : 0,
      network: this.currentResources.network ? {
        bandwidth: this.currentResources.network.bandwidth,
        latency: this.currentResources.network.latency,
        packetsSent: 0, // Not easily measurable
        packetsReceived: 0
      } : undefined
    };
  }

  private checkAlerts(usage: ResourceUsage): void {
    const thresholds = this.config.alertThresholds;
    const now = Date.now();

    // Memory alerts
    if (usage.memory >= thresholds.memory) {
      const severity = usage.memory >= 95 ? 'critical' : 'warning';
      this.createAlert({
        type: 'memory',
        severity,
        message: `High memory usage: ${usage.memory}%`,
        value: usage.memory,
        threshold: thresholds.memory,
        timestamp: now
      });
    }

    // CPU alerts
    if (usage.cpu >= thresholds.cpu) {
      const severity = usage.cpu >= 95 ? 'critical' : 'warning';
      this.createAlert({
        type: 'cpu',
        severity,
        message: `High CPU usage: ${usage.cpu}%`,
        value: usage.cpu,
        threshold: thresholds.cpu,
        timestamp: now
      });
    }

    // GPU alerts
    if (usage.gpu !== undefined && thresholds.gpu && usage.gpu >= thresholds.gpu) {
      const severity = usage.gpu >= 98 ? 'critical' : 'warning';
      this.createAlert({
        type: 'gpu',
        severity,
        message: `High GPU usage: ${usage.gpu}%`,
        value: usage.gpu,
        threshold: thresholds.gpu!,
        timestamp: now
      });
    }

    // Storage alerts
    if (usage.storage >= thresholds.storage) {
      const severity = usage.storage >= 98 ? 'critical' : 'warning';
      this.createAlert({
        type: 'storage',
        severity,
        message: `High storage usage: ${usage.storage}%`,
        value: usage.storage,
        threshold: thresholds.storage,
        timestamp: now
      });
    }

    // Network alerts
    if (usage.network && !this.currentResources.network?.online) {
      this.createAlert({
        type: 'network',
        severity: 'warning',
        message: 'Network connection lost',
        value: 0,
        threshold: 1,
        timestamp: now
      });
    }
  }

  private createAlert(alert: ResourceAlert): void {
    // Check if similar alert already exists (within last minute)
    const recentAlert = this.alerts.find(existing =>
      existing.type === alert.type &&
      existing.severity === alert.severity &&
      (alert.timestamp - existing.timestamp) < 60000
    );

    if (!recentAlert) {
      this.alerts.push(alert);

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-50);
      }

      // Emit alert event
      this.emitEvent('resourceAlert', alert);
    }
  }

  private async detectSystemCapabilities(): Promise<void> {
    // Check if we're in a test environment or missing required APIs
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      console.log('[ResourceMonitor] Running in test environment, skipping capability detection');
      return;
    }

    try {
      // Detect WebGPU support
      const hasWebGPU = 'gpu' in navigator;
      if (hasWebGPU) {
        console.log('[ResourceMonitor] WebGPU support detected');
      }

      // Detect WebAssembly support
      const hasWasm = typeof WebAssembly === 'object';
      if (hasWasm) {
        console.log('[ResourceMonitor] WebAssembly support detected');
      }

      // Detect shared workers
      const hasSharedWorkers = typeof SharedWorker !== 'undefined';
      if (hasSharedWorkers) {
        console.log('[ResourceMonitor] Shared Workers support detected');
      }

      // Detect service workers
      const hasServiceWorkers = 'serviceWorker' in navigator;
      if (hasServiceWorkers) {
        console.log('[ResourceMonitor] Service Workers support detected');
      }

      // Detect various APIs safely
      let webgl = false;
      let webgl2 = false;

      try {
        // Check if we're in a test environment or if document/canvas is available
        if (typeof document !== 'undefined' && document.createElement) {
          const canvas = document.createElement('canvas');
          if (canvas && typeof canvas.getContext === 'function') {
            // Try-catch each getContext call individually
            try {
              webgl = !!canvas.getContext('webgl');
            } catch (e) {
              // WebGL not available
            }
            try {
              webgl2 = !!canvas.getContext('webgl2');
            } catch (e) {
              // WebGL2 not available
            }
          }
        }
      } catch (error) {
        console.warn('[ResourceMonitor] Canvas not available for WebGL detection:', error);
      }

      const capabilities = {
        webgpu: hasWebGPU,
        wasm: hasWasm,
        sharedWorkers: hasSharedWorkers,
        serviceWorkers: hasServiceWorkers,
        webgl,
        webgl2,
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        measureMemory: 'measureMemory' in performance
      };

      this.emitEvent('capabilitiesDetected', { capabilities, timestamp: Date.now() });
    } catch (error) {
      console.warn('[ResourceMonitor] Error during capability detection:', error);
    }
  }

  private getInitialResources(): SystemResources {
    return {
      totalMemory: 8192, // 8GB default
      availableMemory: 5734, // 70% available
      totalCPU: 400, // 4 cores * 100%
      availableCPU: 200, // 50% available
      totalGPU: undefined,
      availableGPU: undefined,
      totalStorage: 10000, // 10GB default
      availableStorage: 7000, // 70% available
      network: {
        online: navigator.onLine,
        bandwidth: 10, // 10 Mbps
        latency: 50, // 50ms
        reliability: 0.95
      }
    };
  }

  // Event system
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[ResourceMonitor] Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}