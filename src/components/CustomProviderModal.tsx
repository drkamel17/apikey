import React, { useState } from 'react'
import { X, Save, Server } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { ProviderFormat } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const FORMATS: ProviderFormat[] = ['openai', 'anthropic', 'gemini', 'cohere', 'openrouter', 'generic']

type AuthScheme = 'bearer' | 'x-api-key'

export const CustomProviderModal: React.FC<Props> = ({ open, onClose }) => {
  const { t, addCustomProvider, addKey } = useApp()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [authScheme, setAuthScheme] = useState<AuthScheme>('bearer')
  const [format, setFormat] = useState<ProviderFormat>('openai')
  const [modelsPath, setModelsPath] = useState('/v1/models')
  const [chatPath, setChatPath] = useState('/v1/chat/completions')
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!open) return null

  const authHeader = authScheme === 'bearer' ? 'Authorization' : 'x-api-key'
  const authType: 'bearer' | 'key' = authScheme === 'bearer' ? 'bearer' : 'key'

  const reset = () => {
    setName('')
    setBaseUrl('')
    setApiKey('')
    setAuthScheme('bearer')
    setFormat('openai')
    setModelsPath('/v1/models')
    setChatPath('/v1/chat/completions')
    setShowAdvanced(false)
  }

  const handleSubmit = () => {
    if (!name.trim() || !baseUrl.trim()) return
    const created = addCustomProvider({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      format,
      modelsPath: modelsPath.trim() || '/v1/models',
      chatPath: chatPath.trim() || '/v1/chat/completions',
      auth: { header: authHeader, type: authType },
      color: '#6366F1',
    })
    if (created) {
      if (apiKey.trim()) {
        addKey({ name: name.trim(), apiKey: apiKey.trim(), providerId: created.id })
      }
      reset()
      onClose()
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5" /> {t('providers.custom')}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" aria-label={t('common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('providers.customDesc')}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('providers.providerName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Local LLM" className={inputCls} autoFocus />
          </div>

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
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://127.0.0.1:31415" className={`${inputCls} font-mono`} dir="ltr" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('providers.gatewayApiKey')}</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="freellmapi-..." className={`${inputCls} font-mono`} dir="ltr" autoComplete="off" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('providers.authScheme')}</label>
              <select value={authScheme} onChange={(e) => setAuthScheme(e.target.value as AuthScheme)} className={inputCls}>
                <option value="bearer">bearer</option>
                <option value="x-api-key">x-api-key</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? '▾' : '▸'} {t('providers.apiFormat')} / paths
          </button>

          {showAdvanced && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('providers.apiFormat')}</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value as ProviderFormat)} className={inputCls}>
                    {FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Auth header</label>
                  <input value={authHeader} readOnly className={`${inputCls} font-mono text-muted-foreground`} dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Models path</label>
                  <input value={modelsPath} onChange={(e) => setModelsPath(e.target.value)} placeholder="/v1/models" className={`${inputCls} font-mono`} dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chat path</label>
                  <input value={chatPath} onChange={(e) => setChatPath(e.target.value)} placeholder="/v1/chat/completions" className={`${inputCls} font-mono`} dir="ltr" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{t('providers.pathHint')}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-muted text-sm">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={!name.trim() || !baseUrl.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> {t('providers.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
