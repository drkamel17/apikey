import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { localStore, DirStatus } from '../services/fs-storage'
import { Settings, APIKey, TestResult, DiscoveredModel, Provider } from '../types'
import { PROVIDERS, getProviderById } from '../data/providers'
import { testApiKey, discoverModels, sendChat } from '../services/api'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface AppState {
  t: (key: string, options?: any) => string
  i18n: any
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  keys: APIKey[]
  filteredKeys: APIKey[]
  refreshKeys: () => void
  addKey: (data: { name: string; apiKey: string; providerId: string; note?: string }) => APIKey | null
  updateKey: (id: string, updates: Partial<APIKey>) => APIKey | undefined
  deleteKey: (id: string) => void
  testKey: (id: string) => Promise<TestResult | null>
  testAllKeys: () => Promise<void>
  discoverModelsFor: (keyId: string) => Promise<DiscoveredModel[]>
  sendChatMessage: (keyId: string, model: string, messages: any[], options?: any) => Promise<string>
  exportData: () => void
  importData: (json: string) => void
  clearAllData: () => void
  activeTab: 'dashboard' | 'keys' | 'providers' | 'playground' | 'settings'
  setActiveTab: (tab: any) => void
  toasts: Toast[]
  showToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  allProviders: Provider[]
  refreshProviders: () => void
  addCustomProvider: (data: Omit<Provider, 'id' | 'isCustom' | 'freeModels' | 'docsUrl'> & { docsUrl?: string, auth?: { header: string; type: 'bearer' | 'key' | 'custom'; version?: string } }) => Provider | null
  deleteCustomProvider: (id: string) => void
  // local-folder storage
  ready: boolean
  dirStatus: DirStatus
  dirName: string
  pickDirectory: () => Promise<boolean>
  resumeDirectory: () => Promise<boolean>
  forgetDirectory: () => Promise<void>
  encryptionEnabled: boolean
  setEncryptionKey: (key: string | null) => void
}

