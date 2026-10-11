import React, { useState } from 'react'
import { X, Plus, Save } from 'lucide-react'
import { useApp } from '../hooks/useApp'

interface Props {
  open: boolean
  onClose: () => void
  providerId?: string
}

export const AddKeyModal: React.FC<Props> = ({ open, onClose, providerId }) => {
  const { t, addKey, allProviders } = useApp()
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState(providerId || '')
  const [note, setNote] = useState('')

  if (!open) return null

  const handleSubmit = () => {
    if (!name.trim() || !apiKey.trim()) return
    addKey({ name: name.trim(), apiKey: apiKey.trim(), providerId: provider, note })
    setName('')
    setApiKey('')
    setNote('')
    onClose()
  }

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
            <label className="block text-sm font-medium mb-1">{t('keys.apiKey')}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
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