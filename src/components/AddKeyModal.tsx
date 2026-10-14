import React, { useState, useEffect } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { getProviderById } from '../data/providers'

interface Props {
  open: boolean
  onClose: () => void
  providerId?: string
}

export const AddKeyModal: React.FC<Props> = ({ open, onClose, providerId }) => {
  const { t, addKey, allProviders, setProviderOverride } = useApp()
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState(providerId || '')
  const [note, setNote] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState('')

  const isGateway = provider === 'freellm'
  const effectiveProvider = provider ? getProviderById(provider) : undefined

  useEffect(() => {
    if (isGateway) setGatewayUrl(getProviderById('freellm')?.baseUrl || '')
  }, [isGateway, open])

  if (!open) return null

  const handleSubmit = () => {
    if (!name.trim() || !apiKey.trim()) return
    if (isGateway && gatewayUrl.trim() && gatewayUrl.trim() !== effectiveProvider?.baseUrl) {
      setProviderOverride('freellm', { baseUrl: gatewayUrl.trim() })
    }
    addKey({ name: name.trim(), apiKey: apiKey.trim(), providerId: provider, note })
    setName('')
    setApiKey('')
    setNote('')
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" /> {t('keys.add')}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('keys.name')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Gemini Key"
              className="w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('keys.provider')}</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">{t('keys.selectProvider')}</option>
              {allProviders.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.isCustom ? ' (custom)' : ''}</option>
              ))}
            </select>
          </div>

          {isGateway ? (
            <div className="rounded-lg border bg-background/50 p-3 space-y-3">
              <div className="text-xs font-semibold">
                {t('providers.connection')} : {t('providers.gateway')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('providers.credentialType')}</label>
                <input value={t('providers.staticApiKey')} readOnly className={`${inputCls} text-muted-foreground`} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('providers.gatewayBaseUrl')}</label>
                <input value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} placeholder="http://127.0.0.1:31415" className={`${inputCls} font-mono`} dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('providers.gatewayApiKey')}</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="freellmapi-..."
                  className={`${inputCls} font-mono`}
                  dir="ltr"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('providers.authScheme')}</label>
                <input value={effectiveProvider?.auth.type || 'bearer'} readOnly className={`${inputCls} text-muted-foreground`} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">{t('keys.apiKey')}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t('common.note') || 'Note'}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-muted text-sm">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!name.trim() || !apiKey.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}