import { useLayoutEffect, useRef, type RefObject } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { manifest as instrument } from './riasecInstrument'
type Manifest = typeof instrument
type Attempt = { attemptId: string; answers: { itemId: string; value: number }[] }

/** Same question/navigation composition as BaselineAttemptPanel; RIASEC owns its commands. */
export function RiasecAttemptPanel({ attempt, manifest, answers, index, locked, saving, headingRef,
  onMove, onRate, onReview }: {
  attempt: Attempt; manifest: Manifest; answers: Map<string, number>; index: number
  locked: boolean; saving: boolean
  headingRef: RefObject<HTMLDivElement | null>
  onMove: (index: number) => void; onRate: (value?: number) => void
  onReview: () => void
}) {
  const { language, t } = useTranslation()
  const ui = (key: string) => t(`riasecUi.${key}`)
  const item = manifest.items[index]
  const navigationRef = useRef<HTMLElement>(null)
  const currentRef = useRef<HTMLButtonElement>(null)
  const queuedMove = useRef<number | null>(null)
  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [attempt.attemptId, headingRef])
  useLayoutEffect(() => {
    const target = queuedMove.current
    if (saving || locked || target === null) return
    queuedMove.current = null
    onMove(target)
  }, [saving, locked, onMove])
  useLayoutEffect(() => {
    const list = navigationRef.current, current = currentRef.current
    if (!list || !current) return
    const top = current.offsetTop, bottom = top + current.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  }, [index, attempt.attemptId])
  if (!item) return null

  return <div className="min-w-0 space-y-5" onKeyDown={event => {
    if (event.defaultPrevented || event.repeat || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    if (target instanceof Element && (target.closest('[role="dialog"], textarea, select, [contenteditable="true"]') || target.matches('input:not([type="radio"])'))) return
    const choice = /^[1-5]$/.test(event.key) ? manifest.responses[Number(event.key) - 1] : undefined
    if (choice) { event.preventDefault(); if (!locked) onRate(choice.code); return }
    if (!['Enter', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
    if (event.key === 'Enter' && target instanceof Element && target.closest('button, a, summary')) return
    event.preventDefault()
    const next = index + (event.key === 'ArrowLeft' ? -1 : 1)
    if (next < 0 || next >= manifest.items.length) return
    if (saving) queuedMove.current = next
    else onMove(next)
  }}>
    <div className="grid items-start gap-4 lg:grid-cols-4">
      <Card className="min-w-0 border-primary/25 shadow-sm lg:col-span-1">
        <CardHeader className="border-b border-border p-5"><Heading level={2} size="card">{ui('navigator')}</Heading>
          <Badge variant="outline" className="w-fit">{ui('answered')}: {answers.size}/{manifest.items.length}</Badge>
          <Progress value={answers.size} max={manifest.items.length} role="progressbar" aria-label={ui('answered')}
            aria-valuenow={answers.size} aria-valuemin={0} aria-valuemax={manifest.items.length} />
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <nav ref={navigationRef} aria-label={ui('navigator')} className="relative grid max-h-64 grid-cols-5 gap-2 overflow-y-auto overscroll-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {manifest.items.map((question, i) => <Button key={question.id} size="icon" variant={i === index ? 'primary' : 'outline'}
              ref={i === index ? currentRef : undefined}
              className={`h-9 w-full min-w-0 ${saving ? 'disabled:opacity-100' : ''} ${answers.has(question.id) && i !== index ? 'border-primary bg-secondary' : ''}`}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`${ui('activity')} ${i + 1}${answers.has(question.id) ? ` · ${ui('answered')}` : ''}`}
              onClick={() => onMove(i)}>{i + 1}</Button>)}
          </nav>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-caption text-muted-foreground">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm bg-primary" />{ui('currentActivity')}</span>
            <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-sm border border-primary bg-secondary" />{ui('answered')}</span>
          </div>
          <details className="text-body-sm"><summary className="cursor-pointer font-medium">{ui('instructions')}</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{manifest.instructions[language]}</p></details>
          <div className="border-t border-border pt-4"><Text variant="caption">{language === 'vi' ? 'Nháp tự lưu theo tài khoản. Bạn có thể sửa mọi đáp án trước khi nộp.' : 'Your draft saves to your account. You can edit every answer before submitting.'}</Text><Button className="mt-3 w-full" onClick={onReview}>{ui('review')}</Button></div>
        </CardContent>
      </Card>
      <Card aria-busy={saving} className="min-w-0 overflow-hidden border-primary/25 shadow-sm lg:col-span-3">
        <CardHeader className="border-b border-border p-5"><div className="flex flex-wrap gap-2">
          <Badge variant="outline">{ui('activity')} {index + 1}/{manifest.items.length}</Badge>
          {answers.has(item.id) && <Badge variant="secondary">{ui('answered')}</Badge>}
        </div></CardHeader>
        <CardContent className="space-y-4 p-5">
          <div ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}><Heading level={3} size="card" className="whitespace-pre-wrap break-words">{item.text[language]}</Heading></div>
          <RadioGroup value={answers.has(item.id) ? String(answers.get(item.id)) : undefined} onChange={value => onRate(Number(value))}
            disabled={locked} aria-label={item.text[language]} className={saving ? '[&_input:disabled]:opacity-100' : undefined}>
            {manifest.responses.map((response, responseIndex) => <label key={response.code} htmlFor={`riasec-${attempt.attemptId}-${item.id}-${response.code}`}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-body-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${answers.get(item.id) === response.code ? 'border-primary bg-secondary shadow-sm' : 'border-muted-foreground/35 bg-card'} ${locked ? '' : 'cursor-pointer hover:border-primary/60 hover:bg-secondary/40'}`}>
              <RadioGroupItem name={`riasec-${item.id}`} id={`riasec-${attempt.attemptId}-${item.id}-${response.code}`} value={String(response.code)} />
              <span className="whitespace-pre-wrap break-words">{response.label[language]}</span>
              <kbd aria-hidden="true" className="ml-auto rounded border border-border bg-muted px-2 text-caption text-muted-foreground">{responseIndex + 1}</kbd>
            </label>)}
          </RadioGroup>
          <Text variant="caption">{language === 'vi' ? 'Phím 1–5: chọn đáp án · Enter / →: câu sau · ←: câu trước' : 'Keys 1–5: choose an answer · Enter / →: next · ←: previous'}</Text>
          <Button variant="ghost" size="sm" className={saving && answers.has(item.id) ? 'disabled:opacity-100' : undefined} disabled={locked || !answers.has(item.id)} onClick={() => onRate()}>{ui('clear')}</Button>
        </CardContent>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-5">
          <Button variant="outline" className={saving && index > 0 ? 'disabled:opacity-100' : undefined} disabled={locked || index <= 0} leftIcon={<ArrowLeft size={16} />} onClick={() => onMove(index - 1)}>{ui('previous')}</Button>
          <Button variant="outline" className={saving && index < manifest.items.length - 1 ? 'disabled:opacity-100' : undefined} disabled={locked || index >= manifest.items.length - 1} rightIcon={<ArrowRight size={16} />} onClick={() => onMove(index + 1)}>{ui('next')}</Button>
        </div>
      </Card>
    </div>
  </div>
}
