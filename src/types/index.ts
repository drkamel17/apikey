export type KeyStatus = 'working' | 'failed' | 'untested'

export interface APIKey {
  id: string
  name: string
  apiKey: string
  providerId: string
  status: KeyStatus
  lastTested?: number
  models?: string[]
  createdAt: number
  updatedAt: number
  custom?: boolean
  note?: string
}

export interface DiscoveredModel {
  id: string
  name: string
  free?: boolean
  contextWindow?: number
}

export type ProviderFormat = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'cohere' | 'grok' | 'generic'

export interface Provider {
  id: string
  name: string
  icon?: string
  color: string
  baseUrl: string
  format: ProviderFormat
  modelsPath: string
  chatPath: string
  auth: {
    header: string
    type: 'bearer' | 'key' | 'custom'
    version?: string
  }
  freeModels: string[]
  docsUrl: string
  isCustom?: boolean
  requiresRegion?: string
  /** When true, GET modelsPath is public: discoverModels sends no auth
   *  headers, keeping the request CORS-simple (no preflight) for hosts
   *  that don't allow the Authorization header (e.g. llm7, router9, xkiro). */
  publicModels?: boolean
  /** This host sends no CORS headers (local gateways, Ollama Cloud, ...), so a
   *  browser cannot call it cross-origin. When the app runs locally (HTTP),
   *  requests are routed through the dev server's same-origin /__proxy. */
  needsProxy?: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TestResult {
  success: boolean
  message?: string
  latency?: number
  models?: string[]
  timestamp: number
}

export interface Settings {
  language: 'en' | 'ar'
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
}

export interface ActivityLog {
  id: string
  action: string
  timestamp: number
  success: boolean
}