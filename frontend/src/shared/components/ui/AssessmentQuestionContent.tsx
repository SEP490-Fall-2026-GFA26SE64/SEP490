import { useId } from 'react'
import { RadioGroup, RadioGroupItem } from './RadioGroup'

/** Neutral question presentation shared by Employee attempts and staff simulations. No answer key or persistence. */
export function AssessmentQuestionContent({ prompt, options, value, onChange, disabled = false, answerLabel, idPrefix }: {
  prompt: string; options: { id: string; text: string }[]; value: string; onChange: (id: string) => void
  disabled?: boolean; answerLabel: string; idPrefix?: string
}) {
  const instance = useId(), prefix = idPrefix ?? instance
  return <fieldset disabled={disabled} className="min-w-0 space-y-5">
    <legend className="mb-5 whitespace-pre-wrap [overflow-wrap:anywhere] text-body-sm font-semibold">{prompt}</legend>
    <RadioGroup value={value} onChange={onChange} disabled={disabled} aria-label={answerLabel}>
      {options.map(option => <label key={option.id} htmlFor={`${prefix}-option-${option.id}`} className={`flex min-w-0 items-start gap-3 rounded-lg border p-4 text-body-sm ${option.id === value ? 'border-primary bg-secondary' : 'border-border'} ${disabled ? '' : 'cursor-pointer hover:bg-muted'}`}>
        <RadioGroupItem id={`${prefix}-option-${option.id}`} name={`${prefix}-answer`} value={option.id} />
        <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{option.text}</span>
      </label>)}
    </RadioGroup>
  </fieldset>
}
