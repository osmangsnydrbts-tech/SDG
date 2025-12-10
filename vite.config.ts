
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Absolute path is recommended for standard root deployments
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
    assetsDir: 'assets',
    emptyOutDir: true,
  },
})
