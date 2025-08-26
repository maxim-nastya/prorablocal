import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      // Expose the API_KEY to the client-side code.
      // Vite will replace `process.env.API_KEY` with the actual value at build time.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
    },
    build: {
      // Let Vite handle filename hashing for better cache busting.
      // The service worker will cache assets dynamically.
    }
  }
})