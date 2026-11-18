import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
}

export interface SelectProps {
  id?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  size?: 'default' | 'md' | 'sm'
  wrapOptions?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-describedby'?: string
}

export function Select({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className,
  triggerClassName,
  size = 'default',
  wrapOptions = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listId = React.useId()

  const checkPlacement = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenUpward(spaceBelow < 240 && spaceAbove > spaceBelow)
    }
  }, [])

  const toggleOpen = () => {
    setIsOpen(prev => {
      const next = !prev
      if (next) checkPlacement()
      return next
    })
  }

  const closeAndFocus = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const focusOption = (index: number) => {
    const optionButtons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [],
    )
    if (!optionButtons.length) return
    const bounded = ((index % optionButtons.length) + optionButtons.length) % optionButtons.length
    optionButtons[bounded]?.focus()
  }

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)
  const hasSelection = Boolean(selectedOption && selectedOption.value !== '')
  const triggerLabel = selectedOption ? selectedOption.label : placeholder

  const handleSelect = (optionValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return
    onChange?.(optionValue)
    closeAndFocus()
  }

  const sizeClass =
    size === 'sm'
      ? 'h-8 px-2.5 py-1 text-xs'
      : size === 'md'
        ? 'h-9 px-3 py-1.5 text-xs'
        : 'h-10 px-3 py-2 text-sm'

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault()
          event.stopPropagation()
          closeAndFocus()
        }
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            checkPlacement()
            setIsOpen(true)
            requestAnimationFrame(() => focusOption(event.key === 'ArrowDown' ? 0 : -1))
          }
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-card text-foreground shadow-2xs transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-left',
          sizeClass,
          isOpen && 'border-primary ring-1 ring-primary',
          ariaInvalid && 'border-destructive',
          triggerClassName,
        )}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-describedby={ariaDescribedBy}
      >
        <span className={cn('truncate', !hasSelection && !selectedOption && 'text-muted-foreground')}>
          {triggerLabel}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            'ml-1.5 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 max-h-60 w-full min-w-[160px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-80',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <div id={listId} role="listbox" aria-label={ariaLabel ?? placeholder} className="max-h-56 overflow-y-auto p-1">
            {options.map((option, idx) => {
              const selected = option.value === value
              return (
                <button
                  key={`${option.value}-${idx}`}
                  type="button"
                  disabled={option.disabled}
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(option.value, option.disabled)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
                    event.preventDefault()
                    const enabled = options.filter((item) => !item.disabled)
                    const current = enabled.findIndex((item) => item.value === option.value)
                    focusOption(current + (event.key === 'ArrowDown' ? 1 : -1))
                  }}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                    option.disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-secondary hover:text-secondary-foreground',
                    selected && 'bg-secondary/70 font-medium text-secondary-foreground',
                  )}
                >
                  <div className="flex min-w-0 flex-col pr-2">
                    <span className={wrapOptions ? 'whitespace-normal break-words' : 'truncate'}>{option.label}</span>
                    {option.description && (
                      <span className="truncate text-[11px] text-muted-foreground">{option.description}</span>
                    )}
                  </div>
                  {selected && (
                    <Check
                      aria-hidden="true"
                      className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'shrink-0 text-primary')}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
