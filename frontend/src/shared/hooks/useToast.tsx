import * as React from 'react'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info'

export interface ToastItem {
  id: string
  title?: string
  description: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 9)
      const newToast: ToastItem = { id, title, description, variant, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

const noopToastContext: ToastContextValue = {
  toasts: [],
  toast: () => {},
  dismiss: () => {},
}

export function useToast() {
  const context = React.useContext(ToastContext)
  return context ?? noopToastContext
}
