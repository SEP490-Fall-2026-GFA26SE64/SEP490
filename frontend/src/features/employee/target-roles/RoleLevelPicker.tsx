import { useId } from 'react'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentLevel } from './currentRoleFlowApi'

export function RoleLevelPicker({ levels, value, onChange, disabled, compact = false }: { levels: CurrentLevel[]; value: string; onChange: (value: string) => void; disabled?: boolean; compact?: boolean }) {
  const { t } = useTranslation(), name = useId()
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <Text as="legend" variant="body-sm" className="font-semibold">{t('initialPathway.level')}</Text>
    <div className={compact ? 'grid gap-2 sm:grid-cols-3' : 'space-y-3'}>{[...levels].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).map(level => <label key={level.id}
      className={`flex items-center gap-3 rounded-lg border ring-inset transition-colors focus-within:ring-2 focus-within:ring-ring ${compact ? 'min-h-12 p-3' : 'min-h-16 p-4'} ${value === level.id ? 'border-primary bg-secondary ring-1 ring-primary' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input type="radio" name={name} value={level.id} checked={value === level.id} onChange={() => onChange(level.id)} className={`${compact ? 'size-4' : 'size-5'} shrink-0 accent-primary`} />
      <Text as="span" variant={compact ? 'body-sm' : 'body'} tone="foreground" className="break-words font-semibold">{level.name}</Text>
    </label>)}</div>
    {!value && <Text variant="caption">{t('initialPathway.levelRequired')}</Text>}
  </fieldset>
}
