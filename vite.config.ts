import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // This is crucial for deploying to a subfolder on GitHub Pages.
  // It should match the repository name.
  base: '/prorab-frontend/',
  plugins: [react()],
  build: {
    // Let Vite handle filename hashing for better cache busting.
    // The service worker will cache assets dynamically.
  }
})