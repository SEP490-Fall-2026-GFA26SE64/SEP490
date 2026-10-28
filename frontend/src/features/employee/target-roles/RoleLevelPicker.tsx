import { useId } from 'react'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentLevel } from './currentRoleFlowApi'

export function RoleLevelPicker({ levels, value, onChange, disabled }: { levels: CurrentLevel[]; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { t } = useTranslation(), name = useId()
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <Text as="legend" variant="body-sm" className="font-semibold">{t('initialPathway.level')}</Text>
    <div className="space-y-3">{[...levels].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).map(level => <label key={level.id}
      className={`flex min-h-16 items-center gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${value === level.id ? 'border-primary bg-secondary' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <input type="radio" name={name} value={level.id} checked={value === level.id} onChange={() => onChange(level.id)} className="size-5 shrink-0 accent-primary" />
      <Text as="span" className="break-words font-semibold">{level.name}</Text>
    </label>)}</div>
    {!value && <Text variant="caption">{t('initialPathway.levelRequired')}</Text>}
  </fieldset>
}
