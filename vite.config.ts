import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // مهم جداً لضمان تحميل الملفات بشكل صحيح
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
