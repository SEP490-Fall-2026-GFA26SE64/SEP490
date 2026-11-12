import { Check } from 'lucide-react'

export function LinearStepper({ steps, currentStep, ariaLabel, completedLabel = 'Completed' }: {
  steps: string[]; currentStep: number; ariaLabel: string; completedLabel?: string
}) {
  return <ol aria-label={ariaLabel} className="mx-auto flex w-full max-w-lg py-1">{steps.map((label, index) => <li key={label} aria-current={index === currentStep ? 'step' : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
    {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-1/2 top-4 h-px w-full ${index < currentStep ? 'bg-primary' : 'bg-border'}`} />}
    <span aria-hidden="true" className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body-sm font-semibold ${index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{index < currentStep ? <Check className="size-4" /> : index + 1}</span>
    <span className={`px-1 text-caption font-medium ${index === currentStep ? 'text-primary' : 'text-muted-foreground'}`}>{label}{index < currentStep && <span className="sr-only"> · {completedLabel}</span>}</span>
  </li>)}</ol>
}
