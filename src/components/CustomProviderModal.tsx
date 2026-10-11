import React, { useState } from 'react'
import { X, Save, Server } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { ProviderFormat } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const FORMATS: ProviderFormat[] = ['openai', 'anthropic', 'gemini', 'cohere', 'openrouter', 'generic']

export const CustomProviderModal: React.FC<Props> = ({ open, onClose }) => {
  const { t, addCustomProvider } = useApp()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [format, setFormat] = useState<ProviderFormat>('openai')
  const [modelsPath, setModelsPath] = useState('/v1/models')
  const [chatPath, setChatPath] = useState('/v1/chat/completions')
  const [authHeader, setAuthHeader] = useState('Authorization')
  const [authType, setAuthType] = useState<'bearer' | 'key' | 'custom'>('bearer')

  if (!open) return null

  const handleSubmit = () => {
    if (!name.trim() || !baseUrl.trim()) return
    const created = addCustomProvider({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      format,
      modelsPath: modelsPath.trim() || '/v1/models',
      chatPath: chatPath.trim() || '/v1/chat/completions',
      auth: { header: authHeader.trim() || 'Authorization', type: authType },
      color: '#6366F1',
    })
    if (created) {
      setName('')
      setBaseUrl('')
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

          <div>
            <label className="block text-sm font-medium mb-1">{t('providers.apiUrl')}</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" className={`${inputCls} font-mono`} dir="ltr" />
          </div>

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
              <label className="block text-sm font-medium mb-1">Auth type</label>
              <select value={authType} onChange={(e) => setAuthType(e.target.value as 'bearer' | 'key' | 'custom')} className={inputCls}>
                <option value="bearer">Bearer</option>
                <option value="key">API key header</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Auth header</label>
            <input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="Authorization" className={`${inputCls} font-mono`} dir="ltr" />
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
