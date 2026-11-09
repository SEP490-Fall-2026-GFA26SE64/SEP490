import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { targetFor, type AssessmentState } from './usePathwayAssessmentStates'
import { attemptPath, BaselineError, executeCommand, readContextAttempt, startCommand, type BaselineCommand } from './baselineApi'


export function AssessmentStatus({ state }: { state: AssessmentState | null }) {
  const { language } = useTranslation()
  if (!state) return null
  const labels: Record<AssessmentState, [string, string]> = {
    loading: ['Checking assessment…', 'Đang kiểm tra bài đánh giá…'], unavailable: ['Assessment status unavailable', 'Chưa tải được trạng thái đánh giá'],
    notStarted: ['Assessment not taken', 'Chưa làm bài đánh giá'], inProgress: ['Assessment in progress', 'Đang làm bài đánh giá'],
    failed: ['Assessment not passed', 'Bài đánh giá chưa đạt'], passed: ['Assessment passed', 'Bài đánh giá đạt'],
    prerequisites: ['Main group passed · check prerequisite results', 'Nhóm chính đạt · xem kết quả tiền đề'],
  }
  return <Badge variant={state === 'passed' ? 'success' : state === 'failed' ? 'destructive' : state === 'loading' || state === 'unavailable' ? 'outline' : 'warning'} className="whitespace-normal text-left">{labels[state][language === 'vi' ? 1 : 0]}</Badge>
}

/** A deliberate click resumes an existing attempt or starts one through the shared command API. */
export function SkillAssessmentEntry({ pathway, step, option, onLockChange, disabled = false }: { pathway: RulePathway; step: RuleStep; option: RuleModuleOption; onLockChange?: (locked: boolean) => void; disabled?: boolean }) {
  const { t } = useTranslation(), navigate = useNavigate()
  const [pending, setPending] = useState<BaselineCommand | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<BaselineError | null>(null)
  const committed = useRef<string | null>(null), lock = useRef(false)
  useEffect(() => { onLockChange?.(busy || Boolean(pending)) }, [busy, pending, onLockChange])
  useEffect(() => {
    if (!busy && !pending) return
    const retain = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', retain)
    return () => window.removeEventListener('beforeunload', retain)
  }, [busy, pending])
  async function open() {
    if (lock.current || (disabled && !pending)) return
    lock.current = true; setBusy(true); setError(null)
    try {
      if (committed.current) { navigate(attemptPath(committed.current)); return }
      let command = pending
      if (!command) {
        const target = targetFor(pathway, step, option), latest = await readContextAttempt(target, 'SKILL_ASSESSMENT')
        if (latest) { navigate(attemptPath(latest.id)); return }
        command = startCommand(target, 'SKILL_ASSESSMENT'); setPending(command)
      }
      const accepted = await executeCommand(command); committed.current = accepted.id; setPending(null); navigate(attemptPath(accepted.id))
    } catch (cause) {
      const failure = cause instanceof BaselineError ? cause : new BaselineError('NETWORK_ERROR')
      setError(failure); if (!failure.ambiguous) setPending(null)
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="space-y-2">
    <Button size="sm" disabled={busy || (disabled && !pending)} onClick={() => void open()}>{pending && error ? t('employeeBaseline.retry') : t('rulePathway.assessment')}</Button>
    {error && <Text variant="body-sm" tone="destructive" role="alert">{t('employeeBaseline.errors.' + error.code, t('employeeBaseline.requestError'))}</Text>}
    {pending && <Text variant="body-sm" role="status">{t('employeeBaseline.retryNotice')}</Text>}
  </div>
}
