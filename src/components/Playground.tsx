import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Trash2, Copy, Check, Terminal, Loader2, Type, Code2, Eye, Image as ImageIcon, Video, Music, Boxes, Brain } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { getProviderById } from '../data/providers'
import { DiscoveredModel } from '../types'
import { discoverModels } from '../services/api'
import { getModelTraits, ModelTrait } from '../utils/modelTraits'
import type { LucideIcon } from 'lucide-react'

const TRAIT_ICONS: Record<ModelTrait, LucideIcon> = {
  text: Type,
  code: Code2,
  vision: Eye,
  image: ImageIcon,
  video: Video,
  audio: Music,
  embedding: Boxes,
  reasoning: Brain,
}

const TRAIT_EMOJI: Record<ModelTrait, string> = {
  text: '💬',
  code: '💻',
  vision: '👁️',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  embedding: '🧩',
  reasoning: '🧠',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
  temperature?: number
}

export const Playground: React.FC = () => {
  const { t, keys, sendChatMessage, showToast } = useApp() as any
  const workingKeys = keys.filter((k) => k.status === 'working' || k.status === 'untested')

  const [selectedKey, setSelectedKey] = useState('auto')
  const [selectedModel, setSelectedModel] = useState('')
  const [availableModels, setAvailableModels] = useState<DiscoveredModel[]>([])
  const [freeModelIds, setFreeModelIds] = useState<string[]>([])
  const [freeOnly, setFreeOnly] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, response])

  useEffect(() => {
    if (workingKeys.length > 0 && selectedKey === '') {
      setSelectedKey('auto')
    }
  }, [workingKeys.length, selectedKey])

  const isFreeModel = (m: DiscoveredModel, freeList: string[]) => {
    if (!freeList.length) return false
    const base = m.id.includes('/') ? m.id.split('/').pop() || m.id : m.id
    return freeList.some((f) => f === m.id || f === base)
  }

  const displayModels = useMemo(
    () => (freeOnly ? availableModels.filter((m) => isFreeModel(m, freeModelIds)) : availableModels),
    [freeOnly, availableModels, freeModelIds]
  )

  const selectedTraits = useMemo(
    () => (selectedModel && selectedModel !== 'auto' ? getModelTraits(selectedModel) : []),
    [selectedModel]
  )

  useEffect(() => {
    if (displayModels.length > 0 && !displayModels.some((m) => m.id === selectedModel)) {
      setSelectedModel(displayModels[0].id)
    }
  }, [displayModels, selectedModel])

  const loadModels = async () => {
    const keysToLoad = selectedKey === 'auto' ? workingKeys : workingKeys.filter((k) => k.id === selectedKey)
    if (keysToLoad.length === 0) return

    // Load models for the first key (or could merge, but keep simple)
    const key = keysToLoad[0]
    const provider = getProviderById(key.providerId)
    if (!provider) return

    setLoadingModels(true)
    try {
      const models = await discoverModels(provider, key.apiKey)
      setAvailableModels(models)
      setFreeModelIds(provider.freeModels || [])
      if (models.length > 0) {
        setSelectedModel((prev) => (models.some((m) => m.id === prev) ? prev : models[0].id))
      }
    } catch (err: any) {
      showToast(`${t('providers.discoverError')}: ${err.message}`, 'error')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const keysToUse = selectedKey === 'auto' ? workingKeys : workingKeys.filter((k) => k.id === selectedKey)
    if (keysToUse.length === 0) return
    if (!selectedModel) return

    const userMsg = input.trim()
    const history = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(history)
    setInput('')
    setIsLoading(true)
    setResponse('')

    const chatMessages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ]

    try {
      const keyId = keysToUse[0].id
      const result = await sendChatMessage(keyId, selectedModel, chatMessages, {
        temperature,
        maxTokens,
        onToken: (token: string) => setResponse((prev) => prev + token),
      })
      const effectiveModel = selectedModel === 'auto'
        ? (keysToUse[0].models?.[0] || selectedModel)
        : selectedModel
      setMessages((prev) => [...prev, { role: 'assistant', content: result, model: effectiveModel, temperature }])
      setResponse('')
    } catch (err: any) {
      showToast(`${t('playground.error')}: ${err.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    const text = response || messages.filter((m) => m.role === 'assistant').pop()?.content || ''
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loadAutoModels = async () => {
    setLoadingModels(true)
    setAvailableModels([])
    setSelectedModel('')
    try {
      for (let i = 0; i < workingKeys.length; i++) {
        const key = workingKeys[i]
        const provider = getProviderById(key.providerId)
        if (!provider) continue
        try {
          const models = await discoverModels(provider, key.apiKey)
          if (models.length > 0) {
            setSelectedKey(key.id)
            setAvailableModels(models)
            setFreeModelIds(provider.freeModels || [])
            setSelectedModel(models[0].id)
            return
          }
        } catch {
          continue
        }
      }
      showToast(t('providers.discoverError') || 'No models found for any key', 'error')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setResponse('')
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t('playground.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        <div className="space-y-4 overflow-y-auto">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('playground.selectKey')}</h3>
            <select
              value={selectedKey}
              onChange={(e) => { setSelectedKey(e.target.value); setSelectedModel('auto'); setAvailableModels([]); setFreeModelIds([]) }}
              className="w-full px-3 py-2 rounded-lg bg-background border text-sm"
            >
              <option value="auto">{t("playground.autoKey")}</option>
              {workingKeys.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={loadModels}
                disabled={!selectedKey || loadingModels}
                className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {loadingModels && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('providers.discover')}
              </button>
            </div>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border text-sm font-mono"
              disabled={displayModels.length === 0}
            >
              <option value="auto">{t('playground.autoModel')}</option>
              {displayModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {getModelTraits(m.id).map((tr) => TRAIT_EMOJI[tr]).join('')} {m.id}
                </option>
              ))}
            </select>

            {selectedTraits.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedTraits.map((trait) => {
                  const Icon = TRAIT_ICONS[trait]
                  return (
                    <span
                      key={trait}
                      title={t(`playground.traits.${trait}`)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]"
                    >
                      <Icon className="w-3 h-3" />
                      {t(`playground.traits.${trait}`)}
                    </span>
                  )
                })}
              </div>
            )}

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

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t('playground.systemPrompt')}</h3>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('playground.systemPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-background border text-sm resize-none"
            />

            <div>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>{t('playground.temperature')}</span>
                <span>{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0" max="2" step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>{t('playground.maxTokens')}</span>
                <span>{maxTokens}</span>
              </label>
              <input
                type="range"
                min="100" max="8000" step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-card border rounded-xl flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !response && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Terminal className="w-12 h-12 mb-3 opacity-30" />
                <p>{t('playground.noResponse')}</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                  {m.role === 'assistant' && m.model && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      {m.model}
                      {typeof m.temperature === 'number' && (
                        <span className="ml-1">• temp: {m.temperature.toFixed(1)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex flex-col gap-1 items-start">
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-muted text-sm">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    </span>
                    {response && <span className="whitespace-pre-wrap">{response}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground px-1">
                    {selectedModel === 'auto' ? (workingKeys.find((k)=>k.id===selectedKey)?.models?.[0] || 'auto') : selectedModel}
                    <span className="ml-1">• temp: {temperature.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('playground.placeholder')}
                className="flex-1 px-3 py-2 rounded-lg bg-background border text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || (!selectedModel) || isLoading || (selectedKey === 'auto' ? workingKeys.length === 0 : !selectedKey)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('playground.send')}
              </button>
            </div>
            <div className="flex justify-between mt-2">
              <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> {t('playground.clear')}
              </button>
              <button onClick={handleCopy} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {t('playground.copyResponse')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}