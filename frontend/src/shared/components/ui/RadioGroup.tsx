import * as React from 'react'
import { cn } from '../../lib/utils'

interface RadioGroupContextValue {
  value?: string
  onChange: (val: string) => void
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function RadioGroup({ value, onChange, disabled = false, className, children, ...props }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onChange, disabled }}>
      <div className={cn('grid gap-2', className)} role="radiogroup" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  id: string
}

export function RadioGroupItem({ value, id, className, disabled: itemDisabled, ...props }: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext)
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup')

  const isChecked = context.value === value
  const disabled = context.disabled || itemDisabled

  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id={id}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={() => context.onChange(value)}
        className={cn(
          'h-4 w-4 rounded-full border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer accent-primary',
          className,
        )}
        {...props}
      />
    </div>
  )
}
