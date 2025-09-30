/**
 * Monitoring System Tests
 * Tests for the MonitoringSystem component which provides comprehensive monitoring and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest } from 'vitest';
import { MonitoringSystem, type MonitoringEvent, type AlertRule } from '../../services/ann/MonitoringSystem';

describe('MonitoringSystem', () => {
  let monitoringSystem: MonitoringSystem;
  let mockConfig: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockConfig = {
      collectionInterval: 1000,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      maxEvents: 1000,
      maxAlerts: 100,
      enableRealTimeMonitoring: true,
      enableAnalytics: true,
      enableReporting: true,
      alertRules: []
    };

    monitoringSystem = new MonitoringSystem(mockConfig);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await monitoringSystem.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(monitoringSystem).toBeDefined();
      const defaultConfig = MonitoringSystem['getDefaultConfig']();
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.collectionInterval).toBe(5000);
    });

    it('should start and stop successfully', async () => {
      await monitoringSystem.start();
      expect(monitoringSystem).toBeDefined();

      await monitoringSystem.stop();
      // Should not throw errors
    });

    it('should use singleton pattern', () => {
      const instance1 = MonitoringSystem.getInstance(mockConfig);
      const instance2 = MonitoringSystem.getInstance(mockConfig);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Management', () => {
    it('should record events with unique IDs', () => {
      const event1 = monitoringSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Test event',
        data: { test: 'data' },
        tags: ['test']
      });

      const event2 = monitoringSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Another test event',
        data: { test: 'data2' },
        tags: ['test']
      });

      expect(event1).not.toBe(event2);
      expect(typeof event1).toBe('string');
      expect(typeof event2).toBe('string');
    });

    it('should record events with proper structure', () => {
      const eventId = monitoringSystem.recordEvent({
        type: 'backend_health',
        level: 'warning',
        source: 'test-backend',
        message: 'Backend health warning',
        data: { cpu: 85, memory: 90 },
        tags: ['backend', 'health']
      });

      // Event should be stored with correct structure
      expect(eventId).toBeDefined();
    });

    it('should cleanup old events when exceeding maxEvents', () => {
      // Set small maxEvents for testing
      const smallConfig = { ...mockConfig, maxEvents: 2 };
      const smallSystem = new MonitoringSystem(smallConfig);

      // Add more events than maxEvents
      smallSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Event 1',
        data: {},
        tags: []
      });

      smallSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Event 2',
        data: {},
        tags: []
      });

      smallSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Event 3',
        data: {},
        tags: []
      });

      // Should have cleaned up old events
      expect(smallSystem).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should record metrics with timestamps', () => {
      const timestamp = Date.now();
      monitoringSystem.recordMetric('cpu_usage', 75.5, timestamp, { backend: 'tensorflowjs' });

      const data = monitoringSystem['metrics'].get('cpu_usage');
      expect(data).toBeDefined();
      expect(data!.length).toBe(1);
      expect(data![0].value).toBe(75.5);
      expect(data![0].timestamp).toBe(timestamp);
      expect(data![0].tags.backend).toBe('tensorflowjs');
    });

    it('should record metrics without explicit timestamp', () => {
      const beforeTime = Date.now();
      monitoringSystem.recordMetric('memory_usage', 60.2);
      const afterTime = Date.now();

      const data = monitoringSystem['metrics'].get('memory_usage');
      expect(data).toBeDefined();
      expect(data!.length).toBe(1);
      expect(data![0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(data![0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should cleanup old metrics data', () => {
      const oldConfig = { ...mockConfig, retentionPeriod: 1000, collectionInterval: 100 };
      const oldSystem = new MonitoringSystem(oldConfig);

      // Record old metric
      const oldTimestamp = Date.now() - 2000; // 2 seconds ago
      oldSystem.recordMetric('old_metric', 50, oldTimestamp);

      // Record new metric
      const newTimestamp = Date.now();
      oldSystem.recordMetric('new_metric', 75, newTimestamp);

      // Trigger cleanup
      oldSystem['cleanupOldData']();

      // Old metric should be cleaned up
      expect(oldSystem['metrics'].has('old_metric')).toBe(false);
      expect(oldSystem['metrics'].has('new_metric')).toBe(true);
    });
  });

  describe('Metrics Query', () => {
    beforeEach(() => {
      // Setup test data
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;

      monitoringSystem.recordMetric('cpu_usage', 50, hourAgo, { backend: 'tensorflowjs' });
      monitoringSystem.recordMetric('cpu_usage', 75, hourAgo + 30 * 60 * 1000, { backend: 'tensorflowjs' });
      monitoringSystem.recordMetric('cpu_usage', 60, now, { backend: 'pytorch' });
    });

    it('should query metrics within time range', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      const results = monitoringSystem.queryMetrics({
        metric: 'cpu_usage',
        startTime: twoHoursAgo,
        endTime: now
      });

      expect(results.length).toBe(3);
    });

    it('should apply filters to metrics query', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      const results = monitoringSystem.queryMetrics({
        metric: 'cpu_usage',
        startTime: twoHoursAgo,
        endTime: now,
        filters: { backend: 'tensorflowjs' }
      });

      expect(results.length).toBe(2);
      results.forEach(result => {
        expect(result.tags.backend).toBe('tensorflowjs');
      });
    });

    it('should aggregate metrics by interval', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      const results = monitoringSystem.queryMetrics({
        metric: 'cpu_usage',
        startTime: twoHoursAgo,
        endTime: now,
        interval: 30 * 60 * 1000, // 30 minutes
        aggregation: 'avg'
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Alert Management', () => {
    it('should add and remove alert rules', () => {
      const rule: AlertRule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        severity: 'warning',
        category: 'test',
        condition: (context) => context.test_value > 100,
        message: 'Test value is too high: {test_value}'
      };

      monitoringSystem.addAlertRule(rule);
      expect(monitoringSystem.getAlertRules().length).toBe(4); // 3 default + 1 test

      monitoringSystem.removeAlertRule('test_rule');
      expect(monitoringSystem.getAlertRules().length).toBe(3);
    });

    it('should trigger alerts when conditions are met', () => {
      const rule: AlertRule = {
        id: 'test_alert',
        name: 'Test Alert',
        description: 'Test alert condition',
        severity: 'warning',
        category: 'test',
        condition: (context) => context.test_value > 100,
        message: 'Test value exceeded threshold: {test_value}'
      };

      monitoringSystem.addAlertRule(rule);

      // Trigger alert condition
      monitoringSystem['createAlert'](rule, { test_value: 150, source: 'test' });

      const recentAlerts = monitoringSystem.getRecentAlerts(60 * 60 * 1000); // 1 hour
      const testAlert = recentAlerts.find(alert => alert.ruleId === 'test_alert');

      expect(testAlert).toBeDefined();
      expect(testAlert?.severity).toBe('warning');
      expect(testAlert?.message).toContain('Test value exceeded threshold');
    });

    it('should cleanup old alerts', () => {
      const oldConfig = { ...mockConfig, maxAlerts: 2, retentionPeriod: 1000 };
      const oldSystem = new MonitoringSystem(oldConfig);

      // Add old alerts
      oldSystem['alerts'].push({
        id: 'old_alert',
        ruleId: 'test',
        severity: 'warning',
        message: 'Old alert',
        timestamp: Date.now() - 2000,
        source: 'test',
        data: {},
        acknowledged: false,
        resolved: false
      });

      // Add new alert
      oldSystem['alerts'].push({
        id: 'new_alert',
        ruleId: 'test',
        severity: 'warning',
        message: 'New alert',
        timestamp: Date.now(),
        source: 'test',
        data: {},
        acknowledged: false,
        resolved: false
      });

      // Trigger cleanup
      oldSystem['cleanupOldData']();

      // Should keep only recent alerts
      expect(oldSystem['alerts'].length).toBeLessThanOrEqual(2);
    });
  });

  describe('Analytics and Insights', () => {
    it('should generate insights with all required components', () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      // Add some test data
      monitoringSystem.recordMetric('cpu_usage', 50, dayAgo);
      monitoringSystem.recordMetric('memory_usage', 60, dayAgo);
      monitoringSystem.recordMetric('task_throughput', 100, dayAgo);
      monitoringSystem.recordMetric('task_latency', 200, dayAgo);

      const insights = monitoringSystem.generateInsights({ start: dayAgo, end: now });

      expect(insights.system).toBeDefined();
      expect(insights.performance).toBeDefined();
      expect(insights.health).toBeDefined();
      expect(insights.trends).toBeDefined();
      expect(insights.anomalies).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(insights.efficiency).toBeDefined();
      expect(insights.reliability).toBeDefined();
    });

    it('should generate dashboard data', () => {
      const dashboardData = monitoringSystem.getDashboardData();

      expect(dashboardData.summary).toBeDefined();
      expect(dashboardData.metrics).toBeDefined();
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.health).toBeDefined();
      expect(dashboardData.trends).toBeDefined();

      expect(dashboardData.summary.totalBackends).toBe(3);
      expect(dashboardData.summary.systemHealth).toBe('healthy');
    });

    it('should calculate efficiency metrics', () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      monitoringSystem.recordMetric('task_throughput', 1000, dayAgo);
      monitoringSystem.recordMetric('memory_usage', 50, dayAgo);
      monitoringSystem.recordMetric('task_latency', 200, dayAgo);

      const insights = monitoringSystem.generateInsights({ start: dayAgo, end: now });

      expect(insights.efficiency.resource_efficiency).toBeGreaterThan(0);
      expect(insights.efficiency.cost_efficiency).toBeGreaterThan(0);
      expect(insights.efficiency.time_efficiency).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate monitoring reports', () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const report = monitoringSystem.generateReport(
        'Daily Performance Report',
        'System performance metrics for the last 24 hours',
        { start: dayAgo, end: now }
      );

      expect(report.id).toBeDefined();
      expect(report.title).toBe('Daily Performance Report');
      expect(report.description).toBe('System performance metrics for the last 24 hours');
      expect(report.generatedAt).toBeDefined();
      expect(report.period).toEqual({ start: dayAgo, end: now });
      expect(report.sections).toBeDefined();
      expect(report.visualizations).toBeDefined();
    });

    it('should include all required sections in report', () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      const report = monitoringSystem.generateReport(
        'Test Report',
        'Test description',
        { start: dayAgo, end: now }
      );

      expect(report.sections.summary).toBeDefined();
      expect(report.sections.performance).toBeDefined();
      expect(report.sections.health).toBeDefined();
      expect(report.sections.alerts).toBeDefined();
      expect(report.sections.recommendations).toBeDefined();

      expect(report.visualizations.charts).toBeDefined();
      expect(report.visualizations.tables).toBeDefined();
    });
  });

  describe('Subscription Management', () => {
    it('should allow event subscriptions', () => {
      const mockCallback = vi.fn();
      const subscriptionId = monitoringSystem.subscribe('backend_health', mockCallback);

      expect(typeof subscriptionId).toBe('string');
      expect(subscriptionId).toContain('sub_');
    });

    it('should notify subscribers of events', () => {
      const mockCallback = vi.fn();
      monitoringSystem.subscribe('backend_health', mockCallback);

      monitoringSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Test event',
        data: {},
        tags: []
      });

      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'backend_health',
          message: 'Test event'
        })
      );
    });

    it('should allow unsubscribe', () => {
      const mockCallback = vi.fn();
      const subscriptionId = monitoringSystem.subscribe('backend_health', mockCallback);

      monitoringSystem.unsubscribe(subscriptionId);

      // Should not notify after unsubscribe
      monitoringSystem.recordEvent({
        type: 'backend_health',
        level: 'info',
        source: 'test',
        message: 'Test event',
        data: {},
        tags: []
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle subscriber callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      monitoringSystem.subscribe('backend_health', errorCallback);

      // Should not throw when callback errors
      expect(() => {
        monitoringSystem.recordEvent({
          type: 'backend_health',
          level: 'info',
          source: 'test',
          message: 'Test event',
          data: {},
          tags: []
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Data Collection', () => {
    it('should start automatic data collection', async () => {
      await monitoringSystem.start();

      // Advance timers to trigger collection
      await vi.advanceTimersByTimeAsync(1500);

      // Should have collected some metrics
      const cpuMetrics = monitoringSystem['metrics'].get('cpu_usage');
      expect(cpuMetrics).toBeDefined();
      expect(cpuMetrics!.length).toBeGreaterThan(0);
    });

    it('should stop data collection when stopped', async () => {
      await monitoringSystem.start();
      await vi.advanceTimersByTimeAsync(1500);

      await monitoringSystem.stop();

      // Clear metrics and check if collection stopped
      monitoringSystem['metrics'].clear();

      await vi.advanceTimersByTimeAsync(1500);

      // Should not have new metrics
      expect(monitoringSystem['metrics'].get('cpu_usage')).toBeUndefined();
    });
  });

  describe('Alert Rule Evaluation', () => {
    it('should evaluate alert rules correctly', () => {
      const rule: AlertRule = {
        id: 'evaluation_test',
        name: 'Evaluation Test',
        description: 'Test rule evaluation',
        severity: 'warning',
        category: 'test',
        condition: (context) => context.value > 50,
        message: 'Value exceeded threshold: {value}'
      };

      monitoringSystem.addAlertRule(rule);

      // Test condition met
      const context1 = { value: 75 };
      expect(monitoringSystem['evaluateAlertRule'](rule, context1)).toBe(true);

      // Test condition not met
      const context2 = { value: 25 };
      expect(monitoringSystem['evaluateAlertRule'](rule, context2)).toBe(false);
    });

    it('should handle evaluation errors gracefully', () => {
      const rule: AlertRule = {
        id: 'error_test',
        name: 'Error Test',
        description: 'Test error handling',
        severity: 'warning',
        category: 'test',
        condition: (context) => {
          throw new Error('Evaluation error');
        },
        message: 'Error in evaluation'
      };

      monitoringSystem.addAlertRule(rule);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = monitoringSystem['evaluateAlertRule'](rule, { value: 50 });
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Default Alert Rules', () => {
    it('should initialize with default alert rules', () => {
      const rules = monitoringSystem.getAlertRules();
      expect(rules.length).toBe(3);

      const ruleNames = rules.map(r => r.name);
      expect(ruleNames).toContain('High CPU Usage');
      expect(ruleNames).toContain('High Memory Usage');
      expect(ruleNames).toContain('High Error Rate');
    });

    it('should have proper default rule configurations', () => {
      const rules = monitoringSystem.getAlertRules();

      rules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.severity).toMatch(/info|warning|error|critical/);
        expect(rule.category).toBeDefined();
        expect(typeof rule.condition).toBe('function');
        expect(rule.message).toBeDefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large volumes of events', () => {
      const largeConfig = { ...mockConfig, maxEvents: 10000 };
      const largeSystem = new MonitoringSystem(largeConfig);

      // Add many events
      for (let i = 0; i < 5000; i++) {
        largeSystem.recordEvent({
          type: 'backend_health',
          level: 'info',
          source: 'test',
          message: `Event ${i}`,
          data: { index: i },
          tags: ['test']
        });
      }

      expect(largeSystem).toBeDefined();
    });

    it('should handle large volumes of metrics', () => {
      // Add many metric points
      const now = Date.now();
      for (let i = 0; i < 1000; i++) {
        monitoringSystem.recordMetric('test_metric', i, now - i * 1000);
      }

      const data = monitoringSystem['metrics'].get('test_metric');
      expect(data).toBeDefined();
      expect(data!.length).toBe(1000);
    });
  });
});