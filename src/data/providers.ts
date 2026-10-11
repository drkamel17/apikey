import { Provider } from '../types'
import { localStore } from '../services/fs-storage'

export const PROVIDERS: Provider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'gemini',
    color: '#4285F4',
    baseUrl: 'https://generativelanguage.googleapis.com',
    format: 'gemini',
    modelsPath: '/v1beta/models?key={key}',
    chatPath: '/v1beta/models/{model}:generateContent?key={key}',
    auth: { header: 'x-goog-api-key', type: 'key' },
    freeModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    docsUrl: 'https://ai.google.dev',
  },
