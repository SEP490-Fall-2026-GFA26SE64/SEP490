import { AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import * as React from 'react'
import { Button } from './Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog'

export interface ConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'destructive' | 'warning'
  isLoading?: boolean
  icon?: React.ReactNode
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const handleCancel = () => {
    if (onCancel) onCancel()
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  const defaultIcon = () => {
    if (icon) return icon
    switch (variant) {
      case 'destructive':
        return <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
      default:
        return <HelpCircle className="h-6 w-6 text-primary shrink-0" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-start gap-4">
        {defaultIcon()}
        <div className="flex-1">
          <DialogHeader className="mb-2">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </div>
      </div>

      <DialogFooter className="mt-6 flex gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={handleCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'warning' ? 'primary' : variant}
          size="default"
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
