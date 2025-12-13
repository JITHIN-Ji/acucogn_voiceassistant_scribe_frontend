import { defineConfig } from 'vite';

// Configure a dev proxy for convenience: /api -> backend base URL
const apiTarget = process.env.VITE_API_BASE_URL || 'https://zealous-ground-07c2d0b10.3.azurestaticapps.net';

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


