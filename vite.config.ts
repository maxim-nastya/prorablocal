import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Let Vite handle filename hashing for better cache busting.
    // The service worker will cache assets dynamically.
  }
})