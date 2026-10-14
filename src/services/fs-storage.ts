import { APIKey, Settings, ActivityLog, Provider } from '../types'

const uuid = () => crypto.randomUUID()

const SETTINGS_KEY = 'ai-api-key-manager-settings'
const DATA_FILE = 'ai-api-keys.json'
const IDB_NAME = 'ai-api-key-manager'
const IDB_STORE = 'handles'
const HANDLE_KEY = 'dataDirectory'
const DEFAULT_FILE = 'ai-api-keys.json'

export interface ProviderOverride {
  baseUrl?: string
}

export interface DataFile {
  app: 'ai-api-key-manager'
  version: number
  savedAt: number
  keys: APIKey[]
  customProviders: Provider[]
  providerOverrides?: Record<string, ProviderOverride>
  logs: ActivityLog[]
  encryptionKey: string | null
}

export type DirStatus = 'unsupported' | 'empty' | 'needs-permission' | 'ready'

const emptyData = (): DataFile => ({
  app: 'ai-api-key-manager',
  version: 1,
  savedAt: Date.now(),
  keys: [],
  customProviders: [],
  providerOverrides: {},
  logs: [],
  encryptionKey: null,
})

// ---- encryption (obfuscation, same scheme as the desktop build) ----
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

// ---- tiny IndexedDB helper to persist the directory handle ----
const idb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const idbSet = async (key: string, value: unknown) => {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await idb()
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return value
}

