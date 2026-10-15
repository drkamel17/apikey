import { APIKey, DiscoveredModel, Provider, TestResult, ChatMessage } from '../types'
import { getProviderById } from '../data/providers'

const buildHeaders = (provider: Provider, apiKey: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (provider.auth.type === 'bearer') {
    headers[provider.auth.header] = `Bearer ${apiKey}`
  } else if (provider.auth.type === 'key') {
    headers[provider.auth.header] = apiKey
  } else if (provider.auth.type === 'custom') {
    headers[provider.auth.header] = apiKey
  }
  if (provider.auth.version && provider.format === 'anthropic') {
    headers['anthropic-version'] = provider.auth.version
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }
  return headers
}

// Providers store baseUrl WITHOUT the /v1 suffix, but users often paste the
// full base URL from provider docs (e.g. "http://127.0.0.1:31415/v1"). Strip a
// trailing /v1 (and trailing slashes) so paths like "/v1/models" don't double up.
const normalizeBase = (baseUrl: string) =>
  baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/i, '').replace(/\/+$/, '')

// Providers whose host sends no CORS headers (local gateways, Ollama Cloud,
// ...) cannot be called from a browser on a different origin. When the app runs
// locally over HTTP (npm run dev / preview), route those calls through the dev
// server's same-origin proxy at /__proxy/<absolute-url>. The browser then only
// talks to http://localhost:3200, so CORS and mixed-content never apply.
const proxyUrl = (provider: Provider, url: string): string => {
  if (typeof window === 'undefined') return url
  if (!provider.needsProxy) return url
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return url
  }
  if (u.host === window.location.host) return url
  const isLocalHost =
    u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1'

  if (window.location.protocol === 'http:') {
    // Local dev/preview server: same-origin proxy that can reach any host.
    return `${window.location.origin}/__proxy/${url}`
  }
  // Deployed over HTTPS: a serverless function relays to remote hosts only
  // (it cannot reach the user's localhost).
  if (isLocalHost) return url
  return `${window.location.origin}/api/proxy?url=${encodeURIComponent(url)}`
}

const substitute = (path: string, vars: Record<string, string>) => {
  let result = path
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(`{${k}}`, v)
  }
  return result
}

// Browsers block https pages from calling http:// endpoints (mixed content),
// which always breaks local providers (Ollama, FreeLLM) on the hosted page.
// Fail fast with an actionable message instead of a cryptic network error.
const assertReachable = (url: string) => {
  if (typeof window === 'undefined') return
  if (window.location.protocol !== 'https:' || !url.startsWith('http://')) return
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    throw new Error(
      'Local endpoint unreachable from this HTTPS page (mixed content blocked). ' +
      'Run the app locally over HTTP (npm run dev) to use Ollama / FreeLLM. ' +
      'If already local and it still fails, allow the app origin on the server ' +
      '(e.g. OLLAMA_ORIGINS for Ollama).'
    )
  }
  throw new Error(
    'Mixed content blocked: this HTTPS page cannot call an http:// endpoint. Use https:// or run the app locally.'
  )
}

export const testApiKey = async (key: APIKey): Promise<TestResult> => {
  const provider = getProviderById(key.providerId)
  if (!provider) return { success: false, message: 'Unknown provider', timestamp: Date.now() }

  const start = performance.now()
  try {
    const models = await discoverModels(provider, key.apiKey)
    return {
      success: true,
      latency: Math.round(performance.now() - start),
      models: models.map((m) => m.id).slice(0, 50),
      timestamp: Date.now(),
    }
  } catch (err: any) {
    const msg = extractErrorMessage(err)
    return { success: false, message: msg, timestamp: Date.now() }
  }
}

export const discoverModels = async (provider: Provider, apiKey: string): Promise<DiscoveredModel[]> => {
  const rawUrl = `${normalizeBase(provider.baseUrl)}${substitute(provider.modelsPath, { key: apiKey })}`
  assertReachable(rawUrl)
  const url = proxyUrl(provider, rawUrl)
  // Public catalogs (llm7, router9, xkiro, agnes): no auth headers at all,
  // so the browser treats it as a CORS-simple request (no preflight) on
  // hosts that don't allow the Authorization header.
  const headers: Record<string, string> = provider.publicModels ? {} : buildHeaders(provider, apiKey)

  let res: Response | null = null
  try {
    res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(15000) })
  } catch (err) {
    // Keyless public catalog blocked by the browser (no ACAO header on the
    // API side): retry the exact same keyless URL through proxies.
    // No API key is ever sent here, so nothing secret leaks.
    if (!provider.publicModels) throw err
    const attempts = [
      // 1) our own serverless proxy (same origin, Vercel only)
      `/api/models-proxy?url=${encodeURIComponent(url)}`,
      // 2) public fallback (flaky, last resort)
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ]
    let lastErr: unknown = err
    for (const target of attempts) {
      try {
        const r = await fetch(target, { signal: AbortSignal.timeout(20000) })
        if (!r.ok) {
          lastErr = new Error(await getErrorDetail(r))
          continue
        }
        // Reject SPA fallbacks / proxy error pages (HTML instead of JSON).
        try {
          await r.clone().json()
        } catch {
          lastErr = new Error('Proxy did not return JSON')
          continue
        }
        res = r
        break
      } catch (e) {
        lastErr = e
      }
    }
    if (!res) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  if (!res.ok) {
    throw new Error(await getErrorDetail(res))
  }

  const data = await res.json()
  const list = extractModelList(data, provider.format)
  const models: DiscoveredModel[] = list
    .map((m: any) => {
      const id: string = m.id || m.name || m.model || m.modelId || ''
      const name: string = m.name || id
      const ctx = m.context_length || m.contextWindow || m.max_context_length || m.metadata?.context
      const isFree =
        id.endsWith(':free') ||
        provider.freeModels.includes(id) ||
        m.pricing?.prompt === '0' ||
        m.free === true
      return { id, name, contextWindow: ctx ? Number(ctx) : undefined, free: isFree }
    })
    .filter((m) => m.id)

  return models
}

