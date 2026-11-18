import * as React from 'react'

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info'

export interface ToastItem {
  id: string
  title?: string
  description: string
  variant?: ToastVariant
  duration?: number
}

export interface ToastContextValue {
  toasts: ToastItem[]
  toast: (toast: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export const noopToastContext: ToastContextValue = {
  toasts: [],
  toast: () => {},
  dismiss: () => {},
}

export function useToast() {
  const context = React.useContext(ToastContext)
  return context ?? noopToastContext
}

export { ToastProvider } from './ToastProvider'
