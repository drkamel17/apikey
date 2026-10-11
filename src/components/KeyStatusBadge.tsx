import React from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { KeyStatus } from '../types'

interface Props {
  status: KeyStatus
}

export const KeyStatusBadge: React.FC<Props> = ({ status }) => {
  const config = {
    working: { icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'working' },
    failed: { icon: XCircle, color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'failed' },
    untested: { icon: Clock, color: 'bg-muted text-muted-foreground border-border', label: 'untested' },
  }[status]

  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}