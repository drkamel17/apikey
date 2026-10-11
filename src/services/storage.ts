import { APIKey, Settings, ActivityLog } from '../types'

const uuid = () => crypto.randomUUID()

const STORAGE_KEY = 'ai-api-key-manager'
const SETTINGS_KEY = 'ai-api-key-settings'
const LOG_KEY = 'ai-api-key-logs'

// Simple encryption using XOR + Base64 for local storage
// In production, use a proper key derived from a user-set master password
const encrypt = (text: string, key: string): string => {
  if (!key) return text
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(unescape(encodeURIComponent(result)))
}

const decrypt = (text: string, key: string): string => {
  if (!key) return text
  try {
    const decoded = decodeURIComponent(escape(atob(text)))
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return text
  }
}

class StorageService {
  private keys: APIKey[] = []
  private settings: Settings = {
    language: 'en',
    theme: 'system',
    fontSize: 'medium',
  }
  private logs: ActivityLog[] = []
  private encryptionKey: string | null = null

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        this.keys = data.keys || []
        this.encryptionKey = data.encryptionKey || null
      }
    } catch {
      this.keys = []
    }

    try {
      const s = localStorage.getItem(SETTINGS_KEY)
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) }
    } catch {
      // keep defaults
    }

    try {
      const l = localStorage.getItem(LOG_KEY)
      if (l) this.logs = JSON.parse(l)
    } catch {
      this.logs = []
    }
  }

  private save() {
    const data = {
      keys: this.keys,
      encryptionKey: this.encryptionKey,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    localStorage.setItem(LOG_KEY, JSON.stringify(this.logs))
  }

  private addLog(action: string, success: boolean) {
    this.logs.push({ id: uuid(), action, timestamp: Date.now(), success })
    if (this.logs.length > 100) this.logs = this.logs.slice(-100)
    this.save()
  }

  // Encryption
  setEncryptionKey(key: string) {
    this.encryptionKey = key || null
    this.save()
  }

  getEncryptionKey(): string | null {
    return this.encryptionKey
  }

  private encryptValue(value: string): string {
    if (!this.encryptionKey) return value
    return encrypt(value, this.encryptionKey)
  }

  private decryptValue(value: string): string {
    if (!this.encryptionKey) return value
    return decrypt(value, this.encryptionKey)
  }

  // API Keys
  getKeys(): APIKey[] {
    return this.keys.map((k) => ({
      ...k,
      apiKey: this.decryptValue(k.apiKey),
    }))
  }

  getRawKeys(): APIKey[] {
    return this.keys
  }

  getKeyById(id: string): APIKey | undefined {
    const k = this.keys.find((k) => k.id === id)
    if (!k) return undefined
    return { ...k, apiKey: this.decryptValue(k.apiKey) }
  }

  addKey(key: Omit<APIKey, 'id' | 'createdAt' | 'updatedAt'>): APIKey {
    const newKey: APIKey = {
      ...key,
      id: uuid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      apiKey: this.encryptValue(key.apiKey),
    }
    this.keys.push(newKey)
    this.save()
    this.addLog(`Added key: ${key.name}`, true)
    return { ...newKey, apiKey: key.apiKey }
  }

  updateKey(id: string, updates: Partial<APIKey>): APIKey | undefined {
    const idx = this.keys.findIndex((k) => k.id === id)
    if (idx === -1) return undefined
    const updated = { ...this.keys[idx], ...updates, updatedAt: Date.now() }
    if (updates.apiKey) {
      updated.apiKey = this.encryptValue(updates.apiKey)
    }
    this.keys[idx] = updated
    this.save()
    this.addLog(`Updated key: ${updated.name}`, true)
    return { ...updated, apiKey: this.decryptValue(updated.apiKey) }
  }

  deleteKey(id: string): boolean {
    const idx = this.keys.findIndex((k) => k.id === id)
    if (idx === -1) return false
    const name = this.keys[idx].name
    this.keys.splice(idx, 1)
    this.save()
    this.addLog(`Deleted key: ${name}`, true)
    return true
  }

  // Settings
  getSettings(): Settings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...updates }
    this.save()
    this.addLog('Settings updated', true)
    return this.settings
  }

  // Logs
  getLogs(): ActivityLog[] {
    return [...this.logs].reverse().slice(0, 50)
  }

  // Export/Import
  exportData(): string {
    return JSON.stringify({
      keys: this.keys,
      settings: this.settings,
      logs: this.logs,
      encryptionKey: this.encryptionKey,
    }, null, 2)
  }

  importData(json: string): boolean {
    try {
      const data = JSON.parse(json)
      if (data.keys) this.keys = data.keys
      if (data.settings) this.settings = { ...this.settings, ...data.settings }
      if (data.logs) this.logs = data.logs
      if (data.encryptionKey) this.encryptionKey = data.encryptionKey
      this.save()
      this.addLog('Data imported', true)
      return true
    } catch {
      this.addLog('Data import failed', false)
      return false
    }
  }

  clearAll() {
    this.keys = []
    this.logs = []
    this.encryptionKey = null
    this.save()
    this.addLog('All data cleared', true)
  }
}

export const storage = new StorageService()