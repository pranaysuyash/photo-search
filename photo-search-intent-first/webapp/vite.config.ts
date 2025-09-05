import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Use relative base so built assets load when opening index.html directly
  // and also work when served under /app by the API server
  base: './',
  build: {
    outDir: resolve(__dirname, '../api/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
