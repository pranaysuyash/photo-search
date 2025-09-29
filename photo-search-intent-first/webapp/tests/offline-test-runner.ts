/**
 * Offline Test Runner Configuration
 *
 * This file contains configurations and utilities for running comprehensive offline tests
 * across different network scenarios and browser configurations.
 */

import { defineConfig, devices } from "@playwright/test";

export const offlineTestConfig = defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results/offline-test-results.json" }]
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-offline",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--no-sandbox"
          ]
        }
      },
      testMatch: ["offline-comprehensive.test.ts", "offline-pwa.test.ts"]
    },
    {
      name: "firefox-offline",
      use: { ...devices["Desktop Firefox"] },
      testMatch: ["offline-comprehensive.test.ts", "offline-pwa.test.ts"]
    },
    {
      name: "webkit-offline",
      use: { ...devices["Desktop Safari"] },
      testMatch: ["offline-comprehensive.test.ts", "offline-pwa.test.ts"]
    }
  ],

  webServer: {
    command: "npm run dev -- --port 5173 --host",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

// Test scenarios configuration
export const offlineTestScenarios = {
  // Basic offline simulation
  basicOffline: {
    name: "Basic Offline Simulation",
    description: "Tests basic offline functionality by simulating network disconnection",
    setup: async ({ context }) => {
      await context.setOffline(true);
    },
    teardown: async ({ context }) => {
      await context.setOffline(false);
    }
  },

  // Flaky network simulation
  flakyNetwork: {
    name: "Flaky Network Simulation",
    description: "Tests behavior under unstable network conditions",
    setup: async ({ page }) => {
      await page.route("**/*", route => {
        // Simulate intermittent failures
        if (Math.random() < 0.3) {
          route.abort("failed");
        } else {
          route.continue();
        }
      });
    },
    teardown: async ({ page }) => {
      await page.unroute("**/*");
    }
  },

  // Slow network simulation
  slowNetwork: {
    name: "Slow Network Simulation",
    description: "Tests behavior under slow network conditions",
    setup: async ({ context }) => {
      await context.setOffline(false);
      // Simulate slow network
      await context.route("**/*", route => {
        setTimeout(() => route.continue(), 2000); // 2 second delay
      });
    },
    teardown: async ({ page }) => {
      await page.unroute("**/*");
    }
  },

  // Mobile offline simulation
  mobileOffline: {
    name: "Mobile Offline Simulation",
    description: "Tests offline functionality on mobile devices",
    setup: async ({ context, browserName }) => {
      await context.setOffline(true);
      // Additional mobile-specific setup
      if (browserName === 'webkit') {
        // Simulate mobile network conditions
        await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
      }
    },
    teardown: async ({ context }) => {
      await context.setOffline(false);
    }
  }
};

// Network condition presets
export const networkConditions = {
  offline: {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  },
  slow3G: {
    offline: false,
    latency: 400,
    downloadThroughput: 500 * 1024, // 500 KB/s
    uploadThroughput: 500 * 1024
  },
  fast3G: {
    offline: false,
    latency: 150,
    downloadThroughput: 1.5 * 1024 * 1024, // 1.5 MB/s
    uploadThroughput: 750 * 1024
  },
  wifi: {
    offline: false,
    latency: 20,
    downloadThroughput: 10 * 1024 * 1024, // 10 MB/s
    uploadThroughput: 5 * 1024 * 1024
  }
};

// Test data generators
export const generateOfflineTestData = {
  // Generate test collections
  collections: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-collection-${i}`,
      name: `Test Collection ${i}`,
      description: `Generated test collection ${i}`,
      photoCount: Math.floor(Math.random() * 100),
      createdAt: new Date().toISOString()
    }));
  },

  // Generate test photos
  photos: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-photo-${i}`,
      filename: `photo-${i}.jpg`,
      path: `/test/path/photo-${i}.jpg`,
      size: Math.floor(Math.random() * 10000000), // Random size up to 10MB
      createdAt: new Date().toISOString(),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'JPEG',
        rating: Math.floor(Math.random() * 6)
      }
    }));
  },

  // Generate test actions for offline queue
  actions: (count: number) => {
    const actionTypes = ['save', 'delete', 'rate', 'tag', 'collection'];
    return Array.from({ length: count }, (_, i) => ({
      id: `test-action-${i}`,
      type: actionTypes[Math.floor(Math.random() * actionTypes.length)],
      timestamp: Date.now() + i * 1000,
      data: {
        photoId: `test-photo-${i}`,
        value: Math.floor(Math.random() * 100)
      }
    }));
  }
};

// Performance metrics collectors
export const performanceMetrics = {
  // Measure page load time
  pageLoadTime: async (page) => {
    const metrics = await page.metrics();
    return metrics.LayoutDuration + metrics.RecalcStyleDuration + metrics.ScriptDuration;
  },

  // Measure memory usage
  memoryUsage: async (page) => {
    const metrics = await page.metrics();
    return {
      JSHeapUsedSize: metrics.JSHeapUsedSize,
      JSHeapTotalSize: metrics.JSHeapTotalSize
    };
  },

  // Measure network requests
  networkRequests: async (page) => {
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    return requests;
  }
};

// Utility functions for offline testing
export const offlineTestUtils = {
  // Wait for offline state
  waitForOffline: async (page) => {
    await page.waitForFunction(() => {
      return !navigator.onLine;
    }, { timeout: 5000 });
  },

  // Wait for online state
  waitForOnline: async (page) => {
    await page.waitForFunction(() => {
      return navigator.onLine;
    }, { timeout: 5000 });
  },

  // Clear browser data
  clearBrowserData: async (context) => {
    await context.clearCookies();
    await context.clearPermissions();
    await context.route('**/*', route => route.continue());
  },

  // Simulate service worker unregister
  unregisterServiceWorkers: async (page) => {
    await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => {
        return Promise.all(registrations.map(registration => registration.unregister()));
      });
    });
  },

  // Get connectivity events
  getConnectivityEvents: async (page) => {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const events = [];
        const handler = (event) => {
          events.push({
            type: event.type,
            timestamp: Date.now()
          });
        };

        window.addEventListener('online', handler);
        window.addEventListener('offline', handler);

        setTimeout(() => {
          window.removeEventListener('online', handler);
          window.removeEventListener('offline', handler);
          resolve(events);
        }, 1000);
      });
    });
  },

  // Measure sync performance
  measureSyncPerformance: async (page) => {
    const startTime = Date.now();

    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Simulate sync operation
        setTimeout(resolve, 2000);
      });
    });

    return Date.now() - startTime;
  }
};

export default offlineTestConfig;