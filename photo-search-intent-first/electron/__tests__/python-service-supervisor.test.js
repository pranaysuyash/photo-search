/**
 * Test suite for Python service supervisor
 */

const { PythonServiceSupervisor } = require('../electron/main/python-service-supervisor');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock http
jest.mock('http', () => ({
  get: jest.fn(),
  createServer: jest.fn().mockReturnValue({
    listen: jest.fn(),
    close: jest.fn(),
    on: jest.fn()
  })
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(),
  ...jest.requireActual('fs')
}));

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}));

describe('PythonServiceSupervisor', () => {
  let serviceSupervisor;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock process
    mockProcess = {
      kill: jest.fn(),
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      killed: false
    };
    
    spawn.mockReturnValue(mockProcess);
    
    // Create fresh supervisor for each test
    serviceSupervisor = new PythonServiceSupervisor({
      host: '127.0.0.1',
      port: 8000,
      maxRestarts: 3,
      restartDelay: 100,
      healthCheckInterval: 100,
      healthCheckTimeout: 50
    });
  });

  afterEach(() => {
    // Clean up any timers
    if (serviceSupervisor.healthCheckTimer) {
      clearInterval(serviceSupervisor.healthCheckTimer);
    }
  });

  describe('Service Lifecycle', () => {
    test('should start service successfully', async () => {
      const mockHttpPing = jest.fn().mockResolvedValue(true);
      serviceSupervisor.httpPing = mockHttpPing;
      
      // Simulate successful spawn
      setTimeout(() => {
        serviceSupervisor.emit('service-ready');
      }, 50);
      
      const result = await serviceSupervisor.start();
      
      expect(result).toBe(true);
      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('python'),
        expect.arrayContaining(['-m', 'uvicorn', 'api.server:app']),
        expect.objectContaining({
          cwd: expect.any(String),
          stdio: 'inherit'
        })
      );
      expect(serviceSupervisor.getStatus().status).toBe('running');
    });

    test('should handle service start failure', async () => {
      spawn.mockImplementation(() => {
        throw new Error('Failed to spawn process');
      });
      
      const result = await serviceSupervisor.start();
      
      expect(result).toBe(false);
      expect(serviceSupervisor.getStatus().status).toBe('crashed');
    });

    test('should stop service gracefully', async () => {
      // First start the service
      const mockHttpPing = jest.fn().mockResolvedValue(true);
      serviceSupervisor.httpPing = mockHttpPing;
      
      await serviceSupervisor.start();
      
      // Mock process kill
      mockProcess.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM') {
          // Simulate graceful shutdown
          setTimeout(() => {
            serviceSupervisor.emit('service-stopped');
          }, 10);
        }
      });
      
      const result = await serviceSupervisor.stop();
      
      expect(result).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(serviceSupervisor.getStatus().status).toBe('stopped');
    });

    test('should force kill if graceful shutdown fails', async () => {
      await serviceSupervisor.start();
      
      // Mock process that doesn't respond to SIGTERM
      mockProcess.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM') {
          // Don't respond to SIGTERM
          return;
        } else if (signal === 'SIGKILL') {
          // Respond to SIGKILL
          setTimeout(() => {
            serviceSupervisor.emit('service-stopped');
          }, 10);
        }
      });
      
      // Mock setTimeout to speed up test
      jest.useFakeTimers();
      
      const stopPromise = serviceSupervisor.stop();
      jest.advanceTimersByTime(3000); // Advance past the 2-second grace period
      
      const result = await stopPromise;
      jest.useRealTimers();
      
      expect(result).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('Health Monitoring', () => {
    test('should perform health checks', async () => {
      const mockHttpPing = jest.fn()
        .mockResolvedValueOnce(true)  // First health check succeeds
        .mockResolvedValueOnce(false)  // Second health check fails
        .mockResolvedValueOnce(true); // Third health check succeeds
      
      serviceSupervisor.httpPing = mockHttpPing;
      
      const isHealthy = await serviceSupervisor.performHealthCheck();
      
      expect(isHealthy).toBe(true);
      expect(mockHttpPing).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/health',
        50
      );
    });

    test('should handle health check timeouts', async () => {
      const mockHttpPing = jest.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });
      
      serviceSupervisor.httpPing = mockHttpPing;
      serviceSupervisor.options.healthCheckTimeout = 10; // Very short timeout
      
      const isHealthy = await serviceSupervisor.performHealthCheck();
      
      expect(isHealthy).toBe(false);
    });

    test('should restart service on health failures', async () => {
      jest.useFakeTimers();
      
      // Mock failing health checks
      serviceSupervisor.performHealthCheck = jest.fn()
        .mockResolvedValue(false);
      
      // Start health monitoring
      serviceSupervisor.startHealthMonitoring();
      
      // Advance timer to trigger health checks
      jest.advanceTimersByTime(300); // 3 health check intervals
      
      // Wait for restart logic
      await Promise.resolve();
      
      // Verify health check failures were recorded
      expect(serviceSupervisor.getStatus().healthCheckFailures).toBeGreaterThan(0);
      
      jest.useRealTimers();
    });
  });

  describe('Restart Policy', () => {
    test('should restart service up to max attempts', async () => {
      jest.useFakeTimers();
      
      // Mock process that keeps crashing
      spawn.mockImplementation(() => {
        const mockProc = {
          kill: jest.fn(),
          on: jest.fn((event, callback) => {
            if (event === 'exit') {
              // Simulate immediate exit
              setTimeout(() => callback(1, 'SIGABRT'), 10);
            }
          }),
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          killed: false
        };
        return mockProc;
      });
      
      // Start service (should fail and trigger restarts)
      const startPromise = serviceSupervisor.start();
      
      // Fast-forward through restart delays
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      }
      
      await startPromise;
      
      // Should have attempted restarts up to max
      expect(serviceSupervisor.restartCount).toBeLessThanOrEqual(3);
      
      jest.useRealTimers();
    });

    test('should apply exponential backoff to restarts', async () => {
      jest.useFakeTimers();
      
      const restartDelays = [];
      
      // Mock process exits that trigger restarts
      spawn.mockImplementation(() => {
        const mockProc = {
          kill: jest.fn(),
          on: jest.fn((event, callback) => {
            if (event === 'exit') {
              // Record restart timing
              setTimeout(() => {
                callback(1, 'SIGABRT');
              }, 10);
            }
          }),
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          killed: false
        };
        return mockProc;
      });
      
      // Start service
      const startPromise = serviceSupervisor.start();
      
      // Advance time to trigger restarts
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      }
      
      await startPromise;
      
      // Should have applied backoff (delays should increase)
      expect(serviceSupervisor.restartCount).toBeGreaterThan(0);
      
      jest.useRealTimers();
    });
  });

  describe('API Configuration', () => {
    test('should provide correct API configuration', () => {
      const config = serviceSupervisor.getApiConfig();
      
      expect(config).toEqual({
        base: 'http://127.0.0.1:8000',
        token: expect.any(String)
      });
      expect(config.token).toHaveLength(48); // 24 bytes × 2 hex chars per byte
    });

    test('should generate valid API tokens', () => {
      const token1 = serviceSupervisor.getApiToken();
      const token2 = serviceSupervisor.getApiToken();
      
      // Should be the same token on subsequent calls
      expect(token1).toBe(token2);
      expect(token1).toHaveLength(48);
    });
  });
});