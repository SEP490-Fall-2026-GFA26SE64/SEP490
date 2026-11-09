import { useEffect, useId } from 'react'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { cn } from '../../../shared/lib/utils'
import type { CurrentLevel } from './currentRoleFlowApi'

export function RoleLevelPicker({
  levels,
  value,
  onChange,
  disabled,
  compact = false,
  minAllowedRank,
}: {
  levels: CurrentLevel[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  compact?: boolean
  minAllowedRank?: number
}) {
  const { t } = useTranslation()
  const name = useId()

  useEffect(() => {
    if (typeof minAllowedRank === 'number') {
      const currentSelected = levels.find((l) => l.id === value)
      // If current selected level is at or below assigned rank, auto-switch to lowest permissible higher level
      if (currentSelected && currentSelected.rank >= minAllowedRank) {
        const allowed = levels
          .filter((l) => l.rank < minAllowedRank)
          .sort((a, b) => b.rank - a.rank)
        onChange(allowed[0]?.id ?? '')
      }
    }
  }, [value, minAllowedRank, levels, onChange])

  const sortedLevels = [...levels].sort(
    (a, b) => a.rank - b.rank || a.id.localeCompare(b.id),
  )
  const noHigherLevel = typeof minAllowedRank === 'number' && !levels.some(level => level.rank < minAllowedRank)

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2.5">
      <Text as="legend" variant="body-sm" className="font-semibold text-foreground">
        {t('initialPathway.level')}
      </Text>
      <div className="space-y-2">
        {sortedLevels.map((level) => {
          const isCurrentLevel =
            typeof minAllowedRank === 'number' && level.rank === minAllowedRank
          const isBelowMin =
            typeof minAllowedRank === 'number' && level.rank > minAllowedRank
          const isLevelDisabled = disabled || isCurrentLevel || isBelowMin
          const isSelected = value === level.id

          return (
            <label
              key={level.id}
              className={cn(
                'group relative flex items-center justify-between gap-3.5 rounded-lg border p-3 transition-all select-none',
                compact ? 'py-2.5 px-3' : 'p-3.5',
                isSelected
                  ? 'border-primary bg-secondary/60 ring-1 ring-primary shadow-2xs'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
                isLevelDisabled
                  ? 'cursor-not-allowed opacity-60 bg-muted/20 border-border/60'
                  : 'cursor-pointer',
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="radio"
                  name={name}
                  value={level.id}
                  aria-label={level.name}
                  checked={isSelected}
                  disabled={isLevelDisabled}
                  onChange={() => !isLevelDisabled && onChange(level.id)}
                  className="size-4 shrink-0 accent-primary cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-sm font-semibold leading-snug',
                        isSelected ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {level.name}
                    </span>
                    {typeof level.rank === 'number' && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                        Rank {level.rank}
                      </span>
                    )}
                  </div>
                  {isCurrentLevel && (
                    <span className="text-xs text-muted-foreground leading-normal mt-0.5">
                      {t(
                        'initialPathway.currentAssignedLevel',
                        'Current assigned level (Upskilling requires higher level)',
                      )}
                    </span>
                  )}
                  {isBelowMin && (
                    <span className="text-xs text-muted-foreground leading-normal mt-0.5">
                      {t(
                        'initialPathway.belowStartingLevel',
                        'Below current assigned level',
                      )}
                    </span>
                  )}
                </div>
              </div>
              {level.duration && (
                <Badge
                  variant={isSelected ? 'primary' : 'outline'}
                  className={cn(
                    'text-xs shrink-0 font-medium font-mono whitespace-nowrap',
                    !isSelected && 'border-border/80 text-muted-foreground',
                  )}
                >
                  {level.duration}
                </Badge>
              )}
            </label>
          )
        })}
      </div>
      {noHigherLevel && <Text variant="caption" role="status">{t('roleFlow.noHigherLevel')}</Text>}
      {!value && !noHigherLevel && (
        <Text variant="caption" tone="destructive">
          {t('initialPathway.levelRequired')}
        </Text>
      )}
    </fieldset>
  )
}
