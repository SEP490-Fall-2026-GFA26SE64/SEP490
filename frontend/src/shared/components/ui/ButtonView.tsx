import { type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'
import { buttonVariants } from './Button.helpers'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, leftIcon, rightIcon, children, disabled, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : leftIcon ? (
          <span className="mr-1.5 inline-flex shrink-0 items-center">{leftIcon}</span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{children}</span>
        {!isLoading && rightIcon ? (
          <span className="ml-1.5 inline-flex shrink-0 items-center">{rightIcon}</span>
        ) : null}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button }
