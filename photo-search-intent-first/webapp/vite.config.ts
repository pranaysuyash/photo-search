import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for better development experience
      fastRefresh: true,
    }),
  ],
  // Use relative base so built assets load when opening index.html directly
  // and also work when served under /app by the API server
  base: "./",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": resolve(__dirname, "src"),
      "@/lib": resolve(__dirname, "src/lib"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "lucide-react", "framer-motion"],
    exclude: ["@vite/client", "@vite/env"],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 45,
        functions: 42,
      },
      exclude: [
        "src/test/**",
        "src/**/*.test.*",
        "tailwind.config.js",
        "postcss.config.js",
        "tsconfig.json",
        "vite.config.ts",
        "index.html",
        "src/main.tsx",
        "src/ModernApp.tsx",
        "src/App_backup.tsx",
        "src/debug/**",
        "src/components/ui/index.tsx",
        "src/stores/index.ts",
        "src/stores/useStores.ts",
      ],
    },
  },
  build: {
    outDir: resolve(__dirname, "../api/web"),
    emptyOutDir: true,
    // Optimize build performance
    target: "es2020",
    minify: "esbuild",
    // Enable code splitting with improved chunking
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for React ecosystem
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            // UI libraries
            if (
              id.includes("lucide-react") ||
              id.includes("framer-motion") ||
              id.includes("@headlessui") ||
              id.includes("react-router")
            ) {
              return "vendor-ui";
            }
            // State management and utilities
            if (
              id.includes("zustand") ||
              id.includes("immer") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "vendor-utils";
            }
            // Map libraries (large)
            if (
              id.includes("leaflet") ||
              id.includes("react-leaflet") ||
              id.includes("mapbox")
            ) {
              return "vendor-maps";
            }
            // Other vendor libraries
            return "vendor-other";
          }

          // Application chunks based on feature
          if (id.includes("src/views/")) {
            return "app-views";
          }
          if (id.includes("src/components/")) {
            // Large components get their own chunks
            if (id.includes("MapView") || id.includes("EnhancedMapView")) {
              return "app-maps";
            }
            if (id.includes("Video") || id.includes("VideoManager")) {
              return "app-video";
            }
            if (id.includes("Search") || id.includes("Results")) {
              return "app-search";
            }
            return "app-components";
          }
          if (id.includes("src/stores/") || id.includes("src/contexts/")) {
            return "app-state";
          }
          if (id.includes("src/services/")) {
            return "app-services";
          }
          if (id.includes("src/hooks/")) {
            return "app-hooks";
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Increase chunk size warning limit to reduce noise
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
});
