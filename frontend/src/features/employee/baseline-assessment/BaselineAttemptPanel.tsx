import { useLayoutEffect, useRef, useState } from 'react'
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { answerCommand, submitCommand, type BaselineAttempt, type BaselineCommand } from './baselineApi'

export function BaselineAttemptPanel({ attempt, seconds, locked, busy = false, run }: {
  attempt: BaselineAttempt; seconds: number; locked: boolean; busy?: boolean; run: (command: BaselineCommand) => Promise<void>
}) {
  const { t } = useTranslation(), tr = (key: string) => t(`employeeBaseline.${key}`)
  const pending = attempt.items.find(value => value.selectedOptionId === null)
  const [navigation, setNavigation] = useState({ revision: attempt.revision, position: pending?.position ?? attempt.items.at(-1)?.position })
  const position = navigation.revision === attempt.revision ? navigation.position : pending?.position ?? attempt.items.at(-1)?.position
  const setPosition = (value: number) => setNavigation({ revision: attempt.revision, position: value })
  const item = attempt.items.find(value => value.position === position)
  const review = item?.selectedOptionId != null
  const index = attempt.items.findIndex(value => value.position === position)
  const ui = (key: string) => t(`baselineUi.${key}`)
  const [answer, setAnswer] = useState({ revision: attempt.revision, choice: '' }), [confirm, setConfirm] = useState(false)
  const choice = answer.revision === attempt.revision ? answer.choice : ''
  const setChoice = (value: string) => setAnswer({ revision: attempt.revision, choice: value })
  const navigationRef = useRef<HTMLElement>(null), currentQuestionRef = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    const list = navigationRef.current, current = currentQuestionRef.current
    if (!list || !current) return
    // Scroll only this list; scrollIntoView can also move the surrounding page.
    const top = current.offsetTop, bottom = top + current.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  }, [position, attempt.revision])
  const expired = attempt.expired || seconds <= 0
  return <div className="min-w-0 space-y-5">
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0 space-y-2"><Badge variant="outline">{tr(`scopes.${attempt.assessmentScope}`)}</Badge><Heading level={2} size="card">{attempt.occupationName}</Heading>
        </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-4"><Clock className="text-primary" size={20} />
        <div><Text variant="caption">{tr('remaining')}</Text><span role="timer" className="block font-mono font-semibold">{Math.floor(Math.max(0, seconds) / 60)}:{String(Math.max(0, seconds) % 60).padStart(2, '0')}</span></div></div>
    </CardContent></Card>
    <div className="grid items-start gap-4 lg:grid-cols-4">
      <Card className="lg:col-span-1"><CardHeader className="border-b border-border p-5"><Heading level={2} size="card">{ui('navigation')}</Heading><Badge variant="outline" className="w-fit">{ui('answered')}: {attempt.answeredCount}</Badge></CardHeader>
        <CardContent className="space-y-4 p-5">
          <nav ref={navigationRef} aria-label={ui('navigation')} className="relative grid max-h-64 grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {attempt.items.map(value => <Button size="icon" key={value.position} variant={value.position === position ? 'primary' : 'outline'}
              ref={value.position === position ? currentQuestionRef : undefined}
              className={value.selectedOptionId !== null && value.position !== position ? 'h-9 w-full min-w-0 border-primary bg-secondary' : 'h-9 w-full min-w-0'}
              aria-current={value.position === position ? 'step' : undefined}
              aria-label={`${ui('question')} ${value.position}: ${ui(value.selectedOptionId === null ? 'unanswered' : 'answered')}`}
              onClick={() => setPosition(value.position)}>{value.position}</Button>)}
          </nav>
          <Text variant="body-sm">{ui('limit')}: {attempt.maxQuestions}</Text><Text variant="caption" className="text-muted-foreground">{ui('adaptiveHint')}</Text>
          <div className="space-y-3 border-t border-border pt-4"><Text variant="caption">{ui('savedHint')}</Text>
            <Button className="w-full" disabled={locked || expired} onClick={() => setConfirm(true)}>{tr('submit')}</Button></div>
        </CardContent></Card>
      <Card aria-busy={busy} className="min-w-0 lg:col-span-3"><CardHeader className="border-b border-border p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline">{ui('question')} {item?.position ?? '—'}</Badge>{review && <Badge variant="secondary">{ui('review')}</Badge>}</div></CardHeader>
    <CardContent key={`${attempt.revision}:${position}`} className="space-y-4 p-5">
      <Text variant="caption">{tr('timerNotice')}</Text>
      {expired ? <p role="status">{tr('expired')}</p> : item ? <fieldset disabled={locked || review} className="min-w-0 space-y-5">
        <legend className="mb-5 whitespace-pre-wrap break-words text-body-sm font-semibold">{item.prompt}</legend>
        <RadioGroup value={item.selectedOptionId ?? choice} onChange={setChoice} disabled={locked || review} aria-label={tr('chooseAnswer')}>
          {item.options.map(option => <label key={option.id} htmlFor={`baseline-option-${option.id}`} className={`flex items-start gap-3 rounded-lg border p-4 text-body-sm ${option.id === (item.selectedOptionId ?? choice) ? 'border-primary bg-secondary' : 'border-border'} ${review || locked ? '' : 'cursor-pointer hover:bg-muted'}`}>
            <RadioGroupItem id={`baseline-option-${option.id}`} name="baseline-answer" value={option.id} />
            <span className="whitespace-pre-wrap break-words">{option.text}</span>
          </label>)}
        </RadioGroup>
      </fieldset> : <p role="status">{tr('refreshNeeded')}</p>}
    </CardContent>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-5">
        <Button variant="outline" disabled={index <= 0} leftIcon={<ArrowLeft size={16} />} onClick={() => setPosition(attempt.items[index - 1].position)}>{ui('previous')}</Button>
        {review ? <Button variant="outline" disabled={index >= attempt.items.length - 1} rightIcon={<ArrowRight size={16} />} onClick={() => setPosition(attempt.items[index + 1].position)}>{ui('next')}</Button>
          : item && <Button isLoading={busy} disabled={locked || expired || !item.options.some(option => option.id === choice)} rightIcon={<ArrowRight size={16} />} onClick={() => void run(answerCommand(attempt, item, choice))}>{tr('saveNext')}</Button>}
      </div>
    </Card></div>
      <Dialog open={confirm} onOpenChange={open => { if (!locked) setConfirm(open) }} ariaLabel={tr('submit')}>
        <DialogHeader><DialogTitle>{tr('submit')}</DialogTitle><DialogDescription>{tr('submitConfirm')}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={locked} onClick={() => setConfirm(false)}>{tr('cancel')}</Button>
          <Button disabled={locked} onClick={() => { setConfirm(false); void run(submitCommand(attempt)) }}>{tr('confirm')}</Button></DialogFooter>
      </Dialog>
  </div>
}
