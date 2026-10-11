import React, { useRef, useState } from 'react'
import {
  Sun, Moon, Monitor, Download, Upload, Trash2, Shield,
  Languages, Type, Save, Check, FolderOpen, HardDrive,
} from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { Settings } from '../types'

export const SettingsView: React.FC = () => {
  const {
    t, settings, updateSettings, exportData, importData, clearAllData, showToast,
    dirName, forgetDirectory, pickDirectory, encryptionEnabled, setEncryptionKey,
  } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [masterPassword, setMasterPassword] = useState('')
  const [keySaved, setKeySaved] = useState(false)

  const handleExport = () => exportData()

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => importData(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClear = () => {
    if (confirm(t('settings.clearConfirm'))) clearAllData()
  }

  const handleSetEncryptionKey = () => {
    if (!masterPassword) return
    setEncryptionKey(masterPassword)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <section className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Languages className="w-4 h-4" /> {t('settings.language')}
        </h2>
        <div className="flex gap-2">
          {(['en', 'ar'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => updateSettings({ language: lang })}
              className={`px-4 py-2 rounded-lg border text-sm ${settings.language === lang ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              {lang === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Monitor className="w-4 h-4" /> {t('settings.theme')}
        </h2>
        <div className="flex gap-2">
          {([
            { value: 'light', icon: Sun, label: t('settings.light') },
            { value: 'dark', icon: Moon, label: t('settings.dark') },
            { value: 'system', icon: Monitor, label: t('settings.system') },
          ] as const).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => updateSettings({ theme: value })}
              className={`px-4 py-2 rounded-lg border text-sm flex items-center gap-2 ${settings.theme === value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <h2 className="font-semibold flex items-center gap-2 pt-2">
          <Type className="w-4 h-4" /> {t('settings.fontSize')}
        </h2>
        <div className="flex gap-2">
          {([
            { value: 'small', label: t('settings.small') },
            { value: 'medium', label: t('settings.medium') },
            { value: 'large', label: t('settings.large') },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateSettings({ fontSize: value })}
              className={`px-4 py-2 rounded-lg border text-sm ${settings.fontSize === value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-card border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" /> {t('security.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('security.storageWarning')}</p>
        <div className="flex gap-2 items-center">
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Master password"
            className="flex-1 px-3 py-2 rounded-lg bg-background border text-sm"
          />
          <button
            onClick={handleSetEncryptionKey}
            disabled={!masterPassword}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {keySaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {encryptionEnabled ? t('settings.storageEncrypted') : t('security.enableEncryption')}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t('security.encryptionNote')}</p>
      </section>

      <section className="bg-card border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <HardDrive className="w-4 h-4" /> {t('settings.storage')}
        </h2>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
          <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="text-sm min-w-0">
            <p className="text-muted-foreground text-xs">{t('setup.storageFolder')}</p>
            <p className="font-medium truncate" title={dirName}>{dirName || '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => pickDirectory()} className="px-4 py-2 rounded-lg border hover:bg-muted text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> {t('setup.chooseOther')}
          </button>
          <button onClick={() => { if (confirm(t('settings.clearConfirm'))) forgetDirectory() }} className="px-4 py-2 rounded-lg border text-sm">
            {t('setup.disconnected')}
          </button>
        </div>
      </section>

      <section className="bg-card border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.storage')}</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="px-4 py-2 rounded-lg border hover:bg-muted text-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> {t('settings.export')}
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border hover:bg-muted text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" /> {t('settings.import')}
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={handleClear} className="px-4 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> {t('settings.clearAll')}
          </button>
        </div>
      </section>
    </div>
  )
}
