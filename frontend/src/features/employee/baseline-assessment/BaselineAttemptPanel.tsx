import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { answerCommand, submitCommand, type BaselineAttempt, type BaselineCommand } from './baselineApi'

export function BaselineAttemptPanel({ attempt, seconds, locked, run }: {
  attempt: BaselineAttempt; seconds: number; locked: boolean; run: (command: BaselineCommand) => Promise<void>
}) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const item = attempt.items.find(value => value.selectedOptionId === null)
  const [choice, setChoice] = useState(''), [confirm, setConfirm] = useState(false)
  const expired = attempt.expired || seconds <= 0
  return <Card>
    <CardHeader><CardTitle>{attempt.occupationName}</CardTitle><Badge variant="outline" className="w-fit max-w-full whitespace-normal">{tr(`scopes.${attempt.assessmentScope}`)}</Badge></CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <span>{tr('answered')}: {attempt.answeredCount} / {attempt.maxQuestions} {tr('maximum')}</span>
        <span role="timer" className="font-mono">{tr('remaining')}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      </div>
      <p className="text-sm text-muted-foreground">{tr('timerNotice')}</p>
      {expired ? <p role="status">{tr('expired')}</p> : item ? <fieldset disabled={locked} className="space-y-4">
        <legend className="mb-3 whitespace-pre-wrap break-words font-semibold">{item.position}. {item.prompt}</legend>
        <RadioGroup value={choice} onChange={setChoice} disabled={locked} aria-label={tr('chooseAnswer')}>
          {item.options.map(option => <label key={option.id} htmlFor={`baseline-option-${option.id}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
            <RadioGroupItem id={`baseline-option-${option.id}`} name="baseline-answer" value={option.id} />
            <span className="whitespace-pre-wrap break-words">{option.text}</span>
          </label>)}
        </RadioGroup>
        <Button disabled={locked || !item.options.some(option => option.id === choice)} onClick={() => void run(answerCommand(attempt, item, choice))}>{tr('saveNext')}</Button>
      </fieldset> : <p role="status">{tr('refreshNeeded')}</p>}
      <Button variant="outline" disabled={locked || expired} onClick={() => setConfirm(true)}>{tr('submit')}</Button>
      <Dialog open={confirm} onOpenChange={open => { if (!locked) setConfirm(open) }} ariaLabel={tr('submit')}>
        <DialogHeader><DialogTitle>{tr('submit')}</DialogTitle><DialogDescription>{tr('submitConfirm')}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={locked} onClick={() => setConfirm(false)}>{tr('cancel')}</Button>
          <Button disabled={locked} onClick={() => { setConfirm(false); void run(submitCommand(attempt)) }}>{tr('confirm')}</Button></DialogFooter>
      </Dialog>
    </CardContent>
  </Card>
}
