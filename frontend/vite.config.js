import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      // Relaxed CSP policy to allow app to function
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:5000 http://localhost:* ws://localhost:*; font-src 'self' data:;",
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
        'node_modules',
        '/etc/passwd',
        '/etc/shadow'
      ],
      allow: [
        'src/',
        'public/',
        'node_modules/@vite',
        'node_modules/vite'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
