/**
 * Python Service Supervisor for Electron Main Process
 * Implements robust service lifecycle management with health monitoring and auto-restart
 */

const { spawn } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

class PythonServiceSupervisor {
  constructor(options = {}) {
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port || 8000,
      maxRestarts: options.maxRestarts || 5,
      restartDelay: options.restartDelay || 5000, // 5 seconds
      healthCheckInterval: options.healthCheckInterval || 10000, // 10 seconds
      healthCheckTimeout: options.healthCheckTimeout || 5000, // 5 seconds
      cwd: options.cwd || path.resolve(__dirname, '..'),
      pythonPath: options.pythonPath || this.getDefaultPythonPath(),
      logLevel: options.logLevel || 'info',
      enableProdLogging: options.enableProdLogging || false,
      ...options
    };
    
    this.serviceProcess = null;
    this.restartCount = 0;
    this.healthCheckTimer = null;
    this.isShuttingDown = false;
    this.apiToken = null;
    this.status = 'stopped'; // stopped, starting, running, stopping, crashed, unhealthy
    this.lastHealthCheck = null;
    this.healthCheckFailures = 0;
    this.maxHealthCheckFailures = 3;
    
    // Event emitters for status changes
    this.listeners = {
      statusChange: [],
      healthChange: [],
      restart: [],
      error: []
    };
  }
  
  getDefaultPythonPath() {
    const cwd = this.options.cwd;
    const pythonPath = path.join(cwd, '.venv', 'bin', 'python');
    
    // Check if virtual environment exists
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
    
    // Fallback to system python
    return 'python';
  }
  
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ServiceSupervisor] Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  setStatus(newStatus) {
    const oldStatus = this.status;
    this.status = newStatus;
    console.log(`[ServiceSupervisor] Status changed: ${oldStatus} → ${newStatus}`);
    this.emit('statusChange', { from: oldStatus, to: newStatus });
  }
  
  async start() {
    if (this.isShuttingDown) {
      console.warn('[ServiceSupervisor] Cannot start while shutting down');
      return false;
    }
    
    if (this.status === 'starting' || this.status === 'running') {
      console.warn('[ServiceSupervisor] Service already starting or running');
      return true;
    }
    
    this.setStatus('starting');
    this.restartCount = 0;
    this.healthCheckFailures = 0;
    
    try {
      const success = await this.spawnService();
      if (success) {
        this.startHealthMonitoring();
        this.setStatus('running');
        return true;
      } else {
        this.setStatus('crashed');
        return false;
      }
    } catch (error) {
      console.error('[ServiceSupervisor] Failed to start service:', error);
      this.setStatus('crashed');
      this.emit('error', { type: 'start-failed', error });
      return false;
    }
  }
  
  async stop() {
    this.isShuttingDown = true;
    this.stopHealthMonitoring();
    
    if (this.status === 'stopped' || this.status === 'stopping') {
      return true;
    }
    
    this.setStatus('stopping');
    
    try {
      if (this.serviceProcess) {
        // Try graceful shutdown first
        this.serviceProcess.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill if still running
        if (this.serviceProcess.killed === false) {
          this.serviceProcess.kill('SIGKILL');
        }
        
        this.serviceProcess = null;
      }
      
      this.setStatus('stopped');
      return true;
    } catch (error) {
      console.error('[ServiceSupervisor] Error stopping service:', error);
      this.setStatus('stopped'); // Assume stopped even on error
      return false;
    } finally {
      this.isShuttingDown = false;
    }
  }
  
  async restart() {
    console.log('[ServiceSupervisor] Restarting service...');
    await this.stop();
    
    // Brief pause before restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await this.start();
  }
  
  spawnService() {
    return new Promise((resolve, reject) => {
      try {
        const cwd = this.options.cwd;
        const pythonPath = this.options.pythonPath;
        
        // Standardize dev API port for consistency
        const args = [
          '-m', 'uvicorn', 
          'api.server:app', 
          '--host', this.options.host, 
          '--port', String(this.options.port)
        ];
        
        // Generate an ephemeral API token for this run
        this.apiToken = crypto.randomBytes(24).toString('hex');
        const env = { 
          ...process.env, 
          API_TOKEN: this.apiToken, 
          API_PORT: String(this.options.port) 
        };
        
        console.log(`[ServiceSupervisor] Starting Python service on ${this.options.host}:${this.options.port}`);
        
        // In production, capture logs to a file for diagnostics
        let stdioConfig = 'inherit';
        if (this.options.enableProdLogging && !this.isDev()) {
          try {
            const userData = app.getPath('userData');
            const logsDir = path.join(userData, 'logs');
            fs.mkdirSync(logsDir, { recursive: true });
            const apiLogPath = path.join(logsDir, 'api.log');
            const out = fs.createWriteStream(apiLogPath, { flags: 'a' });
            stdioConfig = ['ignore', 'pipe', 'pipe'];
          } catch (e) {
            console.warn('[ServiceSupervisor] Failed to initialize API log file, falling back to inherited stdio:', e?.message);
            stdioConfig = 'inherit';
          }
        }
        
        this.serviceProcess = spawn(pythonPath, args, { 
          cwd, 
          stdio: stdioConfig, 
          env 
        });
        
        // Handle stdout/stderr if we're capturing logs
        if (Array.isArray(stdioConfig) && stdioConfig[1] === 'pipe') {
          this.serviceProcess.stdout.on('data', (d) => {
            console.log(`[Python Service] ${d}`);
          });
          this.serviceProcess.stderr.on('data', (d) => {
            console.error(`[Python Service] ${d}`);
          });
        }
        
        this.serviceProcess.on('exit', (code, signal) => {
          console.warn(`[ServiceSupervisor] Python service exited with code ${code} and signal ${signal}`);
          
          if (!this.isShuttingDown) {
            this.handleUnexpectedExit(code, signal);
          }
        });
        
        this.serviceProcess.on('error', (error) => {
          console.error('[ServiceSupervisor] Failed to spawn Python service:', error);
          this.emit('error', { type: 'spawn-failed', error });
          
          if (!this.isShuttingDown) {
            this.handleSpawnError(error);
          }
        });
        
        // Give it a moment to start
        setTimeout(() => {
          if (this.serviceProcess && !this.serviceProcess.killed) {
            resolve(true);
          } else {
            reject(new Error('Service process failed to start'));
          }
        }, 1000);
        
      } catch (error) {
        console.error('[ServiceSupervisor] Error spawning service:', error);
        reject(error);
      }
    });
  }
  
  handleUnexpectedExit(code, signal) {
    this.setStatus('crashed');
    
    if (this.restartCount < this.options.maxRestarts) {
      this.restartCount++;
      console.log(`[ServiceSupervisor] Service crashed, restart attempt ${this.restartCount}/${this.options.maxRestarts}`);
      
      this.emit('restart', { 
        attempt: this.restartCount, 
        maxAttempts: this.options.maxRestarts,
        exitCode: code,
        signal: signal
      });
      
      // Schedule restart with exponential backoff
      const delay = Math.min(
        this.options.restartDelay * Math.pow(1.5, this.restartCount - 1),
        30000 // Max 30 seconds
      );
      
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.restart();
        }
      }, delay);
    } else {
      console.error('[ServiceSupervisor] Maximum restart attempts reached, giving up');
      this.emit('error', { 
        type: 'max-restarts-reached', 
        restartCount: this.restartCount,
        maxRestarts: this.options.maxRestarts
      });
    }
  }
  
  handleSpawnError(error) {
    this.setStatus('crashed');
    this.emit('error', { type: 'spawn-error', error });
    
    if (this.restartCount < this.options.maxRestarts) {
      this.restartCount++;
      console.log(`[ServiceSupervisor] Spawn error, restart attempt ${this.restartCount}/${this.options.maxRestarts}`);
      
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.restart();
        }
      }, this.options.restartDelay);
    }
  }
  
  startHealthMonitoring() {
    this.stopHealthMonitoring(); // Clear any existing timer
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck();
        this.lastHealthCheck = new Date();
        
        if (isHealthy) {
          this.healthCheckFailures = 0;
          this.emit('healthChange', { healthy: true, failures: 0 });
        } else {
          this.healthCheckFailures++;
          console.warn(`[ServiceSupervisor] Health check failed (${this.healthCheckFailures}/${this.maxHealthCheckFailures})`);
          this.emit('healthChange', { 
            healthy: false, 
            failures: this.healthCheckFailures,
            maxFailures: this.maxHealthCheckFailures
          });
          
          // If we've exceeded max failures, mark as unhealthy and consider restart
          if (this.healthCheckFailures >= this.maxHealthCheckFailures) {
            this.setStatus('unhealthy');
            this.emit('error', { 
              type: 'health-failed', 
              failures: this.healthCheckFailures,
              maxFailures: this.maxHealthCheckFailures
            });
            
            // Attempt restart
            if (this.restartCount < this.options.maxRestarts) {
              console.log('[ServiceSupervisor] Health check failures exceeded threshold, restarting service');
              await this.restart();
            }
          }
        }
      } catch (error) {
        console.error('[ServiceSupervisor] Error during health check:', error);
        this.emit('error', { type: 'health-check-error', error });
      }
    }, this.options.healthCheckInterval);
  }
  
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  async performHealthCheck() {
    const healthUrls = [
      `http://${this.options.host}:${this.options.port}/api/health`,
      `http://${this.options.host}:${this.options.port}/health`,
      `http://${this.options.host}:${this.options.port}/docs`
    ];
    
    for (const url of healthUrls) {
      try {
        const isReachable = await this.httpPing(url, this.options.healthCheckTimeout);
        if (isReachable) {
          return true;
        }
      } catch (error) {
        // Continue to next URL
        console.debug(`[ServiceSupervisor] Health check URL failed: ${url}`, error?.message);
      }
    }
    
    return false;
  }
  
  httpPing(url, timeout = 5000) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        resolve(false);
      }, timeout);
      
      http.get(url, { signal: controller.signal }, (res) => {
        clearTimeout(timeoutId);
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      }).on('error', (error) => {
        clearTimeout(timeoutId);
        console.debug(`[ServiceSupervisor] HTTP ping failed: ${url}`, error?.message);
        resolve(false);
      }).on('timeout', () => {
        controller.abort();
        resolve(false);
      });
    });
  }
  
  isDev() {
    return process.env.NODE_ENV === 'development';
  }
  
  // Public API methods
  
  getStatus() {
    return {
      status: this.status,
      restartCount: this.restartCount,
      lastHealthCheck: this.lastHealthCheck,
      healthCheckFailures: this.healthCheckFailures,
      isRunning: this.status === 'running',
      isHealthy: this.status === 'running' && this.healthCheckFailures === 0,
      apiToken: this.apiToken,
      port: this.options.port,
      host: this.options.host
    };
  }
  
  getConfig() {
    return {
      host: this.options.host,
      port: this.options.port,
      maxRestarts: this.options.maxRestarts,
      restartDelay: this.options.restartDelay,
      healthCheckInterval: this.options.healthCheckInterval,
      healthCheckTimeout: this.options.healthCheckTimeout
    };
  }
  
  getApiToken() {
    return this.apiToken;
  }
  
  getApiBaseUrl() {
    return `http://${this.options.host}:${this.options.port}`;
  }
  
  getApiConfig() {
    return {
      base: this.getApiBaseUrl(),
      token: this.apiToken || ''
    };
  }
  
  async waitForHealthy(timeoutMs = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.status === 'running' && this.healthCheckFailures === 0) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return false;
  }
}

// Export singleton instance
const pythonServiceSupervisor = new PythonServiceSupervisor();

module.exports = {
  PythonServiceSupervisor,
  pythonServiceSupervisor
};