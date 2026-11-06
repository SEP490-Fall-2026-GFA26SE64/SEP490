import { useEffect, useId } from 'react'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentLevel } from './currentRoleFlowApi'

export function RoleLevelPicker({
  levels,
  value,
  onChange,
  disabled,
  minAllowedRank,
}: {
  levels: CurrentLevel[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  minAllowedRank?: number
}) {
  const { t } = useTranslation(), name = useId()

  useEffect(() => {
    if (typeof minAllowedRank === 'number') {
      const currentSelected = levels.find(l => l.id === value)
      // If current selected level is at or below assigned rank, auto-switch to lowest permissible higher level
      if (currentSelected && currentSelected.rank >= minAllowedRank) {
        const allowed = levels
          .filter(l => l.rank < minAllowedRank)
          .sort((a, b) => b.rank - a.rank)
        if (allowed.length > 0) {
          onChange(allowed[0].id)
        }
      }
    }
  }, [value, minAllowedRank, levels, onChange])
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <Text as="legend" variant="body-sm" className="font-semibold">{t('initialPathway.level')}</Text>
    <div className="space-y-3">{[...levels].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).map(level => {
      const isCurrentLevel = typeof minAllowedRank === 'number' && level.rank === minAllowedRank
      const isBelowMin = typeof minAllowedRank === 'number' && level.rank > minAllowedRank
      const isLevelDisabled = disabled || isCurrentLevel || isBelowMin
      return (
        <label key={level.id}
          className={`flex min-h-16 items-center justify-between gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
            value === level.id
              ? 'border-primary bg-secondary'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
          } ${isLevelDisabled ? 'cursor-not-allowed opacity-50 bg-muted/20' : 'cursor-pointer'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <input
              type="radio"
              name={name}
              value={level.id}
              checked={value === level.id}
              disabled={isLevelDisabled}
              onChange={() => !isLevelDisabled && onChange(level.id)}
              className="size-5 shrink-0 accent-primary"
            />
            <div className="flex flex-col min-w-0">
              <Text as="span" className="break-words font-semibold">{level.name}</Text>
              {isCurrentLevel && (
                <Text as="span" variant="caption" className="text-muted-foreground text-xs">
                  {t('initialPathway.currentAssignedLevel', 'Current assigned level (Upskilling requires higher level)')}
                </Text>
              )}
              {isBelowMin && (
                <Text as="span" variant="caption" className="text-muted-foreground text-xs">
                  {t('initialPathway.belowStartingLevel', 'Below current assigned level')}
                </Text>
              )}
            </div>
          </div>
          {level.duration && (
            <Badge variant="outline" className="text-xs shrink-0 font-medium border-border/80">
              {level.duration}
            </Badge>
          )}
        </label>
      )
    })}</div>
    {!value && <Text variant="caption">{t('initialPathway.levelRequired')}</Text>}
  </fieldset>
}