const idbDel = async (key: string) => {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

class LocalStore {
  private dir: FileSystemDirectoryHandle | null = null
  private pending: FileSystemDirectoryHandle | null = null
  public status: DirStatus = 'empty'
  public dirName = ''
  public fileName = DEFAULT_FILE
  private data: DataFile = emptyData()
  private writeChain: Promise<void> = Promise.resolve()
  public onChange: (() => void) | null = null

  supportsFS(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function'
  }

  private settings: Settings = { language: 'en', theme: 'system', fontSize: 'medium' }

  constructor() {
    try {
      const s = localStorage.getItem(SETTINGS_KEY)
      if (s) this.settings = { ...this.settings, ...JSON.parse(s) }
    } catch {
      /* keep defaults */
    }
  }

  // ---- directory lifecycle ----
  async init(): Promise<DirStatus> {
    if (!this.supportsFS()) {
      this.status = 'unsupported'
      return this.status
    }
    try {
      const handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY)
      if (handle) {
        const perm = await (handle as any).queryPermission?.({ mode: 'readwrite' })
        if (perm === 'granted') {
          this.dir = handle
          await this.loadFromDisk()
          this.status = 'ready'
          this.dirName = handle.name
          return this.status
        }
        this.pending = handle
        this.status = 'needs-permission'
        this.dirName = handle.name
        return this.status
      }
    } catch {
      /* fall through */
    }
    this.status = 'empty'
    return this.status
  }

  async resumePending(): Promise<boolean> {
    if (!this.pending) return false
    const perm = await (this.pending as any).requestPermission({ mode: 'readwrite' })
    if (perm !== 'granted') return false
    this.dir = this.pending
    this.pending = null
    await this.loadFromDisk()
    this.dirName = this.dir.name
    this.status = 'ready'
    this.onChange?.()
    return true
  }

  async pickDirectory(): Promise<boolean> {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    this.dir = handle
    await idbSet(HANDLE_KEY, handle)
    this.dirName = handle.name
    try {
      await this.loadFromDisk()
    } catch {
      this.data = emptyData()
      await this.persist()
    }
    this.status = 'ready'
    this.onChange?.()
    return true
  }

  async forgetDirectory() {
    await idbDel(HANDLE_KEY)
    this.dir = null
    this.pending = null
    this.data = emptyData()
    this.dirName = ''
    this.status = 'empty'
    this.onChange?.()
  }

  private async loadFromDisk() {
    if (!this.dir) throw new Error('No directory selected')
    const fh = await this.dir.getFileHandle(DATA_FILE)
    const text = await (await fh.getFile()).text()
    const parsed = JSON.parse(text)
    this.data = {
      ...emptyData(),
      ...parsed,
      keys: Array.isArray(parsed.keys) ? parsed.keys : [],
      customProviders: Array.isArray(parsed.customProviders) ? parsed.customProviders : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    }
  }

  private persist(): Promise<void> {
    if (!this.dir) return Promise.resolve()
    this.data.savedAt = Date.now()
    const snapshot = JSON.stringify(this.data, null, 2)
    this.writeChain = this.writeChain.then(async () => {
      try {
        const fh = await this.dir!.getFileHandle(DATA_FILE, { create: true })
        const writable = await (fh as any).createWritable()
        await writable.write(snapshot)
        await writable.close()
      } catch (e) {
        console.error('Failed to write data file:', getErrorMessage(e))
      }
    })
    return this.writeChain
  }

  // ---- encryption ----
  private enc(v: string) {
    return this.data.encryptionKey ? encrypt(v, this.data.encryptionKey) : v
  }
  private dec(v: string) {
    return this.data.encryptionKey ? decrypt(v, this.data.encryptionKey) : v
  }

  setEncryptionKey(key: string | null) {
    if (key) {
      this.data.encryptionKey = key
      this.data.keys = this.data.keys.map((k) => ({ ...k, apiKey: encrypt(k.apiKey, key) }))
    } else if (this.data.encryptionKey) {
      const old = this.data.encryptionKey
      this.data.keys = this.data.keys.map((k) => ({ ...k, apiKey: decrypt(k.apiKey, old) }))
      this.data.encryptionKey = null
    }
    this.persist()
    this.onChange?.()
  }

  isEncryptionEnabled(): boolean {
    return !!this.data.encryptionKey
  }

  // ---- logs ----
  private addLog(action: string, success: boolean) {
    this.data.logs.push({ id: uuid(), action, timestamp: Date.now(), success })
    if (this.data.logs.length > 100) this.data.logs = this.data.logs.slice(-100)
  }

  getLogs(): ActivityLog[] {
    return [...this.data.logs].reverse().slice(0, 50)
  }

  // ---- keys ----
  getKeys(): APIKey[] {
    return this.data.keys.map((k) => ({ ...k, apiKey: this.dec(k.apiKey) }))
  }

  getKeyById(id: string): APIKey | undefined {
    const k = this.data.keys.find((k) => k.id === id)
    return k ? { ...k, apiKey: this.dec(k.apiKey) } : undefined
  }

  addKey(key: Omit<APIKey, 'id' | 'createdAt' | 'updatedAt'>): APIKey {
    const newKey: APIKey = {
      ...key,
      id: uuid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      apiKey: this.enc(key.apiKey),
    }
    this.data.keys.push(newKey)
    this.addLog(`Added key: ${key.name}`, true)
    this.persist()
    this.onChange?.()
    return { ...newKey, apiKey: key.apiKey }
  }

  updateKey(id: string, updates: Partial<APIKey>): APIKey | undefined {
    const idx = this.data.keys.findIndex((k) => k.id === id)
    if (idx === -1) return undefined
    const updated: APIKey = { ...this.data.keys[idx], ...updates, updatedAt: Date.now() }
    if (updates.apiKey) updated.apiKey = this.enc(updates.apiKey)
    this.data.keys[idx] = updated
    this.addLog(`Updated key: ${updated.name}`, true)
    this.persist()
    this.onChange?.()
    return { ...updated, apiKey: this.dec(updated.apiKey) }
  }

  deleteKey(id: string): boolean {
    const idx = this.data.keys.findIndex((k) => k.id === id)
    if (idx === -1) return false
    const name = this.data.keys[idx].name
    this.data.keys.splice(idx, 1)
    this.addLog(`Deleted key: ${name}`, true)
    this.persist()
    this.onChange?.()
    return true
  }

  // ---- custom providers ----
  getCustomProviders(): Provider[] {
    return [...this.data.customProviders]
  }

  addCustomProvider(p: Provider) {
    this.data.customProviders = this.data.customProviders.filter((x) => x.id !== p.id)
    this.data.customProviders.push({ ...p, isCustom: true })
    this.persist()
    this.onChange?.()
  }

  removeCustomProvider(id: string) {
    this.data.customProviders = this.data.customProviders.filter((x) => x.id !== id)
    this.persist()
    this.onChange?.()
  }

  // ---- provider overrides (editable gateway settings on built-in providers) ----
  getProviderOverrides(): Record<string, ProviderOverride> {
    return { ...(this.data.providerOverrides || {}) }
  }

  getProviderOverride(id: string): ProviderOverride | undefined {
    return this.data.providerOverrides?.[id]
  }

  setProviderOverride(id: string, override: ProviderOverride) {
    this.data.providerOverrides = { ...(this.data.providerOverrides || {}) }
    const prev = this.data.providerOverrides[id] || {}
    const next = { ...prev, ...override }
    if (!next.baseUrl) delete next.baseUrl
    if (Object.keys(next).length === 0) delete this.data.providerOverrides[id]
    else this.data.providerOverrides[id] = next
    this.persist()
    this.onChange?.()
  }

  // ---- settings (UI prefs, kept in the browser) ----
  getSettings(): Settings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...updates }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    return this.settings
  }

  // ---- export / import / clear ----
  exportData(): string {
    return JSON.stringify(
      {
        app: 'ai-api-key-manager',
        version: 1,
        exportedAt: Date.now(),
        keys: this.data.keys,
        customProviders: this.data.customProviders,
        logs: this.data.logs,
        encryptionKey: this.data.encryptionKey,
      },
      null,
      2
    )
  }

  importData(json: string): boolean {
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object') return false
      this.data.keys = Array.isArray(parsed.keys) ? parsed.keys : this.data.keys
      this.data.customProviders = Array.isArray(parsed.customProviders) ? parsed.customProviders : this.data.customProviders
      if (parsed.providerOverrides && typeof parsed.providerOverrides === 'object') this.data.providerOverrides = parsed.providerOverrides
      if (Array.isArray(parsed.logs)) this.data.logs = parsed.logs
      if (parsed.encryptionKey !== undefined) this.data.encryptionKey = parsed.encryptionKey
      this.addLog('Data imported', true)
      this.persist()
      this.onChange?.()
      return true
    } catch {
      this.addLog('Data import failed', false)
      return false
    }
  }

  async clearAll() {
    this.data = emptyData()
    this.addLog('All data cleared', true)
    await this.persist()
    this.onChange?.()
  }
}

export const localStore = new LocalStore()
