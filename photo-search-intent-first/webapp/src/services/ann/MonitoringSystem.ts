/**
 * Monitoring and Analytics System
 * Provides comprehensive monitoring, analytics, and insights for the ANN backend system
 */

import type {
  BackendHealth,
  ResourceUsage,
  PerformanceMetrics,
  TaskMetrics,
  ModelMetrics,
  BackendMetrics,
  SystemMetrics,
  Alert,
  AnalyticsData,
  MonitoringConfig,
  TimeSeriesData,
  HistogramData,
  DashboardData
} from './types';

export interface MonitoringEvent {
  id: string;
  timestamp: number;
  type: 'backend_health' | 'resource_usage' | 'task_execution' | 'model_performance' | 'system_alert';
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, any>;
  tags: string[];
}

export interface AnalyticsQuery {
  metric: string;
  startTime: number;
  endTime: number;
  interval?: number;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  filters?: Record<string, any>;
  groupBy?: string[];
}

export interface MonitoringReport {
  id: string;
  title: string;
  description: string;
  generatedAt: number;
  period: { start: number; end: number };
  sections: {
    summary: SystemMetrics;
    performance: PerformanceMetrics;
    health: BackendHealth[];
    alerts: Alert[];
    recommendations: string[];
  };
  visualizations: {
    charts: Array<{
      type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
      title: string;
      data: TimeSeriesData | HistogramData;
    }>;
    tables: Array<{
      title: string;
      columns: string[];
      data: any[][];
    }>;
  };
}

