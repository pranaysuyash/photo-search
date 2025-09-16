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
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for stable dependencies
          vendor: ["react", "react-dom"],
          // UI libraries chunk
          ui: ["lucide-react", "framer-motion"],
          // Utilities chunk
          utils: ["zustand"],
        },
        // Optimize chunk file names for caching
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Enable source maps for debugging
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
});
