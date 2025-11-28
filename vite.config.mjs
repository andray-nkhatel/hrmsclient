import { fileURLToPath, URL } from 'node:url';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        noDiscovery: true,
         // Include jQuery to ensure proper loading
        include: ['jquery']
    },
    plugins: [
        vue(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
     // Define global variables for external libraries
  define: {
    global: 'globalThis',
  },
  // Development server proxy to bypass CORS issues
  // The proxy will forward /api/* and /auth/* requests to the backend server
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173, // Frontend dev server port (changed from 8070 to avoid conflict with backend)
    proxy: {
      '/api': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
          });
        }
      },
      '/auth': {
        target: 'http://localhost:8070',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
          });
        }
      }
    }
  },
  // Ensure external scripts load properly
  build: {
    rollupOptions: {
      external: ['jquery'],
      output: {
        globals: {
          jquery: 'jQuery'
        }
      }
    }
  }
});
