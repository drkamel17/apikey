import React from 'react'
import { Key, Zap, AlertCircle, Server, Activity } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { getProviderById } from '../data/providers'
import { KeyStatusBadge } from './KeyStatusBadge'

export const Dashboard: React.FC = () => {
  const { t, keys, testAllKeys, discoverModelsFor, setActiveTab } = useApp() as any

  const total = keys.length
  const working = keys.filter((k) => k.status === 'working').length
  const failed = keys.filter((k) => k.status === 'failed').length
  const untested = keys.filter((k) => k.status === 'untested').length
  const providers = new Set(keys.map((k) => k.providerId)).size

  const recent = [...keys].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  const stats = [
    { label: t('dashboard.totalKeys'), value: total, icon: Key, color: 'text-blue-500' },
    { label: t('dashboard.workingKeys'), value: working, icon: Zap, color: 'text-emerald-500' },
    { label: t('dashboard.failedKeys'), value: failed, icon: AlertCircle, color: 'text-red-500' },
    { label: t('dashboard.providersCount'), value: providers, icon: Server, color: 'text-purple-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-card border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <Icon className={`w-10 h-10 ${stat.color} opacity-20`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> {t('dashboard.recentActivity')}
          </h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">{t('keys.noKeysDesc')}</p>
          ) : (
            <div className="space-y-3">
              {recent.map((k) => {
                const provider = getProviderById(k.providerId)
                return (
                  <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: provider?.color || '#666' }}>
                        {(provider?.name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{k.name}</p>
                        <p className="text-xs text-muted-foreground">{provider?.name || k.providerId}</p>
                      </div>
                    </div>
                    <KeyStatusBadge status={k.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">{t('dashboard.quickActions')}</h2>
          <div className="space-y-2">
            <button onClick={testAllKeys} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" /> {t('dashboard.testAllKeys')}
            </button>
            <button onClick={() => discoverModelsFor(keys[0]?.id)} disabled={!keys.length} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted disabled:opacity-50 text-sm flex items-center gap-2">
              <Server className="w-4 h-4" /> {t('dashboard.discoverModels')}
            </button>
            <button onClick={() => setActiveTab('playground')} disabled={!keys.length} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted disabled:opacity-50 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> {t('dashboard.openPlayground')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}