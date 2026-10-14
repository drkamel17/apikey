import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3200,
    proxy: {
      // Same-origin proxy to the local LLM gateway (FreeLLM / Ollama).
      // The browser only ever talks to http://localhost:3200, so CORS and
      // mixed-content restrictions never apply — the dev server forwards to
      // the gateway on the machine. Override target with GATEWAY_TARGET.
      '/__gateway': {
        target: process.env.GATEWAY_TARGET || 'http://127.0.0.1:31415',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/__gateway/, ''),
      },
    },
  },
  preview: {
    port: 3200,
    proxy: {
      '/__gateway': {
        target: process.env.GATEWAY_TARGET || 'http://127.0.0.1:31415',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/__gateway/, ''),
      },
    },
  },
})