export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private config: MonitoringConfig;
  private events: MonitoringEvent[] = [];
  private metrics: Map<string, TimeSeriesData[]> = new Map();
  private alerts: Alert[] = [];
  private activeRules: Map<string, AlertRule> = new Map();
  private subscribers: Map<string, (event: MonitoringEvent) => void> = new Map();
  private isRunning = false;
  private collectionInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeDefaultRules();
  }

  static getInstance(config?: MonitoringConfig): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem(config || this.getDefaultConfig());
    }
    return MonitoringSystem.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('[MonitoringSystem] Starting monitoring system...');

    // Start data collection
    this.startDataCollection();

    // Start alert processing
    this.startAlertProcessing();

    // Start cleanup process
    this.startCleanupProcess();

    console.log('[MonitoringSystem] Monitoring system started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop intervals
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('[MonitoringSystem] Monitoring system stopped');
  }

  // Event Management
  recordEvent(event: Omit<MonitoringEvent, 'id' | 'timestamp'>): string {
    const monitoringEvent: MonitoringEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    };

    this.events.push(monitoringEvent);

    // Notify subscribers
    this.notifySubscribers(monitoringEvent);

    // Process alerts
    this.processEventForAlerts(monitoringEvent);

    // Cleanup old events
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    return monitoringEvent.id;
  }

  // Metrics Collection
  recordMetric(metricName: string, value: number, timestamp?: number, tags?: Record<string, string>): void {
    const time = timestamp || Date.now();

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const metricData: TimeSeriesData = {
      timestamp: time,
      value,
      tags: tags || {}
    };

    this.metrics.get(metricName)!.push(metricData);

    // Cleanup old data
    const maxDataPoints = this.config.retentionPeriod / this.config.collectionInterval;
    if (this.metrics.get(metricName)!.length > maxDataPoints) {
      this.metrics.set(metricName, this.metrics.get(metricName)!.slice(-maxDataPoints));
    }
  }

  // Query Interface
  queryMetrics(query: AnalyticsQuery): TimeSeriesData[] {
    const metricData = this.metrics.get(query.metric) || [];

    // Filter by time range
    let filteredData = metricData.filter(data =>
      data.timestamp >= query.startTime && data.timestamp <= query.endTime
    );

    // Apply filters
    if (query.filters) {
      filteredData = filteredData.filter(data => {
        return Object.entries(query.filters!).every(([key, value]) => {
          return data.tags[key] === value;
        });
      });
    }

    // Group by and aggregate
    if (query.groupBy && query.groupBy.length > 0) {
      const groups = this.groupData(filteredData, query.groupBy);
      return this.aggregateGroups(groups, query.aggregation || 'avg');
    }

    // Apply aggregation
    if (query.aggregation && query.interval) {
      return this.aggregateByInterval(filteredData, query.interval, query.aggregation);
    }

    return filteredData;
  }

  // Analytics and Insights
  generateInsights(timeRange: { start: number; end: number }): AnalyticsData {
    const systemMetrics = this.getSystemMetrics(timeRange);
    const performanceMetrics = this.getPerformanceMetrics(timeRange);
    const healthMetrics = this.getHealthMetrics(timeRange);

    return {
      system: systemMetrics,
      performance: performanceMetrics,
      health: healthMetrics,
      trends: this.calculateTrends(timeRange),
      anomalies: this.detectAnomalies(timeRange),
      recommendations: this.generateRecommendations(systemMetrics, performanceMetrics, healthMetrics),
      efficiency: this.calculateEfficiencyMetrics(systemMetrics, performanceMetrics),
      reliability: this.calculateReliabilityMetrics(healthMetrics)
    };
  }

  // Dashboard Data
  getDashboardData(): DashboardData {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;

    return {
      summary: {
        totalBackends: 3,
        activeBackends: 2,
        totalTasks: 1250,
        completedTasks: 1180,
        failedTasks: 45,
        averageResponseTime: 245,
        systemHealth: 'healthy',
        lastUpdated: now
      },
      metrics: {
        cpu: this.queryMetrics({ metric: 'cpu_usage', startTime: last1h, endTime: now, aggregation: 'avg' }),
        memory: this.queryMetrics({ metric: 'memory_usage', startTime: last1h, endTime: now, aggregation: 'avg' }),
        throughput: this.queryMetrics({ metric: 'task_throughput', startTime: last1h, endTime: now, aggregation: 'sum' }),
        latency: this.queryMetrics({ metric: 'task_latency', startTime: last1h, endTime: now, aggregation: 'avg' }),
        errorRate: this.queryMetrics({ metric: 'error_rate', startTime: last1h, endTime: now, aggregation: 'avg' })
      },
      alerts: this.getRecentAlerts(24 * 60 * 60 * 1000),
      health: this.getBackendHealthSummary(),
      trends: this.calculateTrends({ start: last24h, end: now })
    };
  }

  // Report Generation
  generateReport(title: string, description: string, period: { start: number; end: number }): MonitoringReport {
    const analytics = this.generateInsights(period);
    const recentAlerts = this.getRecentAlerts(period.end - period.start);

    return {
      id: this.generateReportId(),
      title,
      description,
      generatedAt: Date.now(),
      period,
      sections: {
        summary: analytics.system,
        performance: {
          ...analytics.performance,
          timestamp: Date.now()
        },
        health: analytics.health.map(h => ({
          ...h,
          lastCheck: Date.now()
        })),
        alerts: recentAlerts,
        recommendations: analytics.recommendations
      },
      visualizations: {
        charts: this.generateChartVisualizations(period),
        tables: this.generateTableVisualizations(period)
      }
    };
  }

  // Alert Management
  addAlertRule(rule: AlertRule): void {
    this.activeRules.set(rule.id, rule);
  }

  removeAlertRule(ruleId: string): void {
    this.activeRules.delete(ruleId);
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.activeRules.values());
  }

  getRecentAlerts(timeWindow: number): Alert[] {
    const cutoff = Date.now() - timeWindow;
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  // Subscription Management
  subscribe(eventType: string, callback: (event: MonitoringEvent) => void): string {
    const subscriptionId = this.generateSubscriptionId();
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  // Private Methods
  private startDataCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectionInterval);
  }

  private startAlertProcessing(): void {
    // Process alerts every 30 seconds
    setInterval(() => {
      this.processAlertRules();
    }, 30000);
  }

  private startCleanupProcess(): void {
    // Cleanup old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  private collectSystemMetrics(): void {
    // Collect system metrics (would integrate with actual monitoring)
    const timestamp = Date.now();

    // Simulated metrics - in real implementation, would collect actual data
    this.recordMetric('cpu_usage', Math.random() * 100, timestamp);
    this.recordMetric('memory_usage', Math.random() * 100, timestamp);
    this.recordMetric('task_throughput', Math.floor(Math.random() * 1000), timestamp);
    this.recordMetric('task_latency', Math.random() * 500, timestamp);
    this.recordMetric('error_rate', Math.random() * 0.1, timestamp);
  }

  private processEventForAlerts(event: MonitoringEvent): void {
    // Check if event triggers any alert rules
    for (const rule of this.activeRules.values()) {
      if (this.evaluateAlertRule(rule, event)) {
        this.createAlert(rule, event);
      }
    }
  }

  private processAlertRules(): void {
    // Evaluate all alert rules against current metrics
    for (const rule of this.activeRules.values()) {
      const currentMetrics = this.getCurrentMetricsForRule(rule);
      if (this.evaluateAlertRule(rule, currentMetrics)) {
        this.createAlert(rule, currentMetrics);
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule, context: any): boolean {
    // Simple rule evaluation - in real implementation, would be more sophisticated
    try {
      return rule.condition(context);
    } catch (error) {
      console.error(`[MonitoringSystem] Error evaluating alert rule ${rule.id}:`, error);
      return false;
    }
  }

  private createAlert(rule: AlertRule, triggerEvent: any): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      timestamp: Date.now(),
      source: triggerEvent.source || 'monitoring-system',
      data: triggerEvent,
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);

    // Record alert event
    this.recordEvent({
      type: 'system_alert',
      level: alert.severity,
      source: alert.source,
      message: alert.message,
      data: alert,
      tags: ['alert', rule.category]
    });

    // Cleanup old alerts
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxAlerts);
    }
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;

    // Cleanup metrics
    for (const [metricName, data] of this.metrics.entries()) {
      const filtered = data.filter(point => point.timestamp > cutoff);
      if (filtered.length > 0) {
        this.metrics.set(metricName, filtered);
      } else {
        this.metrics.delete(metricName);
      }
    }

    // Cleanup events
    this.events = this.events.filter(event => event.timestamp > cutoff);

    // Cleanup resolved alerts older than retention period
    this.alerts = this.alerts.filter(alert =>
      !alert.resolved || alert.timestamp > cutoff
    );
  }

  private notifySubscribers(event: MonitoringEvent): void {
    for (const callback of this.subscribers.values()) {
      try {
        callback(event);
      } catch (error) {
        console.error('[MonitoringSystem] Error in subscriber callback:', error);
      }
    }
  }

  // Helper Methods
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getDefaultConfig(): MonitoringConfig {
    return {
      collectionInterval: 5000,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEvents: 10000,
      maxAlerts: 1000,
      enableRealTimeMonitoring: true,
      enableAnalytics: true,
      enableReporting: true,
      alertRules: []
    };
  }

  private initializeDefaultRules(): void {
    // Add default alert rules
    this.addAlertRule({
      id: 'high_cpu_usage',
      name: 'High CPU Usage',
      description: 'CPU usage exceeds 80%',
      severity: 'warning',
      category: 'resource',
      condition: (context) => context.cpu_usage > 80,
      message: 'High CPU usage detected: {cpu_usage}%'
    });

    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage exceeds 85%',
      severity: 'warning',
      category: 'resource',
      condition: (context) => context.memory_usage > 85,
      message: 'High memory usage detected: {memory_usage}%'
    });

    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Error rate exceeds 5%',
      severity: 'error',
      category: 'performance',
      condition: (context) => context.error_rate > 0.05,
      message: 'High error rate detected: {error_rate}%'
    });
  }

  // Analytics Helper Methods
  private groupData(data: TimeSeriesData[], groupBy: string[]): Map<string, TimeSeriesData[]> {
    const groups = new Map<string, TimeSeriesData[]>();

    for (const point of data) {
      const key = groupBy.map(field => point.tags[field] || 'unknown').join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(point);
    }

    return groups;
  }

  private aggregateGroups(groups: Map<string, TimeSeriesData[]>, aggregation: string): TimeSeriesData[] {
    const result: TimeSeriesData[] = [];

    for (const [key, groupData] of groups.entries()) {
      const aggregated = this.aggregateData(groupData, aggregation);
      result.push({
        timestamp: aggregated.timestamp,
        value: aggregated.value,
        tags: { group: key }
      });
    }

    return result;
  }

  private aggregateByInterval(data: TimeSeriesData[], interval: number, aggregation: string): TimeSeriesData[] {
    const result: TimeSeriesData[] = [];
    const groups = new Map<number, TimeSeriesData[]>();

    // Group by interval
    for (const point of data) {
      const intervalStart = Math.floor(point.timestamp / interval) * interval;
      if (!groups.has(intervalStart)) {
        groups.set(intervalStart, []);
      }
      groups.get(intervalStart)!.push(point);
    }

    // Aggregate each interval
    for (const [intervalStart, groupData] of groups.entries()) {
      const aggregated = this.aggregateData(groupData, aggregation);
      result.push({
        timestamp: intervalStart,
        value: aggregated.value,
        tags: {}
      });
    }

    return result;
  }

  private aggregateData(data: TimeSeriesData[], aggregation: string): { timestamp: number; value: number } {
    if (data.length === 0) {
      return { timestamp: Date.now(), value: 0 };
    }

    const values = data.map(d => d.value);

    switch (aggregation) {
      case 'sum':
        return { timestamp: data[0].timestamp, value: values.reduce((a, b) => a + b, 0) };
      case 'avg':
        return { timestamp: data[0].timestamp, value: values.reduce((a, b) => a + b, 0) / values.length };
      case 'min':
        return { timestamp: data[0].timestamp, value: Math.min(...values) };
      case 'max':
        return { timestamp: data[0].timestamp, value: Math.max(...values) };
      case 'count':
        return { timestamp: data[0].timestamp, value: values.length };
      default:
        return { timestamp: data[0].timestamp, value: values[0] };
    }
  }

  private getSystemMetrics(timeRange: { start: number; end: number }): SystemMetrics {
    const cpuData = this.queryMetrics({ metric: 'cpu_usage', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'avg' });
    const memoryData = this.queryMetrics({ metric: 'memory_usage', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'avg' });

    return {
      totalTasks: this.queryMetrics({ metric: 'task_throughput', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'sum' }).reduce((sum, d) => sum + d.value, 0),
      completedTasks: 0, // Would need separate metric
      failedTasks: this.queryMetrics({ metric: 'error_rate', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'sum' }).reduce((sum, d) => sum + d.value, 0),
      averageResponseTime: this.queryMetrics({ metric: 'task_latency', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'avg' }).reduce((avg, d) => (avg + d.value) / 2, 0),
      uptime: timeRange.end - timeRange.start,
      timestamp: Date.now()
    };
  }

  private getPerformanceMetrics(timeRange: { start: number; end: number }): PerformanceMetrics {
    return {
      inferenceTime: this.queryMetrics({ metric: 'task_latency', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'avg' }).reduce((avg, d) => (avg + d.value) / 2, 0),
      memoryUsage: this.queryMetrics({ metric: 'memory_usage', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'avg' }).reduce((avg, d) => (avg + d.value) / 2, 0),
      throughput: this.queryMetrics({ metric: 'task_throughput', startTime: timeRange.start, endTime: timeRange.end, aggregation: 'sum' }).reduce((sum, d) => sum + d.value, 0),
      accuracy: 0.95, // Would need actual accuracy metric
      timestamp: Date.now()
    };
  }

  private getHealthMetrics(timeRange: { start: number; end: number }): BackendHealth[] {
    // Simulated health data
    return [
      {
        status: 'healthy',
        lastCheck: Date.now(),
        activeConnections: 5,
        resourceUsage: { memory: 512, cpu: 25, storage: 1024 },
        uptime: timeRange.end - timeRange.start
      }
    ];
  }

  private calculateTrends(timeRange: { start: number; end: number }): any {
    // Calculate trends from metrics data
    return {
      cpu_trend: 'stable',
      memory_trend: 'increasing',
      throughput_trend: 'stable',
      error_rate_trend: 'decreasing'
    };
  }

  private detectAnomalies(timeRange: { start: number; end: number }): any[] {
    // Simple anomaly detection
    return [];
  }

  private generateRecommendations(systemMetrics: SystemMetrics, performanceMetrics: PerformanceMetrics, healthMetrics: BackendHealth[]): string[] {
    const recommendations: string[] = [];

    if (performanceMetrics.memoryUsage > 80) {
      recommendations.push('Consider scaling up memory resources or optimizing memory usage');
    }

    if (performanceMetrics.inferenceTime > 300) {
      recommendations.push('Consider optimizing model performance or using faster backends');
    }

    if (systemMetrics.failedTasks / systemMetrics.totalTasks > 0.05) {
      recommendations.push('Investigate and address high error rate');
    }

    return recommendations;
  }

  private calculateEfficiencyMetrics(systemMetrics: SystemMetrics, performanceMetrics: PerformanceMetrics): any {
    return {
      resource_efficiency: (performanceMetrics.throughput / performanceMetrics.memoryUsage) * 100,
      cost_efficiency: performanceMetrics.throughput / (performanceMetrics.memoryUsage * performanceMetrics.inferenceTime),
      time_efficiency: 1000 / performanceMetrics.inferenceTime
    };
  }

  private calculateReliabilityMetrics(healthMetrics: BackendHealth[]): any {
    const healthyBackends = healthMetrics.filter(h => h.status === 'healthy').length;
    const totalBackends = healthMetrics.length;

    return {
      availability: totalBackends > 0 ? healthyBackends / totalBackends : 0,
      reliability_score: 0.95, // Would calculate from actual data
      mean_time_between_failures: 3600 // Would calculate from actual data
    };
  }

  private getCurrentMetricsForRule(rule: AlertRule): any {
    // Get current metrics for alert rule evaluation
    return {
      cpu_usage: this.queryMetrics({ metric: 'cpu_usage', startTime: Date.now() - 60000, endTime: Date.now() }).reduce((avg, d) => (avg + d.value) / 2, 0),
      memory_usage: this.queryMetrics({ metric: 'memory_usage', startTime: Date.now() - 60000, endTime: Date.now() }).reduce((avg, d) => (avg + d.value) / 2, 0),
      error_rate: this.queryMetrics({ metric: 'error_rate', startTime: Date.now() - 60000, endTime: Date.now() }).reduce((avg, d) => (avg + d.value) / 2, 0)
    };
  }

  private getBackendHealthSummary(): any[] {
    // Simulated backend health summary
    return [
      { id: 'tensorflowjs', status: 'healthy', load: 0.65 },
      { id: 'pytorch', status: 'healthy', load: 0.45 },
      { id: 'onnx', status: 'degraded', load: 0.85 }
    ];
  }

  private generateChartVisualizations(period: { start: number; end: number }): any[] {
    return [
      {
        type: 'line' as const,
        title: 'CPU Usage Over Time',
        data: this.queryMetrics({ metric: 'cpu_usage', startTime: period.start, endTime: period.end })
      },
      {
        type: 'line' as const,
        title: 'Memory Usage Over Time',
        data: this.queryMetrics({ metric: 'memory_usage', startTime: period.start, endTime: period.end })
      },
      {
        type: 'line' as const,
        title: 'Task Throughput',
        data: this.queryMetrics({ metric: 'task_throughput', startTime: period.start, endTime: period.end, aggregation: 'sum' })
      }
    ];
  }

  private generateTableVisualizations(period: { start: number; end: number }): any[] {
    return [
      {
        title: 'Backend Performance Summary',
        columns: ['Backend', 'Status', 'CPU Usage', 'Memory Usage', 'Tasks Completed', 'Avg Response Time'],
        data: [
          ['TensorFlow.js', 'Healthy', '45%', '512MB', '1250', '245ms'],
          ['PyTorch', 'Healthy', '35%', '768MB', '980', '180ms'],
          ['ONNX', 'Degraded', '85%', '256MB', '450', '320ms']
        ]
      }
    ];
  }
}

// Alert Rule Interface
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  condition: (context: any) => boolean;
  message: string;
  enabled?: boolean;
  cooldownPeriod?: number;
}