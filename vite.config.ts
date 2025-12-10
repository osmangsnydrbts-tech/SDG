
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Changed from '/' to './' to support relative paths
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
