import { useId } from 'react'
import { RadioGroup, RadioGroupItem } from './RadioGroup'

/** Neutral question presentation shared by Employee attempts and staff simulations. No answer key or persistence. */
export function AssessmentQuestionContent({ prompt, options, value, onChange, disabled = false, answerLabel, idPrefix, mandatory = false, mandatoryLabel, showOptionShortcuts = false }: {
  prompt: string; options: { id: string; text: string }[]; value: string; onChange: (id: string) => void
  disabled?: boolean; answerLabel: string; idPrefix?: string; mandatory?: boolean; mandatoryLabel?: string; showOptionShortcuts?: boolean
}) {
  const instance = useId(), prefix = idPrefix ?? instance
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <legend className="mb-5 whitespace-pre-wrap [overflow-wrap:anywhere] text-body-sm font-semibold">{mandatory && <><span aria-hidden="true" className="mr-1 font-bold">*</span><span className="sr-only">{mandatoryLabel}. </span></>}{prompt}</legend>
    <RadioGroup value={value} onChange={onChange} disabled={disabled} aria-label={answerLabel}>
      {options.map((option, optionIndex) => <label key={option.id} htmlFor={`${prefix}-option-${option.id}`} className={`flex min-w-0 items-start gap-3 rounded-lg border p-4 text-body-sm ${option.id === value ? 'border-primary bg-secondary' : 'border-border'} ${disabled ? '' : 'cursor-pointer hover:bg-muted'}`}>
        <RadioGroupItem id={`${prefix}-option-${option.id}`} name={`${prefix}-answer`} value={option.id} />
        <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{option.text}</span>
        {showOptionShortcuts && <kbd aria-hidden="true" className="ml-auto shrink-0 rounded border border-border bg-muted px-2 text-caption text-muted-foreground">{optionIndex === 9 ? 0 : optionIndex + 1}</kbd>}
      </label>)}
    </RadioGroup>
  </fieldset>
}
