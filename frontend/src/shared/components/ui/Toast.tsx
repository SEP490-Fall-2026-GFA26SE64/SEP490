import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import * as React from 'react'
import { useToast, type ToastVariant } from '../../hooks/useToast'
import { cn } from '../../lib/utils'
import { useTranslation } from '../../i18n/LanguageContext'

const toastVariantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  default: {
    container: 'bg-card text-foreground border-border shadow-md',
    icon: <Info className="h-5 w-5 text-primary shrink-0" />,
  },
  info: {
    container: 'bg-secondary text-secondary-foreground border-primary/30 shadow-md',
    icon: <Info className="h-5 w-5 text-primary shrink-0" />,
  },
  success: {
    container: 'bg-success/10 text-success border-success/30 shadow-md',
    icon: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
  },
  warning: {
    container: 'bg-warning/10 text-foreground border-warning/40 shadow-md',
    icon: <AlertTriangle className="h-5 w-5 text-warning shrink-0" />,
  },
  destructive: {
    container: 'bg-destructive/10 text-destructive border-destructive/30 shadow-md',
    icon: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
  },
}

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const { language } = useTranslation()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-44 md:top-32 xl:top-20 z-[100] flex w-[calc(100%_-_2rem)] max-w-sm flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => {
        const style = toastVariantStyles[toast.variant || 'default']

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start justify-between rounded-xl border border-l-4 p-4 shadow-lg transition-all animate-in fade-in slide-in-from-top-2',
              style.container,
            )}
          >
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              <div className="pt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-body-sm font-semibold mb-1">{toast.title}</p>}
                <p className="line-clamp-2 text-caption text-foreground/80 leading-relaxed break-words">{toast.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="ml-3 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label={language === 'vi' ? 'Đóng thông báo' : 'Dismiss notification'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
