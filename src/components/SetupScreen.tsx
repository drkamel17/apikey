import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Shield, HardDrive, AlertTriangle, RefreshCw, Sun, Moon, Languages } from 'lucide-react'
import { useApp } from '../hooks/useApp'

export const SetupScreen: React.FC = () => {
  const { t } = useTranslation()
  const { dirStatus, dirName, pickDirectory, resumeDirectory, settings, updateSettings, showToast } = useApp()
  const [busy, setBusy] = useState(false)

  const handlePick = async () => {
    setBusy(true)
    try {
      await pickDirectory()
    } finally {
      setBusy(false)
    }
  }

  const handleResume = async () => {
    setBusy(true)
    try {
      await resumeDirectory()
    } finally {
      setBusy(false)
    }
  }

  const toggleLang = () => updateSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
  const toggleTheme = () => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="w-full max-w-lg">
        <div className="flex justify-end gap-2 mb-6">
          <button onClick={toggleLang} className="p-2 rounded-lg border hover:bg-muted flex items-center gap-1 text-sm" title={t('settings.language')}>
            <Languages className="w-4 h-4" /> {settings.language === 'ar' ? 'EN' : 'ع'}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-lg border hover:bg-muted" title={t('settings.theme')}>
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-card border rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white mb-4">
            <HardDrive className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('setup.subtitle')}</p>

          {dirStatus === 'unsupported' && (
            <div className="mt-6 flex items-start gap-3 text-left p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{t('setup.unsupportedTitle')}</p>
                <p className="mt-1 opacity-90">{t('setup.unsupportedDesc')}</p>
              </div>
            </div>
          )}

          {dirStatus === 'needs-permission' && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border text-left">
                <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{dirName}</p>
                  <p className="text-muted-foreground text-xs">{t('setup.remembered')}</p>
                </div>
              </div>
              <button
                onClick={handleResume}
                disabled={busy}
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                {t('setup.reconnect')}
              </button>
              <button onClick={handlePick} disabled={busy} className="w-full px-4 py-2 rounded-lg border hover:bg-muted text-sm">
                {t('setup.chooseOther')}
              </button>
            </div>
          )}

          {dirStatus === 'empty' && (
            <div className="mt-6 space-y-4">
              <button
                onClick={handlePick}
                disabled={busy}
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {busy ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                {t('setup.chooseFolder')}
              </button>
              <p className="text-xs text-muted-foreground">{t('setup.createHint')}</p>
            </div>
          )}

          <div className="mt-6 flex items-start gap-3 text-left p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-medium">{t('setup.privacyTitle')}</p>
              <p className="mt-1 opacity-90">{t('setup.privacyDesc')}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('setup.footerNote')}
        </p>
      </div>
    </div>
  )
}
