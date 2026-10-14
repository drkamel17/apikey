import React, { useState, useEffect, useRef } from 'react'
import { FolderOpen, FolderX, Loader2, Play, FileText, Folder, ClipboardList, AlertCircle, Bot, Terminal as TerminalIcon } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { getProviderById } from '../data/providers'
import { DiscoveredModel } from '../types'
import { discoverModels } from '../services/api'
import { workspace, WorkspaceStatus } from '../services/workspace'
import { runAgent, AgentStep } from '../services/agent'

export const AgentView: React.FC = () => {
  const { t, keys, sendChatMessage, showToast } = useApp()
  const workingKeys = keys.filter((k) => k.status === 'working' || k.status === 'untested')

  const [folderStatus, setFolderStatus] = useState<WorkspaceStatus>(workspace.status)
  const [folderName, setFolderName] = useState(workspace.name)

  const [selectedKey, setSelectedKey] = useState('auto')
  const [selectedModel, setSelectedModel] = useState('auto')
  const [availableModels, setAvailableModels] = useState<DiscoveredModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [freeOnly, setFreeOnly] = useState(false)
  const [freeModelIds, setFreeModelIds] = useState<string[]>([])

  const [task, setTask] = useState('')
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [running, setRunning] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => {
      setFolderStatus(workspace.status)
      setFolderName(workspace.name)
    }
    workspace.onChange = sync
    ;(async () => {
      await workspace.init()
      sync()
    })()
    return () => {
      workspace.onChange = null
    }
  }, [])

  useEffect(() => {
    logRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps])

  const pickFolder = async () => {
    try {
      await workspace.pick()
      setFolderStatus(workspace.status)
      setFolderName(workspace.name)
      showToast(t('agent.folderConnected'), 'success')
    } catch (err: any) {
      if (err?.name !== 'AbortError') showToast(t('setup.pickError'), 'error')
    }
  }

  const resumeFolder = async () => {
    const ok = await workspace.resume()
    setFolderStatus(workspace.status)
    setFolderName(workspace.name)
    showToast(ok ? t('agent.folderConnected') : t('setup.permissionDenied'), ok ? 'success' : 'error')
  }

  const forgetFolder = async () => {
    await workspace.forget()
    setFolderStatus(workspace.status)
    setFolderName(workspace.name)
    showToast(t('setup.disconnected'), 'info')
  }

  const isFreeModel = (m: DiscoveredModel) => {
    if (!freeModelIds.length) return false
    const base = m.id.includes('/') ? m.id.split('/').pop() || m.id : m.id
    return freeModelIds.some((f) => f === m.id || f === base)
  }

  const displayModels = freeOnly ? availableModels.filter(isFreeModel) : availableModels

  const loadModels = async () => {
    const keysToLoad = selectedKey === 'auto' ? workingKeys : workingKeys.filter((k) => k.id === selectedKey)
    if (keysToLoad.length === 0) return
    const key = keysToLoad[0]
    const provider = getProviderById(key.providerId)
    if (!provider) return
    setLoadingModels(true)
    try {
      const models = await discoverModels(provider, key.apiKey)
      setAvailableModels(models)
      setFreeModelIds(provider.freeModels || [])
      setSelectedModel((prev) => (models.some((m) => m.id === prev) ? prev : 'auto'))
    } catch (err: any) {
      showToast(`${t('providers.discoverError')}: ${err.message}`, 'error')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleRun = async () => {
    if (running) return
    if (!workspace.isReady()) {
      showToast(t('agent.noFolder'), 'error')
      return
    }
    if (!task.trim()) return
    const keysToUse = selectedKey === 'auto' ? workingKeys : workingKeys.filter((k) => k.id === selectedKey)
    if (keysToUse.length === 0) {
      showToast(t('playground.noKey'), 'error')
      return
    }

    const keyId = keysToUse[0].id
    const model = selectedModel || 'auto'
    setRunning(true)
    setSteps([])

    try {
      await runAgent(
        (messages) => sendChatMessage(keyId, model, messages, { temperature: 0.2, maxTokens: 2048 }),
        task.trim(),
        {
          maxSteps: 12,
          onStep: (step) => setSteps((prev) => [...prev, step]),
        }
      )
    } catch (err: any) {
      setSteps((prev) => [...prev, { type: 'error', content: err?.message || String(err) }])
      showToast(`${t('playground.error')}: ${err?.message || ''}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  const stepIcon = (step: AgentStep) => {
    if (step.type === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
    if (step.type === 'message') return <Bot className="w-4 h-4 text-emerald-500" />
    if (step.tool === 'write_file' || step.tool === 'create_folder') return <FileText className="w-4 h-4 text-blue-500" />
    if (step.tool === 'list_files') return <ClipboardList className="w-4 h-4 text-amber-500" />
    return <TerminalIcon className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6" /> {t('agent.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('agent.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="space-y-4 overflow-y-auto">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('agent.workspace')}</h3>
            <div className="flex items-center gap-2 text-sm">
              <Folder className="w-4 h-4 text-muted-foreground" />
              <span className="truncate font-mono">{folderName || t('agent.noFolderSelected')}</span>
            </div>

            {folderStatus === 'unsupported' && (
              <p className="text-xs text-red-500">{t('setup.unsupportedTitle')}</p>
            )}

            <div className="flex gap-2">
              {folderStatus !== 'ready' && folderStatus !== 'unsupported' && (
                <button
                  onClick={pickFolder}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" /> {t('agent.pickFolder')}
                </button>
              )}
              {folderStatus === 'needs-permission' && (
                <button
                  onClick={resumeFolder}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
                >
                  {t('setup.reconnect')}
                </button>
              )}
              {folderStatus === 'ready' && (
                <button
                  onClick={forgetFolder}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm flex items-center justify-center gap-2"
                >
                  <FolderX className="w-4 h-4" /> {t('agent.changeFolder')}
                </button>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('playground.selectKey')}</h3>
            <select
              value={selectedKey}
              onChange={(e) => { setSelectedKey(e.target.value); setAvailableModels([]); setFreeModelIds([]); setSelectedModel('auto') }}
              className="w-full px-3 py-2 rounded-lg bg-background border text-sm"
            >
              <option value="auto">{t('playground.autoKey')}</option>
              {workingKeys.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>

            <button
              onClick={loadModels}
              disabled={loadingModels}
              className="w-full px-3 py-2 rounded-lg bg-secondary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingModels && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('providers.discover')}
            </button>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border text-sm font-mono"
              disabled={displayModels.length === 0}
            >
              <option value="auto">{t('playground.autoModel')}</option>
              {displayModels.map((m) => (
                <option key={m.id} value={m.id}>{m.id}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="accent-primary"
              />
              {t('playground.freeOnly')}
            </label>
          </div>
        </div>

        <div className="lg:col-span-3 bg-card border rounded-xl flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {steps.length === 0 && !running && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Bot className="w-12 h-12 mb-3 opacity-30" />
                <p>{t('agent.hint')}</p>
              </div>
            )}

            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <div className="mt-0.5 flex-shrink-0">{stepIcon(step)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted-foreground">
                    {step.type === 'tool' && `${step.tool} ${JSON.stringify(step.args || {})}`}
                    {step.type === 'result' && t('agent.result')}
                    {step.type === 'error' && t('common.error')}
                    {step.type === 'message' && t('agent.answer')}
                  </div>
                  {(step.type === 'result' || step.type === 'message' || step.type === 'error') && (
                    <pre className="whitespace-pre-wrap break-words text-xs mt-1 bg-muted rounded-lg p-2 max-h-64 overflow-y-auto">
                      {step.content}
                    </pre>
                  )}
                </div>
              </div>
            ))}

            {running && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t('agent.working')}
              </div>
            )}
            <div ref={logRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() } }}
                placeholder={t('agent.taskPlaceholder')}
                rows={2}
                className="flex-1 px-3 py-2 rounded-lg bg-background border text-sm resize-none"
                disabled={running}
              />
              <button
                onClick={handleRun}
                disabled={running || !task.trim() || !workspace.isReady()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {t('agent.run')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
