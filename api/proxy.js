/**
 * Generic server-side proxy (Vercel Serverless Function).
 *
 * Some remote hosts (e.g. https://ollama.com) send no CORS headers, so a
 * browser on another origin cannot call them directly. This endpoint relays the
 * request server-side and returns the response with ACAO:*, so the deployed
 * (HTTPS) app works with those providers.
 *
 * Security: allow-listed to specific hosts. The caller's Authorization header
 * is forwarded to the upstream host only (never logged).
 */

const ALLOWED_HOSTS = new Set([
  'ollama.com',
  'api.septorlabs.com',
  'api.getwaterfall.org',
])

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const target = req.query?.url
  let u
  try {
    u = new URL(Array.isArray(target) ? target[0] : target)
  } catch {
    return res.status(400).json({ error: 'bad url' })
  }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
    return res.status(403).json({ error: 'host not allowed' })
  }

  // Read the raw request body (bodyParser disabled above).
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  const headers = {}
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase()
    if (
      ['host', 'origin', 'referer', 'connection', 'content-length', 'accept-encoding', 'cookie'].includes(lk)
    ) {
      continue
    }
    headers[k] = Array.isArray(v) ? v.join(',') : v
  }
  headers['host'] = u.host
  headers['accept-encoding'] = 'identity'

  try {
    const upstream = await fetch(u.toString(), {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(55000),
    })
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    const buf = Buffer.from(await upstream.arrayBuffer())
    return res.send(buf)
  } catch (err) {
    return res.status(502).json({ error: 'proxy_error', message: String(err) })
  }
}
