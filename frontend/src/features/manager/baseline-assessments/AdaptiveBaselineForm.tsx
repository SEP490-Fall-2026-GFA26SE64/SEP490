import { useId } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { AdaptiveCapacity } from './adaptiveBaselineApi'
import { adaptiveBoundsValid, boundsDraft, editAdaptiveBounds, type AdaptiveBoundsDraft, type AdaptiveDraft, type AdaptiveTimeField } from './adaptiveBaselineDraft'

interface Props { value: AdaptiveDraft; capacity: AdaptiveCapacity; onChange: (value: AdaptiveDraft) => void; disabled?: boolean }

export function AdaptiveBaselineForm({ value, capacity, onChange, disabled = false }: Props) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t('adaptiveBaseline.configuration')}</CardTitle><CardDescription>{t('adaptiveBaseline.serverAuthority')}</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <label htmlFor={id} className="text-sm font-medium">{t('adaptiveBaseline.name')}</label>
          <Input id={id} required value={value.name} disabled={disabled} onChange={event => onChange({ ...value, name: event.target.value })} />
        </CardContent>
      </Card>
      <BoundsEditor label={t('adaptiveBaseline.exploration')} capacity={capacity.explorationCapacity} missing={capacity.explorationMissingParameterCount}
        value={value.exploration} disabled={disabled} onChange={exploration => onChange({ ...value, exploration })} />
      {Object.entries(capacity.roles).sort(([a], [b]) => a.localeCompare(b)).map(([roleId, role]) => (
        <BoundsEditor key={roleId} label={role.snapshot.name} skills={Object.values(role.snapshot.skills).map(skill => skill.name).join(', ')}
          capacity={role.eligibleCapacity} missing={role.missingParameterCount} disabled={disabled}
          value={Object.hasOwn(value.roles, roleId) ? value.roles[roleId] : boundsDraft()}
          onChange={row => onChange({ ...value, roles: { ...value.roles, [roleId]: row } })} />
      ))}
    </div>
  )
}

function BoundsEditor({ label, skills, capacity, missing, value, onChange, disabled }: {
  label: string; skills?: string; capacity: number; missing: number; value: AdaptiveBoundsDraft; onChange: (value: AdaptiveBoundsDraft) => void; disabled: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const invalid = !adaptiveBoundsValid(value, capacity)
  const fields: Array<{ field: AdaptiveTimeField; label: string; step: string; max?: number }> = [
    { field: 'maxQuestions', label: t('adaptiveBaseline.maximum'), step: '1', max: capacity },
    { field: 'totalMinutes', label: t('adaptiveBaseline.totalMinutes'), step: 'any' },
    { field: 'secondsPerQuestion', label: t('adaptiveBaseline.secondsPerQuestion'), step: 'any' },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        {skills && <CardDescription className="break-words">{skills}</CardDescription>}
        <p className="text-sm text-muted-foreground">{t('adaptiveBaseline.capacity')}: {capacity}{missing > 0 && <> · {t('adaptiveBaseline.missingParameters')}: {missing}</>}</p>
      </CardHeader>
      <CardContent>
        <fieldset disabled={disabled} aria-label={label} className="grid gap-4 md:grid-cols-3">
          {fields.map(({ field, label: fieldLabel, step, max }) => (
            <div key={field} className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`${id}-${field}`}>{fieldLabel}</label>
              <Input id={`${id}-${field}`} type="number" min={field === 'maxQuestions' ? 1 : undefined} max={max} step={step} required
                value={value[field]} aria-describedby={`${id}-help`} aria-invalid={invalid}
                onChange={event => onChange(editAdaptiveBounds(value, field, event.target.value))} />
            </div>
          ))}
          <div id={`${id}-help`} className="space-y-1 text-xs text-muted-foreground md:col-span-3">
            <p>{t('adaptiveBaseline.timeHint')}</p>
            {value.totalSeconds !== '' && <p>{t('adaptiveBaseline.savedSeconds')}: {value.totalSeconds}</p>}
            {invalid && <p className="text-destructive">{t('adaptiveBaseline.requiredBounds')}</p>}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  )
}
