import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is only the build tool. During development every request to /api or
// /uploads is forwarded to the Express server, so the browser sees a single
// origin and we do not need CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The React app imports the shared design system from ../static,
    // so Vite must be allowed to read files one folder up.
    fs: { allow: ['..'] },
    // xfwd passes the visitor's IP on to Express (rate limiter, voter hash).
    proxy: {
      '/api': { target: 'http://localhost:5000', xfwd: true },
      '/uploads': { target: 'http://localhost:5000', xfwd: true },
      '/static': { target: 'http://localhost:5000', xfwd: true }
    }
  }
});
