import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'prorab-frontend' with your GitHub repository name
  base: '/prorab-frontend/',
  build: {
    rollupOptions: {
      output: {
        // Используем предсказуемые, не-хешированные имена файлов для кеширования в Service Worker
        entryFileNames: `assets/index.js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})