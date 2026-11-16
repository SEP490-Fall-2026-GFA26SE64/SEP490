import { Check, ChevronDown, Search, X } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
}

export interface ComboboxProps {
  id?: string
  options: ComboboxOption[]
  value?: string
  values?: string[]
  customTriggerLabel?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  size?: 'default' | 'sm'
  clearable?: boolean
  wrapOptions?: boolean
  onOpenChange?: (open: boolean) => void
  role?: 'combobox'
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  clearLabel?: string
}

export function Combobox({
  id,
  options,
  value,
  values,
  customTriggerLabel,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No options found.',
  disabled = false,
  className,
  size = 'default',
  clearable = true,
  wrapOptions = false,
  onOpenChange,
  role,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  clearLabel = 'Clear selection',
}: ComboboxProps) {
  const [isOpen, setIsOpenState] = React.useState(false)
  const setIsOpen = React.useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIsOpenState((prev) => {
        const next = typeof val === 'function' ? val(prev) : val
        if (next !== prev) {
          onOpenChange?.(next)
        }
        return next
      })
    },
    [onOpenChange]
  )
  const [searchQuery, setSearchQuery] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const listId = React.useId()

  function closeAndFocus() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  function focusOption(index: number) {
    const options = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)')
    if (!options?.length) return
    options[(index + options.length) % options.length]?.focus()
  }

  const isMulti = Array.isArray(values)
  const selectedOption = options.find((opt) => opt.value === value)
  const isSelected = (optVal: string) => (isMulti ? values.includes(optVal) : optVal === value)

  const hasSelection = isMulti ? values.length > 0 : Boolean(selectedOption)
  const triggerLabel =
    customTriggerLabel ||
    (isMulti && values.length > 0
      ? values.length === 1
        ? options.find((opt) => opt.value === values[0])?.label || values[0]
        : `${values.length} Selected`
      : selectedOption
        ? selectedOption.label
        : placeholder)

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.trim().toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.value && opt.value.toLowerCase().includes(query)) ||
        opt.description?.toLowerCase().includes(query),
    )
  }, [options, searchQuery])

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setIsOpen])

  const handleSelect = (optionValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return
    onChange?.(optionValue)
    if (!isMulti) {
      setIsOpen(false)
      setSearchQuery('')
      triggerRef.current?.focus()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault()
          event.stopPropagation()
          closeAndFocus()
        }
      }}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setIsOpen(true)
          }
        }}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-card text-foreground shadow-2xs transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-left',
          size === 'sm' ? 'h-8 px-2.5 py-1 text-xs' : 'h-10 px-3 py-2 text-sm',
          isOpen && 'border-primary ring-1 ring-primary',
          clearable && hasSelection && !disabled && 'pr-16',
          ariaInvalid && 'border-destructive',
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        role={role}
      >
        <span className={cn('truncate', !hasSelection && 'text-muted-foreground')}>
          {triggerLabel}
        </span>
        <div className="flex items-center space-x-1 shrink-0 ml-1.5">
          <ChevronDown
            aria-hidden="true"
            className={cn(
              size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              'text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </div>
      </button>
      {clearable && hasSelection && !disabled && <button type="button" aria-label={clearLabel}
        onClick={handleClear}
        className="absolute right-8 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X size={14} aria-hidden="true" />
      </button>}

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-80">
          <div className={cn('flex items-center border-b border-border', size === 'sm' ? 'px-2.5 py-1.5' : 'px-3 py-2')}>
            <Search aria-hidden="true" className={cn('mr-2 shrink-0 text-muted-foreground', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              onKeyDown={event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  focusOption(event.key === 'ArrowDown' ? 0 : -1)
                }
              }}
              className={cn(
                'w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none',
                size === 'sm' ? 'text-xs' : 'text-sm',
              )}
              autoFocus
            />
          </div>

          <div id={listId} role="listbox" aria-label={ariaLabel ?? placeholder}
            aria-multiselectable={isMulti || undefined} className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className={cn('py-3 text-center text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, idx) => {
                const selected = isSelected(option.value)
                return (
                  <button
                    key={`${option.value}-${idx}`}
                    type="button"
                    disabled={option.disabled}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(option.value, option.disabled)}
                    onKeyDown={event => {
                      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
                      event.preventDefault()
                      const enabled = filteredOptions.filter(item => !item.disabled)
                      const current = enabled.findIndex(item => item.value === option.value)
                      if (event.key === 'ArrowUp' && current === 0) searchRef.current?.focus()
                      else focusOption(current + (event.key === 'ArrowDown' ? 1 : -1))
                    }}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
                      option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-secondary hover:text-secondary-foreground',
                      selected && 'bg-secondary/70 font-medium text-secondary-foreground',
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className={wrapOptions ? 'whitespace-normal break-words' : 'truncate'}>{option.label}</span>
                      {option.description && (
                        <span className="text-[11px] text-muted-foreground truncate">{option.description}</span>
                      )}
                    </div>
                    {selected && <Check aria-hidden="true" className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-primary shrink-0')} />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
