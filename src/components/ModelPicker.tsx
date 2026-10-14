import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { DiscoveredModel } from '../types'
import { getModelTraits, TRAIT_EMOJI } from '../utils/modelTraits'

interface ModelPickerProps {
  models: DiscoveredModel[]
  value: string
  onChange: (id: string) => void
  autoLabel: string
  searchPlaceholder: string
  emptyLabel?: string
  disabled?: boolean
}

const MAX_RESULTS = 200

export const ModelPicker: React.FC<ModelPickerProps> = ({
  models,
  value,
  onChange,
  autoLabel,
  searchPlaceholder,
  emptyLabel,
  disabled,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const label = value === 'auto' ? autoLabel : value

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? models.filter((m) => m.id.toLowerCase().includes(q)) : models
    return list.slice(0, MAX_RESULTS)
  }, [models, query])

  const showAuto = !query.trim() || autoLabel.toLowerCase().includes(query.trim().toLowerCase())

  const select = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : label}
          placeholder={open ? searchPlaceholder : label || searchPlaceholder}
          onFocus={() => { if (!disabled) { setOpen(true); setQuery('') } }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur() }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (showAuto && filtered.length === 0) select('auto')
              else if (filtered.length > 0) select(filtered[0].id)
            }
          }}
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-background border text-sm font-mono disabled:opacity-50"
        />
        <ChevronDown
          className={`w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-lg bg-card border shadow-lg text-sm">
          {showAuto && (
            <button
              type="button"
              onClick={() => select('auto')}
              className={`w-full text-left px-3 py-2 hover:bg-muted ${value === 'auto' ? 'text-primary font-medium' : ''}`}
            >
              {autoLabel}
            </button>
          )}
          {filtered.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => select(m.id)}
              className={`w-full text-left px-3 py-2 hover:bg-muted font-mono text-xs truncate ${value === m.id ? 'text-primary font-medium' : ''}`}
              title={m.id}
            >
              {getModelTraits(m.id).map((tr) => TRAIT_EMOJI[tr]).join('')} {m.id}
            </button>
          ))}
          {filtered.length === 0 && !showAuto && (
            <div className="px-3 py-3 text-xs text-muted-foreground">{emptyLabel || '—'}</div>
          )}
        </div>
      )}
    </div>
  )
}
