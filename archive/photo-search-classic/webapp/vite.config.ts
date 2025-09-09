import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        statements: 70,
        branches: 50,
        functions: 58,
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
      ],
    },
  },
  build: {
    outDir: resolve(__dirname, '../api/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
