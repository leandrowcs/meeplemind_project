import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ludopediaToken = (env.LUDOPEDIA_ACCESS_TOKEN || '').trim();
  const bggToken = (env.BGG_ACCESS_TOKEN || '').trim();

  // When LUDOPEDIA_ACCESS_TOKEN is set, the Vite proxy calls Ludopedia directly —
  // no separate `npm run dev:ludopedia` server is needed.
  // OAuth endpoints are mocked so the UI stays functional (catalog works; user
  // OAuth connect shows "not configured" gracefully).
  const ludopediaProxyConfig = ludopediaToken
    ? {
        target: 'https://ludopedia.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ludopedia/, '/api/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${ludopediaToken}`);
            proxyReq.removeHeader('cookie');
            proxyReq.removeHeader('Cookie');
          });
        },
      }
    : {
        // Fallback to local BFF when no static token is configured.
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      };

  // Inline Vite plugin: intercept OAuth management paths before the proxy so they
  // return well-formed responses instead of hitting Ludopedia's unknown routes.
  const ludopediaMockPlugin = {
    name: 'ludopedia-oauth-mock',
    configureServer(server) {
      if (!ludopediaToken) return;

      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/ludopedia/oauth/session') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            available: true,
            oauthConfigured: false,
            connected: false,
            provider: 'ludopedia',
          }));
          return;
        }
        if (req.url === '/api/ludopedia/oauth/logout' || req.url?.startsWith('/api/ludopedia/oauth/')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = req.url === '/api/ludopedia/oauth/start' ? 503 : 200;
          res.end(JSON.stringify({ ok: true, error: req.url === '/api/ludopedia/oauth/start' ? 'oauth_not_configured' : undefined }));
          return;
        }
        next();
      });
    },
  };

  return {
  plugins: [react(), ludopediaMockPlugin],
  // Para GitHub Pages com subdomain, descomente:
  // base: '/MeepleMind_project/',

  server: {
    proxy: {
      // Rota /api/ludopedia/*:
      // - com LUDOPEDIA_ACCESS_TOKEN: proxy direto para ludopedia.com.br (sem BFF)
      // - sem token: redireciona para backend OAuth local (BFF) em localhost:8787
      '/api/ludopedia': ludopediaProxyConfig,

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
            proxyReq.removeHeader('cookie');
            proxyReq.removeHeader('Cookie');
            if (bggToken) {
              // New authenticated BGG API: forward Bearer token
              proxyReq.setHeader('Authorization', `Bearer ${bggToken}`);
            } else {
              // Public XML API v2: strip credentials to avoid 401
              proxyReq.removeHeader('authorization');
              proxyReq.removeHeader('Authorization');
            }
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
  }
})
