import React, { useState } from 'react'
import { Plus, Search, Filter, Trash2, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { AddKeyModal } from './AddKeyModal'
import { KeyStatusBadge } from './KeyStatusBadge'
import { getProviderById } from '../data/providers'
import { APIKey } from '../types'

export const KeysView: React.FC = () => {
  const { t, filteredKeys, searchQuery, setSearchQuery, deleteKey, testKey, discoverModelsFor, showToast, refreshKeys, updateKey } = useApp() as any
  const [modalOpen, setModalOpen] = useState(false)
  const [editKey, setEditKey] = useState<APIKey | null>(null)
  const [filter, setFilter] = useState<'all' | 'working' | 'failed' | 'untested'>('all')
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = filteredKeys.filter((k) => filter === 'all' || k.status === filter)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleEdit = (key: APIKey) => {
    setEditKey(key)
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm(t('keys.deleteConfirm'))) {
      deleteKey(id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('keys.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t('keys.filterAll')}</p>
        </div>
        <button
          onClick={() => { setEditKey(null); setModalOpen(true) }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> {t('keys.add')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('keys.search')}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'working', 'failed', 'untested'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm border ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              {t(`keys.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-3">🔑</div>
          <p>{t('keys.noKeysDesc')}</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">{t('keys.name')}</th>
                  <th className="text-left p-3 font-medium">{t('keys.provider')}</th>
                  <th className="text-left p-3 font-medium">{t('keys.apiKey')}</th>
                  <th className="text-left p-3 font-medium">{t('keys.status')}</th>
                  <th className="text-right p-3 font-medium">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((key) => {
                  const provider = getProviderById(key.providerId)
                  const visible = visibleKeys[key.id]
                  return (
                    <tr key={key.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{key.name}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs" style={{ backgroundColor: provider?.color || '#666' }}>
                            {(provider?.name || '?')[0]}
                          </div>
                          <span className="text-muted-foreground">{provider?.name || key.providerId}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span>{visible ? key.apiKey : '••••••••••••'}</span>
                          <button onClick={() => toggleVisibility(key.id)} className="p-1 hover:bg-muted rounded">
                            {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button onClick={() => handleCopy(key.apiKey, key.id)} className="p-1 hover:bg-muted rounded">
                            {copied === key.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3"><KeyStatusBadge status={key.status} /></td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => testKey(key.id)} className="p-2 rounded hover:bg-muted" title={t('keys.test')}>
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => discoverModelsFor(key.id)} className="p-2 rounded hover:bg-muted" title={t('providers.discover')}>
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(key)} className="p-2 rounded hover:bg-muted" title={t('keys.edit')}>
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(key.id)} className="p-2 rounded hover:bg-red-500/10 text-red-500" title={t('keys.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <AddKeyModal open={modalOpen} onClose={() => { setModalOpen(false); setEditKey(null) }} providerId={editKey?.providerId} />
    </div>
  )
}