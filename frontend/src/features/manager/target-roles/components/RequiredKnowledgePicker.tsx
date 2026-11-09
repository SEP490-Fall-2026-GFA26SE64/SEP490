import { Check } from 'lucide-react'
import { cn } from '../../../../shared/lib/utils'
import { useTranslation } from '../../../../shared/i18n/LanguageContext'

const KNOWLEDGE_LEVELS = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'] as const

export interface RequiredKnowledgePickerProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
  size?: 'xs' | 'sm' | 'default'
}

export function RequiredKnowledgePicker({
  value,
  onChange,
  className,
  size = 'sm',
}: RequiredKnowledgePickerProps) {
  const { t } = useTranslation()

  const toggleLevel = (level: string) => {
    if (value.includes(level)) {
      onChange(value.filter((item) => item !== level))
    } else {
      onChange([...value, level])
    }
  }

  return (
    <div
      role="group"
      aria-label="Required knowledge levels"
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30 shadow-2xs',
        className,
      )}
    >
      {KNOWLEDGE_LEVELS.map((level) => {
        const isSelected = value.includes(level)
        return (
          <button
            key={level}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleLevel(level)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium transition-all select-none cursor-pointer',
              size === 'xs'
                ? 'px-2 py-0.5 text-[11px] leading-tight'
                : size === 'sm'
                  ? 'px-2.5 py-1 text-xs'
                  : 'px-3 py-1.5 text-sm',
              isSelected
                ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-card/60 border border-border/40',
            )}
          >
            {isSelected && (
              <Check
                className={cn(
                  'shrink-0 stroke-[2.5]',
                  size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5',
                )}
              />
            )}
            <span>{t('knowledgeLevel.' + level)}</span>
          </button>
        )
      })}
    </div>
  )
}
