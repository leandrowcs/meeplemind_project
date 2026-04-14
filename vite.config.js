import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Para GitHub Pages com subdomain, descomente:
  // base: '/MeepleMind_project/',
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging
    minify: 'terser',
  },
})
