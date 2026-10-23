import { useId, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { AdaptiveCapacity } from './adaptiveBaselineApi'
import { adaptiveErrors, editAdaptiveBounds, type AdaptiveDraft, type AdaptiveField, type AdaptiveTimeField } from './adaptiveBaselineDraft'

interface Props { value: AdaptiveDraft; capacity: AdaptiveCapacity; onChange: (value: AdaptiveDraft) => void; disabled: boolean; unchanged: boolean; converting: boolean; onSave: () => void }
export function AdaptiveBaselineForm({ value, capacity, onChange, disabled, unchanged, converting, onSave }: Props) {
  const { t } = useTranslation(), tr = (key: string) => t(`adaptiveBaseline.${key}`), id = useId()
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<AdaptiveField, boolean>>>({})
  const summary = useRef<HTMLDivElement>(null), errors = adaptiveErrors(value, capacity)
  const visible = (field: AdaptiveField) => (submitted || touched[field]) && errors[field]
  const limits = capacity.occupation
  const fields: { field: AdaptiveTimeField; label: string; min?: number; max?: number; step: string }[] = [
    { field: 'maxQuestions', label: tr('maximum'), min: limits?.minimumQuestions, max: limits ? Math.min(limits.eligibleCapacity, limits.modelMaxQuestions) : undefined, step: '1' },
    { field: 'totalMinutes', label: tr('totalMinutes'), step: '1' },
    { field: 'secondsPerQuestion', label: tr('secondsPerQuestion'), min: 30, max: 120, step: '1' },
  ]
  function save(event: FormEvent) {
    event.preventDefault(); setSubmitted(true)
    if (Object.keys(errors).length) { requestAnimationFrame(() => summary.current?.focus()); return }
    onSave()
  }
  return <form noValidate onSubmit={save} className="space-y-4">
    {submitted && Object.keys(errors).length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="rounded-lg border border-destructive bg-card p-4 focus:ring-2 focus:ring-ring">
      <Text variant="body-sm" tone="destructive" className="font-semibold">{tr('validationTitle')}</Text>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm">{Object.entries(errors).map(([field, message]) => <li key={field}><a className="text-destructive underline" href={`#${id}-${field}`}>{tr(`validation.${message}`)}</a></li>)}</ul>
    </div>}
    <Card>
      <CardHeader className="border-b border-border bg-secondary/30 p-5"><Heading level={2} size="card">{tr('configuration')}</Heading><CardDescription>{tr('serverAuthority')}</CardDescription></CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <label htmlFor={`${id}-name`} className="text-body-sm font-semibold">{tr('name')}</label>
          <Input id={`${id}-name`} required value={value.name} disabled={disabled} aria-invalid={Boolean(visible('name'))} aria-describedby={`${id}-name-help`}
            onBlur={() => setTouched(previous => ({ ...previous, name: true }))} onChange={event => onChange({ ...value, name: event.target.value })} />
          <Text id={`${id}-name-help`} variant="caption" tone={visible('name') ? 'destructive' : 'muted'}>{visible('name') ? tr(`validation.${errors.name}`) : `${Array.from(value.name.trim()).length}/100 · ${tr('nameHint')}`}</Text>
        </div>
        <fieldset disabled={disabled} className="grid gap-4 md:grid-cols-3">
          <legend className="sr-only">{tr('occupationBounds')}</legend>
          {fields.map(({ field, label, min, max, step }) => <div key={field} className="space-y-2">
            <label htmlFor={`${id}-${field}`} className="text-body-sm font-semibold">{label}{value.occupation[field] && Number.isFinite(Number(value.occupation[field])) && !Number.isInteger(Number(value.occupation[field])) ? ' ≈' : ''}</label>
            <Input id={`${id}-${field}`} type="number" inputMode="numeric" min={min} max={max} step={step} required value={value.occupation[field] && Number.isFinite(Number(value.occupation[field])) ? Math.round(Number(value.occupation[field])) : value.occupation[field]}
              aria-invalid={Boolean(visible(field))} aria-describedby={`${id}-${field}-help`}
              onBlur={() => setTouched(previous => ({ ...previous, [field]: true }))}
              onChange={event => { if (/^\d*$/.test(event.target.value)) onChange({ ...value, occupation: editAdaptiveBounds(value.occupation, field, event.target.value) }) }} />
            <Text id={`${id}-${field}-help`} variant="caption" tone={visible(field) ? 'destructive' : 'muted'}>
              {visible(field) ? tr(`validation.${errors[field]}`) : field === 'maxQuestions' ? limits && limits.minimumQuestions <= Math.min(limits.eligibleCapacity, limits.modelMaxQuestions) ? `${tr('coverageRange')}: ${limits.minimumQuestions}–${Math.min(limits.eligibleCapacity, limits.modelMaxQuestions)}` : tr('infeasible') : tr(field === 'totalMinutes' ? 'totalHint' : 'rateHint')}
            </Text>
            {value.occupation[field] && Number.isFinite(Number(value.occupation[field])) && !Number.isInteger(Number(value.occupation[field])) && <Text variant="caption" className="text-muted-foreground">{t('baselineUi.approxHint')}</Text>}
          </div>)}
        </fieldset>
        <Text variant="body-sm" className="text-muted-foreground">{tr('timeHint')}</Text>
        {value.occupation.totalSeconds && <Text variant="body-sm" tone="foreground" className="rounded-lg border border-primary/20 bg-secondary/40 px-3 py-2">{tr('savedSeconds')}: <strong>{value.occupation.totalSeconds}</strong></Text>}
        <Button size="sm" type="submit" disabled={disabled || unchanged}>{tr(converting ? 'convert' : 'save')}</Button>
      </CardContent>
    </Card>
  </form>
}
