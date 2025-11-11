import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
  rewrite: (path) => path.replace(/^\//api/, ''),
      },
    },
  },
  plugins: [react()],
});
