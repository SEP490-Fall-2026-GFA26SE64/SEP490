import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Text } from '../../../shared/components/typography/Text'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Check, CheckCircle2, Clock3, ListChecks } from 'lucide-react'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import type { BaselineEditorState, PolicyWorkspace } from './scopedAssessmentPolicyApi'

export interface BaselineFormHandle { saveAndClose: () => void }
interface Props { workspace: PolicyWorkspace; editing: boolean; locked: boolean; onSave: (state: BaselineEditorState, close: boolean, activate?: boolean) => void; onDiscard: () => void }
const display = (value: number | null | undefined) => value == null ? '' : String(value)
const decimal = (value: number) => String(Number(value.toFixed(6)))
export const BaselinePolicyForm = forwardRef<BaselineFormHandle, Props>(function BaselinePolicyForm({ workspace, editing, locked, onSave, onDiscard }, ref) {
  const { t } = useTranslation(), draft = workspace.draft!, progress = draft.editorState, policy = draft.configuration
  const [step] = useState(editing ? 0 : progress?.step ?? 1)
  const [rows, setRows] = useState(() => workspace.capacities.map(capacity => {
    const saved = progress?.levels.find(r => r.knowledgeLevel === capacity.knowledgeLevel)
    const old = policy?.groups.filter(g => g.knowledgeLevel === capacity.knowledgeLevel) ?? []
    const common = old.length > 0 && old.every(g => g.totalCount === old[0].totalCount && g.requiredCorrectCount === old[0].requiredCorrectCount) ? old[0] : null
    return { ...capacity, count: display(saved?.totalCount ?? common?.totalCount), correct: display(saved?.requiredCorrectCount ?? common?.requiredCorrectCount) }
  }))
  const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0) * row.skillCount, 0)
  const initialSeconds = progress?.timeLimitSeconds ?? policy?.timeLimitSeconds
  const [minutes, setMinutes] = useState(initialSeconds == null ? '' : decimal(initialSeconds / 60))
  const [perQuestion, setPerQuestion] = useState(initialSeconds != null && total > 0 ? decimal(initialSeconds / 60 / total) : '1')
  const [wait, setWait] = useState(decimal((progress?.retakeWaitSeconds ?? policy?.retakeWaitSeconds ?? 600) / 60))
  const [attempts, setAttempts] = useState(display(progress?.maxAttempts ?? policy?.maxAttempts ?? 3))
  const [invalid, setInvalid] = useState(false)
  const mixed = !progress && workspace.capacities.some(c => {
    const old = policy?.groups.filter(g => g.knowledgeLevel === c.knowledgeLevel) ?? []
    return old.some(g => g.totalCount !== old[0].totalCount || g.requiredCorrectCount !== old[0].requiredCorrectCount)
  })
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [])
  const integer = (value: string, minimum: number) => {
    if (!value.trim()) return null
    const n = Number(value)
    if (!Number.isSafeInteger(n) || n < minimum || n > 2147483647) throw new Error('Invalid integer')
    return n
  }
  function snapshot(nextStep: number, completed: boolean): BaselineEditorState {
    const levels = rows.map(row => {
      const count = integer(row.count, 1), correct = integer(row.correct, 1)
      if (count !== null && count > row.maxQuestions || correct !== null && count !== null && correct > count
        || nextStep > 1 && (count === null || correct === null)) throw new Error('Invalid question count')
      return { knowledgeLevel: row.knowledgeLevel, totalCount: count, requiredCorrectCount: correct }
    })
    if (total > workspace.maxPaperItems || nextStep > 1 && (!levels.length || total < 1)) throw new Error('Paper limit')
    const seconds = (value: string, minimum: number) => {
      if (!value.trim()) return null
      const n = Number(value) * 60
      if (!Number.isFinite(n) || Math.round(n) < minimum || n > 2147483647) throw new Error('Invalid time')
      return Math.round(n)
    }
    const timeLimitSeconds = minutes.trim() ? seconds(minutes, 1) : nextStep === 2 && step === 1 ? total * 60 : null
    const retakeWaitSeconds = seconds(wait, 0), maxAttempts = integer(attempts, 1)
    if (nextStep === 3 && (timeLimitSeconds === null || retakeWaitSeconds === null || maxAttempts === null)) throw new Error('Complete timing')
    return { step: nextStep, completed, levels, timeLimitSeconds, retakeWaitSeconds, maxAttempts }
  }
  function save(next: number, completed = false, close = false, activate = false) {
    try { const state = snapshot(next, completed); setInvalid(false); onSave(state, close, activate) } catch { setInvalid(true) }
  }
  function saveAndClose() {
    if (!rows.length) { onDiscard(); return }
    // Closing Edit must not silently save unreviewed changes as a completed policy.
    save(editing ? 3 : step, false, true)
  }
  useImperativeHandle(ref, () => ({ saveAndClose }))
  const countsValid = rows.length > 0 && rows.every(r => Number.isSafeInteger(Number(r.count)) && Number(r.count) > 0 && Number(r.count) <= r.maxQuestions
    && Number.isSafeInteger(Number(r.correct)) && Number(r.correct) > 0 && Number(r.correct) <= Number(r.count)) && total <= workspace.maxPaperItems
  return <>
    {!editing && <ol aria-label={t('baselineWizard.progress')} className="mb-5 grid grid-cols-3 gap-2">
      {['questions', 'timing', 'review'].map((name, index) => <li key={name} aria-current={step === index + 1 ? 'step' : undefined}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-body-sm ${step === index + 1 ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-xs' : 'border-border bg-background text-muted-foreground'}`}><span style={step === index + 1 ? { color: 'hsl(var(--primary-foreground))' } : undefined} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption ${step === index + 1 ? 'border border-primary-foreground/40 bg-primary-hover text-primary-foreground' : 'border border-border bg-card'}`}>{step > index + 1 ? <Check size={14} aria-hidden="true" /> : index + 1}</span><span>{t(`baselineWizard.${name}`)}</span></li>)}
    </ol>}
    {invalid && <Text role="alert" tone="destructive" className="mb-4">{t('baselineWizard.invalid')}</Text>}
    <DialogBody className="space-y-4 pr-1">
      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-secondary/40 px-4 py-3"><div><Text variant="caption">{t('baselineWizard.total')}</Text><Heading level={3} size="section" className={total > workspace.maxPaperItems ? 'text-destructive' : 'text-primary'}>{total} <span className="text-body-sm font-medium text-muted-foreground">{t('baselineUX.questionsUnit')}</span></Heading></div><Text variant="caption">{t('baselineWizard.paperLimit')}: {workspace.maxPaperItems}</Text></div>
      {(step === 1 || editing) && <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={t('baselineWizard.questions')}>
        <Heading level={3} size="card" className="flex items-center gap-2"><ListChecks size={17} className="text-primary" aria-hidden="true" />{t('baselineUX.questionSection')}</Heading>
        <Text variant="caption">{t('baselineWizard.commonHelp')}</Text>
        {mixed && <Text role="status">{t('baselineWizard.mixed')}</Text>}
        <Text variant="caption">{t('baselineWizard.bankChanged')}</Text>
        {!rows.length && <Text role="status">{t('scopedPolicy.errors.SCOPE_REQUIREMENTS_NOT_READY')}</Text>}
        {rows.map((row, index) => {
          const patch = (key: 'count' | 'correct', value: string) => {
            const next = rows.map((item, i) => i === index ? { ...item, [key]: value } : item)
            setRows(next)
            const nextTotal = next.reduce((sum, item) => sum + (Number(item.count) || 0) * item.skillCount, 0)
            if (key === 'count' && minutes !== '' && nextTotal > 0) setPerQuestion(decimal(Number(minutes) / nextTotal))
          }
          const badCount = row.count !== '' && (!Number.isSafeInteger(Number(row.count)) || Number(row.count) < 1 || Number(row.count) > row.maxQuestions)
          const badCorrect = row.correct !== '' && (!Number.isSafeInteger(Number(row.correct)) || Number(row.correct) < 1 || row.count !== '' && Number(row.correct) > Number(row.count))
          return <div key={row.knowledgeLevel} className="space-y-3 rounded-lg border border-primary/20 bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><Text tone="foreground" className="font-semibold">{t(`knowledgeLevel.${row.knowledgeLevel}`)}</Text><Badge variant="outline" className="bg-card">{row.skillCount} {t('baselineWizard.skills')}</Badge></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('baselineWizard.questionsPerSkill')}</Text>
                <Input type="number" min={1} max={row.maxQuestions} step={1} value={row.count} aria-invalid={badCount} disabled={locked || row.maxQuestions === 0} onChange={e => patch('count', e.target.value)} /></label>
              <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('scopedPolicy.requiredCorrect')}</Text>
                <Input type="number" min={1} max={Number(row.count) || row.maxQuestions} step={1} value={row.correct} aria-invalid={badCorrect} disabled={locked || row.maxQuestions === 0} onChange={e => patch('correct', e.target.value)} /></label>
            </div>
            <Text variant="caption" role={badCount || badCorrect ? 'alert' : undefined} tone={badCount || badCorrect ? 'destructive' : undefined}>
              {row.maxQuestions > 0 ? `${t('baselineWizard.allowed')}: 1–${row.maxQuestions}.` : t('baselineWizard.noQuestions')}
              {' '}{t('baselineWizard.correctHelp')}
            </Text>
            {row.limitingSkills.length > 0 && <details><summary className="cursor-pointer text-body-sm text-muted-foreground">{t('baselineWizard.limitingSkills')}</summary><Text variant="caption" className="mt-2">{row.limitingSkills.join(', ')}</Text></details>}
          </div>
        })}
      </section>}
      {(step === 2 || editing) && <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={t('baselineWizard.timing')}>
        <Heading level={3} size="card" className="flex items-center gap-2"><Clock3 size={17} className="text-primary" aria-hidden="true" />{t('baselineUX.timingSection')}</Heading>
        <Text variant="caption" className="rounded-lg bg-background p-3">{t('baselineWizard.recommendations')}</Text>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('baselineWizard.totalMinutes')}</Text>
            <Input type="number" min={1 / 60} step="any" value={minutes} disabled={locked} onChange={e => { setMinutes(e.target.value); if (total > 0) setPerQuestion(e.target.value === '' ? '' : decimal(Number(e.target.value) / total)) }} /></label>
          <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('baselineWizard.minutesPerQuestion')}</Text>
            <Input type="number" min={total > 0 ? 1 / 60 / total : 1 / 60} step="any" value={perQuestion} disabled={locked || total < 1} onChange={e => { setPerQuestion(e.target.value); setMinutes(e.target.value === '' ? '' : decimal(Number(e.target.value) * total)) }} /></label>
          <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('scopedPolicy.maxAttempts')}</Text><Input type="number" min={1} step={1} value={attempts} disabled={locked} onChange={e => setAttempts(e.target.value)} /></label>
          <label className="block space-y-2"><Text as="span" variant="body-sm" tone="foreground" className="font-semibold">{t('baselineWizard.waitMinutes')}</Text><Input type="number" min={0} step="any" value={wait} disabled={locked} onChange={e => setWait(e.target.value)} /></label>
        </div>
      </section>}
      {(step === 3 || editing) && <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={t('baselineWizard.review')}>
        <Heading level={3} size="card" className="flex items-center gap-2"><CheckCircle2 size={17} className="text-primary" aria-hidden="true" />{t('baselineUX.reviewSection')}</Heading>
        <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-body-sm"><thead className="border-b border-border bg-muted/50"><tr>
          {['knowledgeLevel', 'skills', 'questionsPerSkill', 'correct', 'subtotal'].map(key => <th key={key} className="p-3 font-semibold">{t(`baselineWizard.${key}`)}</th>)}
        </tr></thead><tbody className="divide-y divide-border">{rows.map(r => <tr key={r.knowledgeLevel}><td className="p-3">{t(`knowledgeLevel.${r.knowledgeLevel}`)}</td><td className="p-3">{r.skillCount}</td><td className="p-3">{r.count || '—'}</td><td className="p-3">{r.correct || '—'}/{r.count || '—'}</td><td className="p-3">{(Number(r.count) || 0) * r.skillCount}</td></tr>)}</tbody></table></div>
        <Text>{t('baselineWizard.totalMinutes')}: {minutes || '—'} · {t('scopedPolicy.maxAttempts')}: {attempts || '—'} · {t('baselineWizard.waitMinutes')}: {wait || '—'}</Text>
        <Text variant="caption">{t('baselineUX.activationHelp')}</Text>
        {!workspace.scope.ready && <div role="status" className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-3"><Text variant="body-sm" tone="foreground">{t('baselineUX.activationBlocked')}</Text>{workspace.scope.readinessIssues.map(issue => <Text variant="caption" key={issue}>{t(`scopedPolicy.errors.${issue}`, t('scopedPolicy.notReady'))}</Text>)}</div>}
      </section>}
    </DialogBody>
    <DialogFooter className="flex-wrap">
      <Button variant="ghost" disabled={locked} onClick={onDiscard}>{t('baselineWizard.discard')}</Button>
      {!(editing || step === 3) && <Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" disabled={locked} onClick={saveAndClose}>{t('baselineWizard.saveClose')}</Button>}
      {!editing && step > 1 && <Button variant="outline" disabled={locked} onClick={() => save(step - 1)}>{t('baselineWizard.previous')}</Button>}
      {!editing && step < 3 ? <Button disabled={locked || step === 1 && !countsValid} onClick={() => save(step + 1)}>{t('baselineWizard.next')}</Button>
        : <><Button variant="outline" className="border-primary/30 text-primary hover:bg-secondary" disabled={locked || !countsValid} onClick={() => save(3, true, true)}>{t('baselineWizard.confirmSave')}</Button>
          <Button leftIcon={<CheckCircle2 size={16} aria-hidden="true" />} disabled={locked || !countsValid || !workspace.scope.ready} onClick={() => save(3, true, true, true)}>{t('baselineUX.saveActivate')}</Button></>}
    </DialogFooter>
  </>
})
