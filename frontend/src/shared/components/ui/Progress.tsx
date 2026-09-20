import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'secondary'
  showLabel?: boolean
  label?: string
}

const variantStyles = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  secondary: 'bg-secondary',
}

export function Progress({
  value = 0,
  max = 100,
  variant = 'primary',
  showLabel = false,
  label,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100)

  return (
    <div className={cn('w-full space-y-1', className)} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
          <span>{label || 'Progress'}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full w-full flex-1 transition-all duration-300 ease-in-out', variantStyles[variant])}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    </div>
  )
}
