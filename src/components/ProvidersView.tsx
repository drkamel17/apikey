import React, { useState } from 'react'
import { RefreshCw, Copy, Check, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { CustomProviderModal } from './CustomProviderModal'
import { DiscoveredModel } from '../types'

export const ProvidersView: React.FC = () => {
  const { t, keys, allProviders, deleteCustomProvider, discoverModelsFor } = useApp()
  const [selectedKey, setSelectedKey] = useState<Record<string, string>>({})
  const [models, setModels] = useState<Record<string, DiscoveredModel[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)

  const handleDiscover = async (keyId: string) => {
    setLoading((prev) => ({ ...prev, [keyId]: true }))
    try {
      const result = await discoverModelsFor(keyId)
      setModels((prev) => ({ ...prev, [keyId]: result }))
    } finally {
      setLoading((prev) => ({ ...prev, [keyId]: false }))
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('providers.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{allProviders.length} {t('providers.providersCount')}</p>
        </div>
        <button
          onClick={() => setCustomOpen(true)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> {t('keys.addCustom')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allProviders.map((provider) => {
          const keyCount = keys.filter((k) => k.providerId === provider.id).length
          const selectedKeyId = selectedKey[provider.id] || ''
          const providerModels = selectedKeyId ? (models[selectedKeyId] || []) : []
          return (
            <div key={provider.id} className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: provider.color }}>
                    {provider.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold">{provider.name}</h3>
                    <span className="text-xs text-muted-foreground">{provider.format}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {provider.docsUrl && (
                    <a href={provider.docsUrl} target="_blank" rel="noopener" className="p-1 hover:bg-muted rounded" title={provider.docsUrl}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {provider.isCustom && (
                    <button
                      onClick={() => { if (confirm(t('keys.deleteConfirm'))) deleteCustomProvider(provider.id) }}
                      className="p-1 hover:bg-red-500/10 text-red-500 rounded"
                      title={t('keys.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>{keyCount} {t('keys.filterAll')}</span>
                <span>•</span>
                <span>{provider.freeModels.length} {t('providers.free')}</span>
              </div>

              {provider.id === 'freellm' && (() => {
                const providerKey = keys.find((k: any) => k.providerId === provider.id)
                const maskedKey = providerKey
                  ? '•'.repeat(Math.min(48, Math.max(16, providerKey.apiKey.length)))
                  : t('providers.notSet')
                const urlId = `${provider.id}-baseurl`
                return (
                  <div className="mb-3 rounded-lg border bg-background/50 p-3 space-y-2">
                    <div className="text-xs font-semibold">
                      {t('providers.connection')} : {t('providers.gateway')}
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {t('providers.gatewayCredentials')}
                    </div>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-muted-foreground">{t('providers.credentialType')}</dt>
                        <dd className="text-right">{t('providers.staticApiKey')}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-muted-foreground">{t('providers.gatewayBaseUrl')}</dt>
                        <dd className="flex items-center gap-1 font-mono text-right min-w-0">
                          <span className="truncate">{provider.baseUrl}</span>
                          <button onClick={() => handleCopy(provider.baseUrl, urlId)} className="p-0.5 hover:bg-muted rounded flex-shrink-0">
                            {copied === urlId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-muted-foreground">{t('providers.gatewayApiKey')}</dt>
                        <dd className="font-mono text-right truncate max-w-[55%]">{maskedKey}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <dt className="text-muted-foreground">{t('providers.authScheme')}</dt>
                        <dd className="text-right">{provider.auth.type}</dd>
                      </div>
                    </dl>
                  </div>
                )
              })()}

              <div className="space-y-2">
                <label className="block text-xs font-medium">{t('providers.discover')}</label>
                <select
                  value={selectedKeyId}
                  onChange={(e) => setSelectedKey((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded bg-background border text-xs"
                >
                  <option value="">{t('keys.selectProvider')}</option>
                  {keys.filter((k) => k.providerId === provider.id).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedKeyId && handleDiscover(selectedKeyId)}
                  disabled={!selectedKeyId || loading[selectedKeyId]}
                  className="w-full px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-xs flex items-center justify-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${selectedKeyId && loading[selectedKeyId] ? 'animate-spin' : ''}`} />
                  {t('providers.refresh')}
                </button>
              </div>

              {selectedKeyId && providerModels.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-2">{t('providers.models')} ({providerModels.length})</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {providerModels.slice(0, 6).map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="font-mono truncate">{m.id}</span>
                        <div className="flex items-center gap-1">
                          {m.free && <span className="text-emerald-500 text-[10px]">free</span>}
                          <button onClick={() => handleCopy(m.id, m.id)} className="p-0.5 hover:bg-muted rounded">
                            {copied === m.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {providerModels.length > 6 && (
                      <p className="text-[10px] text-muted-foreground">+{providerModels.length - 6} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <CustomProviderModal open={customOpen} onClose={() => setCustomOpen(false)} />
    </div>
  )
}