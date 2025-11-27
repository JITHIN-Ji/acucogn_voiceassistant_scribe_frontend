import { defineConfig } from 'vite';

// Configure a dev proxy for convenience: /api -> backend base URL
const apiTarget = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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


