import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import http from 'node:http'
import https from 'node:https'

const PREFIX = '/__proxy/'

// Dev/preview same-origin proxy. The browser calls http://localhost:3200 and
// the dev server forwards the request to the real host (local gateway or a
// remote API that sends no CORS headers, e.g. https://ollama.com). Because the
// browser only ever talks to its own origin, CORS and mixed-content never apply.
// Only active while the dev/preview server runs; it is NOT part of the build.
const llmDevProxy = (): Plugin => {
  const middleware = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: () => void
  ) => {
    if (!req.url || !req.url.startsWith(PREFIX)) return next()
    const raw = req.url.slice(PREFIX.length)
    let target: URL
    try {
      target = new URL(raw)
    } catch {
      res.statusCode = 400
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ error: 'bad url' }))
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      res.statusCode = 400
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ error: 'unsupported protocol' }))
    }

    const mod = target.protocol === 'https:' ? https : http
    const headers: http.OutgoingHttpHeaders = { ...req.headers }
    headers.host = target.host
    delete headers.origin
    delete headers.referer

    const proxyReq = mod.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const out: http.OutgoingHttpHeaders = { ...proxyRes.headers }
        out['access-control-allow-origin'] = req.headers.origin || '*'
        out['access-control-allow-methods'] = 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS'
        out['access-control-allow-headers'] = '*'
        delete out['content-security-policy']
        delete out['content-security-policy-report-only']
        delete out['cross-origin-resource-policy']
        delete out['cross-origin-embedder-policy']
        delete out['cross-origin-opener-policy']
        res.writeHead(proxyRes.statusCode || 502, out)
        proxyRes.pipe(res)
      }
    )

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'proxy_error',
            message: err.message,
            target: target.toString(),
          })
        )
      } else {
        res.end()
      }
    })

    req.pipe(proxyReq)
  }

  return {
    name: 'llm-dev-proxy',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), llmDevProxy()],
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
  },
  preview: {
    port: 3200,
  },
})
