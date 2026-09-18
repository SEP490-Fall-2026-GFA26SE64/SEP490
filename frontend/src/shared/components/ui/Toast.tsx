import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import * as React from 'react'
import { useToast, type ToastVariant } from '../../hooks/useToast'
import { cn } from '../../lib/utils'

const toastVariantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  default: {
    container: 'bg-card text-foreground border-border shadow-md',
    icon: <Info className="h-5 w-5 text-primary shrink-0" />,
  },
  info: {
    container: 'bg-secondary text-secondary-foreground border-blue-200 shadow-md',
    icon: <Info className="h-5 w-5 text-primary shrink-0" />,
  },
  success: {
    container: 'bg-card text-foreground border-green-200 shadow-md',
    icon: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
  },
  warning: {
    container: 'bg-card text-foreground border-amber-200 shadow-md',
    icon: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
  },
  destructive: {
    container: 'bg-card text-foreground border-red-200 shadow-md',
    icon: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
  },
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none p-2"
    >
      {toasts.map((toast) => {
        const style = toastVariantStyles[toast.variant || 'default']

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start justify-between rounded-lg border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-5',
              style.container,
            )}
          >
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <div className="pt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-sm font-semibold mb-0.5">{toast.title}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed break-words">{toast.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="ml-3 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
