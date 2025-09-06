import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Use relative base so built assets load when opening index.html directly
  // and also work when served under /app by the API server
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 45,
        functions: 42,
      },
      exclude: [
        'src/test/**',
        'src/**/*.test.*',
        'tailwind.config.js',
        'postcss.config.js',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'src/main.tsx',
        'src/ModernApp.tsx',
        'src/App_backup.tsx',
        'src/debug/**',
        'src/components/ui/index.tsx',
        'src/stores/index.ts',
        'src/stores/useStores.ts',
      ],
    },
  },
  build: {
    outDir: resolve(__dirname, '../api/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
})
