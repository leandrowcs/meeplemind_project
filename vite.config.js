import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Para GitHub Pages com subdomain, descomente:
  // base: '/MeepleMind_project/',

  server: {
    proxy: {
      // Rota /bggapi/* para boardgamegeek.com — resolve CORS no dev server
      '/bggapi': {
        target: 'https://boardgamegeek.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/bggapi/, '/xmlapi2'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': 'application/xml, text/xml, */*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://boardgamegeek.com/',
          'Origin': 'https://boardgamegeek.com',
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Strip credentials so BGG/Cloudflare doesn't return 401
            proxyReq.removeHeader('cookie');
            proxyReq.removeHeader('Cookie');
            proxyReq.removeHeader('authorization');
            proxyReq.removeHeader('Authorization');
          });
        },
      },
    },
  },

  // Pre-bundle Firebase to avoid Vite 504 "Outdated Optimize Dep" errors
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
    ],
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging
    minify: 'terser',
  },
})
