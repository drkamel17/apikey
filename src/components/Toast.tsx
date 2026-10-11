import React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  onClose: (id: string) => void
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
}

export const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  const Icon = icons[type]
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm animate-slide-in ${colors[type]}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm flex-1">{message}</span>
      <button onClick={() => onClose(id)} className="opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const ToastContainer: React.FC<{ toasts: any[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
    {toasts.map((t) => (
      <Toast key={t.id} {...t} onClose={onRemove} />
    ))}
  </div>
)