const extractModelList = (data: any, format: string): any[] => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.models)) return data.models
  if (Array.isArray(data.items)) return data.items
  if (format === 'gemini' && Array.isArray(data.models)) return data.models
  if (data.result && Array.isArray(data.result.models)) return data.result.models
  return []
}

export interface ChatOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  onToken?: (token: string) => void
}

export const sendChat = async (
  provider: Provider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> => {
  const rawUrl = `${normalizeBase(provider.baseUrl)}${substitute(provider.chatPath, { model, key: apiKey })}`
  assertReachable(rawUrl)
  const url = proxyUrl(provider, rawUrl)
  const headers = buildHeaders(provider, apiKey)

  const body = buildChatBody(provider.format, model, messages, options)

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  })

  if (!res.ok) {
    throw new Error(await getErrorDetail(res))
  }

  const isStream = options.onToken && canStream(provider.format)
  if (isStream && res.body) {
    return await readStream(res, provider.format, options.onToken!)
  }

  const data = await res.json()
  return extractChatResponse(data, provider.format)
}

const canStream = (format: string) =>
  format === 'openai' || format === 'gemini' || format === 'anthropic' || format === 'openrouter' || format === 'cohere'

const buildChatBody = (
  format: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions
): any => {
  const base = {
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
    stream: options.onToken ? true : false,
  }

  switch (format) {
    case 'openai':
    case 'openrouter':
      return {
        model,
        messages,
        ...base,
        stream: options.onToken ? true : false,
      }
    case 'anthropic':
      return {
        model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        system: messages.find((m) => m.role === 'system')?.content,
        messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        stream: options.onToken ? true : false,
      }
    case 'gemini':
      return {
        systemInstruction: { parts: [{ text: messages.find((m) => m.role === 'system')?.content || '' }] },
        contents: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 1024,
        },
      }
    case 'cohere':
      return {
        model,
        messages: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, message: m.content })),
        chatbot_config: { preamble: messages.find((m) => m.role === 'system')?.content },
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
        stream: options.onToken ? true : false,
      }
    default:
      return { model, messages, ...base }
  }
}

const extractChatResponse = (data: any, format: string): string => {
  if (format === 'anthropic') {
    return data.content?.[0]?.text || ''
  }
  if (format === 'gemini') {
    const cand = data.candidates?.[0]
    if (cand?.content?.parts) {
      return cand.content.parts.map((p: any) => p.text || '').join('')
    }
    return ''
  }
  if (format === 'cohere') {
    return data.message?.content || ''
  }
  return data.choices?.[0]?.message?.content || ''
}

const readStream = async (res: Response, format: string, onToken: (t: string) => void): Promise<string> => {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const token = extractStreamToken(json, format)
        if (token) {
          full += token
          onToken(token)
        }
      } catch {
        // ignore non-JSON keep-alive lines
      }
    }
  }

  return full
}

const extractStreamToken = (json: any, format: string): string => {
  if (format === 'gemini') {
    const part = json.candidates?.[0]?.content?.parts
    if (Array.isArray(part)) return part.map((p: any) => p.text || '').join('')
    return ''
  }
  if (format === 'anthropic') {
    if (json.type === 'content_block_delta') return json.delta?.text || ''
    return ''
  }
  if (format === 'cohere') {
    if (json.event_type === 'text_delta') return json.delta || ''
    return ''
  }
  return json.choices?.[0]?.delta?.content || json.delta?.text || ''
}

const getErrorDetail = async (res: Response): Promise<string> => {
  let detail = `${res.status} ${res.statusText}`
  try {
    const data = await res.json()
    detail =
      data.error?.message ||
      data.message ||
      data.error ||
      data.detail ||
      data.title ||
      detail
    if (typeof detail !== 'string') detail = JSON.stringify(detail)
  } catch {
    try {
      const text = await res.text()
      if (text) detail = text.slice(0, 300)
    } catch {
      // keep status
    }
  }
  return detail
}

const extractErrorMessage = (err: unknown): string => {
  if (err instanceof DOMException && err.name === 'TimeoutError') return 'Request timed out'
  if (err instanceof TypeError) return 'Network error (CORS or connectivity) — check provider docs'
  if (err instanceof Error) return err.message
  return String(err)
}