const AppContext = createContext<AppState | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<Settings>(localStore.getSettings())
  const [keys, setKeys] = useState<APIKey[]>([])
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('dashboard')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [allProviders, setAllProviders] = useState<Provider[]>(() => [...PROVIDERS, ...localStore.getCustomProviders()])
  const [ready, setReady] = useState(false)
  const [dirStatus, setDirStatus] = useState<DirStatus>('empty')
  const [dirName, setDirName] = useState('')
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)

  const syncFromStore = useCallback(() => {
    setKeys(localStore.getKeys())
    setAllProviders([...PROVIDERS, ...localStore.getCustomProviders()])
    setEncryptionEnabled(localStore.isEncryptionEnabled())
    setDirName(localStore.dirName)
    setDirStatus(localStore.status)
    setReady(localStore.status === 'ready')
  }, [])

  useEffect(() => {
    localStore.onChange = syncFromStore
    let mounted = true
    ;(async () => {
      const status = await localStore.init()
      if (!mounted) return
      syncFromStore()
      setDirStatus(status)
      setReady(status === 'ready')
    })()
    return () => {
      mounted = false
      localStore.onChange = null
    }
  }, [syncFromStore])

  useEffect(() => {
    i18n.changeLanguage(settings.language)
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = settings.language
    const theme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-font-size', settings.fontSize)
  }, [settings.language, settings.theme, settings.fontSize, i18n])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    if (!message) return
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = localStore.updateSettings(updates)
    setSettings(newSettings)
    showToast(t('settings.settingsSaved'), 'success')
  }

  const refreshKeys = () => setKeys(localStore.getKeys())
  const refreshProviders = useCallback(() => setAllProviders([...PROVIDERS, ...localStore.getCustomProviders()]), [])

  // ---- directory ----
  const pickDirectory = async () => {
    try {
      await localStore.pickDirectory()
      syncFromStore()
      showToast(t('setup.connected'), 'success')
      return true
    } catch (err: any) {
      if (err?.name !== 'AbortError') showToast(t('setup.pickError'), 'error')
      return false
    }
  }

  const resumeDirectory = async () => {
    const ok = await localStore.resumePending()
    syncFromStore()
    if (ok) showToast(t('setup.connected'), 'success')
    else showToast(t('setup.permissionDenied'), 'error')
    return ok
  }

  const forgetDirectory = async () => {
    await localStore.forgetDirectory()
    syncFromStore()
    showToast(t('setup.disconnected'), 'info')
  }

  const setEncryptionKey = (key: string | null) => {
    localStore.setEncryptionKey(key)
    syncFromStore()
    showToast(t('settings.settingsSaved'), 'success')
  }

  // ---- keys ----
  const addKey = (data: { name: string; apiKey: string; providerId: string; note?: string }) => {
    if (!data.name.trim()) { showToast(t('keys.nameRequired'), 'error'); return null }
    if (!data.apiKey.trim()) { showToast(t('keys.apiKeyRequired'), 'error'); return null }
    const key = localStore.addKey({
      name: data.name.trim(),
      apiKey: data.apiKey.trim(),
      providerId: data.providerId,
      status: 'untested',
      note: data.note?.trim() || undefined,
    })
    refreshKeys()
    showToast(t('toast.keyAdded'), 'success')
    return key
  }

  const updateKey = (id: string, updates: Partial<APIKey>) => {
    const key = localStore.updateKey(id, updates)
    if (key) {
      refreshKeys()
      showToast(t('toast.keyUpdated'), 'success')
    }
    return key
  }

  const deleteKey = (id: string) => {
    if (localStore.deleteKey(id)) {
      refreshKeys()
      showToast(t('toast.keyDeleted'), 'success')
    }
  }

  const testKey = async (id: string): Promise<TestResult | null> => {
    const key = localStore.getKeyById(id)
    if (!key) return null
    const provider = getProviderById(key.providerId)
    if (!provider) { showToast(t('common.unknown'), 'error'); return null }
    const result = await testApiKey(key)
    localStore.updateKey(id, { status: result.success ? 'working' : 'failed', lastTested: result.timestamp, models: result.models })
    refreshKeys()
    if (result.success) {
      showToast(t('toast.keyTested'), 'success')
    } else {
      showToast(`${t('toast.keyTestFailed')}: ${result.message || t('common.error')}`, 'error')
    }
    return result
  }

  const testAllKeys = async () => {
    const all = localStore.getKeys()
    for (const k of all) {
      await testKey(k.id)
    }
  }

  const discoverModelsFor = async (keyId: string): Promise<DiscoveredModel[]> => {
    const key = localStore.getKeyById(keyId)
    if (!key) return []
    const provider = getProviderById(key.providerId)
    if (!provider) return []
    try {
      const models = await discoverModels(provider, key.apiKey)
      localStore.updateKey(keyId, { models: models.map((m) => m.id) })
      refreshKeys()
      showToast(t('toast.modelsDiscovered'), 'success')
      return models
    } catch (err) {
      showToast(`${t('providers.discoverError')}: ${err instanceof Error ? err.message : t('common.error')}`, 'error')
      return []
    }
  }

  const sendChatMessage = async (keyId: string, model: string, messages: any[], options: any = {}): Promise<string> => {
    const key = localStore.getKeyById(keyId)
    if (!key) throw new Error(t('playground.noKey'))
    const provider = getProviderById(key.providerId)
    if (!provider) throw new Error(t('common.unknown'))
    return sendChat(provider, key.apiKey, model, messages, options)
  }

  const exportData = () => {
    const data = localStore.exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-api-keys-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(t('toast.dataExported'), 'success')
  }

  const importData = (json: string) => {
    if (localStore.importData(json)) {
      refreshKeys()
      refreshProviders()
      showToast(t('toast.dataImported'), 'success')
    } else {
      showToast(t('common.error'), 'error')
    }
  }

  const clearAllData = () => {
    localStore.clearAll()
    refreshKeys()
    showToast(t('toast.dataCleared'), 'success')
  }

  const addCustomProvider = (data: Omit<Provider, 'id' | 'isCustom' | 'freeModels' | 'docsUrl'> & { docsUrl?: string, auth?: { header: string; type: 'bearer' | 'key' | 'custom'; version?: string } }) => {
    if (!data.name.trim()) { showToast(t('keys.nameRequired'), 'error'); return null }
    if (!data.baseUrl.trim()) { showToast(t('common.error'), 'error'); return null }
    const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom'
    const provider: Provider = {
      ...data,
      id: `custom-${slug}-${Date.now().toString(36)}`,
      name: data.name.trim(),
      baseUrl: data.baseUrl.trim().replace(/\/+$/, ''),
      auth: data.auth ?? { header: 'Authorization', type: 'bearer' },
      freeModels: [],
      docsUrl: data.docsUrl?.trim() || '',
      isCustom: true,
    }
    localStore.addCustomProvider(provider)
    refreshProviders()
    showToast(t('toast.customProviderAdded'), 'success')
    return provider
  }

  const deleteCustomProvider = (id: string) => {
    localStore.removeCustomProvider(id)
    refreshProviders()
    showToast(t('toast.providerDeleted'), 'success')
  }

  const filteredKeys = keys.filter((k) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return k.name.toLowerCase().includes(q) ||
           k.apiKey.toLowerCase().includes(q) ||
           k.providerId.toLowerCase().includes(q)
  })

  const value: AppState = {
    t, i18n, settings, updateSettings,
    keys, filteredKeys, refreshKeys,
    addKey, updateKey, deleteKey, testKey, testAllKeys,
    discoverModelsFor, sendChatMessage,
    exportData, importData, clearAllData,
    activeTab, setActiveTab,
    toasts, showToast, removeToast,
    searchQuery, setSearchQuery,
    allProviders, refreshProviders, addCustomProvider, deleteCustomProvider,
    ready, dirStatus, dirName, pickDirectory, resumeDirectory, forgetDirectory,
    encryptionEnabled, setEncryptionKey,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = (): AppState => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
