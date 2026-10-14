// Local CORS proxy for FreeLLMAPI (and other local OpenAI-compatible gateways).
//
// Why: the FreeLLMAPI router does not send Access-Control-Allow-Origin and sets
// Cross-Origin-Resource-Policy: same-origin, so a browser app served from a
// different origin (http://localhost:3200) cannot call it, even over HTTP.
// This proxy sits in front, forwards to the gateway and adds permissive CORS
// headers so the browser accepts the response.
//
// Usage:
//   node cors-proxy.mjs                 # 127.0.0.1:31416 -> 127.0.0.1:31415
//   PROXY_PORT=4000 PROXY_TARGET=http://127.0.0.1:3001 node cors-proxy.mjs
//
// Then in the app set FreeLLM "Gateway base URL" to  http://127.0.0.1:31416

import http from 'node:http'
import https from 'node:https'

const LISTEN_HOST = process.env.PROXY_HOST || '127.0.0.1'
const LISTEN_PORT = Number(process.env.PROXY_PORT || 31416)
const TARGET = process.env.PROXY_TARGET || 'http://127.0.0.1:31415'
const target = new URL(TARGET)
const client = target.protocol === 'https:' ? https : http

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
  'access-control-allow-headers':
    'authorization,content-type,accept,anthropic-version,anthropic-dangerous-direct-browser-access,x-api-key,x-goog-api-key',
  'access-control-expose-headers': '*',
  'access-control-max-age': '86400',
}

const strip = (headers) => {
  delete headers['cross-origin-resource-policy']
  delete headers['cross-origin-embedder-policy']
  delete headers['cross-origin-opener-policy']
  delete headers['content-security-policy']
  delete headers['content-security-policy-report-only']
  return headers
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  const headers = strip({ ...req.headers, host: target.host })

  const proxyReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: req.url,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      const outHeaders = strip({ ...proxyRes.headers, ...CORS })
      res.writeHead(proxyRes.statusCode || 502, outHeaders)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json', ...CORS })
    res.end(
      JSON.stringify({
        error: 'proxy_error',
        message: err.message,
        hint: `Is the gateway running at ${TARGET}?`,
      })
    )
  })

  req.pipe(proxyReq)
})

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`CORS proxy listening on http://${LISTEN_HOST}:${LISTEN_PORT}`)
  console.log(`  -> forwarding to ${TARGET}`)
  console.log(`Use http://${LISTEN_HOST}:${LISTEN_PORT} as the provider base URL.`)
})
