import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    headers: {
      // CSP policy - allows development flexibility with external services
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:5000 http://localhost:* ws://localhost:* https://*.sentry.io https://*.supabase.co; font-src 'self' data: https://fonts.gstatic.com;",
    },
    fs: {
      // Restrict file system access to prevent arbitrary file retrieval
      deny: [
        '.env',
        '.env.local',
        '.env.*.local',
        '*.crt',
        '*.key',
        '*.pem',
        '.git',
        '.ssh',
        '/etc/passwd',
        '/etc/shadow'
      ],
      allow: [
        // Allow serving from project root during dev
        process.cwd(),
      ]
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }

})
