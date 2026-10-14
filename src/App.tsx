import React from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, KeyRound, Server, FlaskConical, Settings, Sparkles, Key, Bot } from 'lucide-react'
import { useApp, AppProvider } from './hooks/useApp'
import { Dashboard } from './components/Dashboard'
import { KeysView } from './components/KeysView'
import { ProvidersView } from './components/ProvidersView'
import { Playground } from './components/Playground'
import { AgentView } from './components/AgentView'
import { SettingsView } from './components/SettingsView'
import { ToastContainer } from './components/Toast'
import { SetupScreen } from './components/SetupScreen'

const App: React.FC = () => {
  const { t } = useTranslation()
  const { activeTab, setActiveTab, toasts, removeToast, ready, dirName } = useApp()
  const nav = [
    { id: 'dashboard', label: 'app.dashboard', icon: LayoutDashboard },
    { id: 'keys', label: 'app.keys', icon: KeyRound },
    { id: 'providers', label: 'app.providers', icon: Server },
    { id: 'playground', label: 'app.playground', icon: FlaskConical },
    { id: 'agent', label: 'app.agent', icon: Bot },
    { id: 'settings', label: 'app.settings', icon: Settings },
  ] as const

  if (!ready) {
    return (
      <>
        <SetupScreen />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="w-16 lg:w-60 flex-shrink-0 border-r flex flex-col bg-card">
        <div className="p-4 flex items-center gap-2 border-b">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-sm leading-tight">AI API</h1>
            <p className="text-[10px] text-muted-foreground">Key Manager</p>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title={t(label)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block">{t(label)}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t hidden lg:block">
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <p className="flex items-center gap-1 font-medium text-foreground mb-1">
              <Key className="w-3 h-3" /> {t('app.dashboard')}
            </p>
            <p className="truncate" title={dirName}>{t('setup.storageFolder')}: {dirName || '—'}</p>
            <p>v1.0.0</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'keys' && <KeysView />}
        {activeTab === 'providers' && <ProvidersView />}
        {activeTab === 'playground' && <Playground />}
        {activeTab === 'agent' && <AgentView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

const AppWrapper: React.FC = () => (
  <AppProvider>
    <App />
  </AppProvider>
)

export default AppWrapper
