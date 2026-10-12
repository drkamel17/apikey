/**
 * Keyless public model-catalog proxy (Vercel Serverless Function).
 *
 * Some providers (router9, xkiro, agnes, llm7) expose a *public* /models
 * catalog but send no CORS headers, so browsers refuse to read it.
 * This endpoint re-serves those exact keyless URLs with ACAO:*.
 *
 * Security: allow-listed to 4 public catalog hosts + /models paths only.
 * No API key is ever accepted or forwarded here.
 */

const ALLOWED_HOSTS = new Set([
  'api.llm7.io',
  'api.router9.com',
  'api.xkiro.com',
  'apihub.agnes-ai.com',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const target = req.query?.url;
  let u;
  try {
    u = new URL(target);
  } catch {
    return res.status(400).json({ error: 'bad url' });
  }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) {
    return res.status(403).json({ error: 'host not allowed' });
  }
  if (!u.pathname.endsWith('/models')) {
    return res.status(403).json({ error: 'only model catalogs are proxied' });
  }

  try {
    const upstream = await fetch(u.toString(), {
      headers: {
        // Some catalogs (agnes) reject non-browser user agents.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    const text = await upstream.text();
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/json'
    );
    return res.status(upstream.status).send(text.slice(0, 2_000_000));
  } catch {
    return res.status(502).json({ error: 'upstream fetch failed' });
  }
}
