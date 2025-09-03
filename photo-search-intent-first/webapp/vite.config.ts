import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../api/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})

