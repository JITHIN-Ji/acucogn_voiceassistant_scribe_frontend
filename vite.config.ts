import { defineConfig } from 'vite';

// Configure a dev proxy for convenience: /api -> backend base URL
const apiTarget = process.env.VITE_API_BASE_URL || 'https://acucogn-scribe-api-d9h5a7gzepd3dtg2.canadacentral-01.azurewebsites.net';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});


