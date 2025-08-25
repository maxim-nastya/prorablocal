import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // By removing the `base` property, Vite will generate relative asset paths.
  // This is a more robust method for deploying to a subfolder like on GitHub Pages,
  // as it doesn't require the repository name to be hardcoded in the config.
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