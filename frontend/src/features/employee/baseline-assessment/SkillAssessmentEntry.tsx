import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { BaselineHistory } from './BaselineResults'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { targetFor, type AssessmentState } from './usePathwayAssessmentStates'
import { attemptPath, BaselineError, executeCommand, readContextAttempt, readModuleHistory, startCommand, type BaselineCommand } from './baselineApi'


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

/** History only reads persisted attempts; starting/resuming/retaking requires a deliberate click. */
export function SkillAssessmentEntry({ pathway, step, option, onLockChange, disabled = false }: { pathway: RulePathway; step: RuleStep; option: RuleModuleOption; onLockChange?: (locked: boolean) => void; disabled?: boolean }) {
  const { t, language } = useTranslation(), navigate = useNavigate(), vi = language === 'vi'
  const identity = useContext(WorkspaceSessionContext)?.identity
  const [historyOpen, setHistoryOpen] = useState(false)
  const history = useQuery({
    queryKey: ['moduleSkillAttempts', identity?.organizationId, identity?.accountId, option.moduleId, option.moduleRevision],
    queryFn: ({ signal }) => readModuleHistory(option.moduleId, option.moduleRevision, signal),
    enabled: Boolean(identity?.accountId && option.completedAt), retry: false, staleTime: 0, gcTime: 0,
    refetchInterval: query => query.state.data?.some(attempt => attempt.state === 'IN_PROGRESS') ? 5000 : false,
  })
  const latest = history.data?.find(attempt => attempt.target.selectionId === pathway.selectionId &&
    attempt.target.selectionRevision === pathway.selectionRevision && attempt.target.stepId === step.id)
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
        if (latest?.state === 'IN_PROGRESS') { navigate(attemptPath(latest.id)); return }
        command = startCommand(target, 'SKILL_ASSESSMENT', latest?.id ?? null); setPending(command)
      }
      const accepted = await executeCommand(command); committed.current = accepted.id; setPending(null); navigate(attemptPath(accepted.id))
    } catch (cause) {
      const failure = cause instanceof BaselineError ? cause : new BaselineError('NETWORK_ERROR')
      setError(failure); if (!failure.ambiguous) setPending(null)
    } finally { lock.current = false; setBusy(false) }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy || (disabled && !pending) || (!pending && (history.isPending || history.isError))} onClick={() => void open()}>
        {pending && error ? t('employeeBaseline.retry') : history.isPending ? (vi ? 'Đang tải…' : 'Loading…')
          : latest?.state === 'FINALIZED' ? (vi ? 'Làm lại Skill Assessment' : 'Retake Skill Assessment')
          : latest?.state === 'IN_PROGRESS' ? (vi ? 'Tiếp tục Skill Assessment' : 'Resume Skill Assessment') : t('rulePathway.assessment')}
      </Button>
      {Boolean(history.data?.length) && <Button size="sm" variant="outline" disabled={busy || Boolean(pending)} onClick={() => setHistoryOpen(true)}>{vi ? 'Lịch sử làm bài' : 'Assessment history'}</Button>}
      {history.isError && <Button size="sm" variant="outline" disabled={busy || history.isFetching} onClick={() => void history.refetch()}>{t('employeeBaseline.retry')}</Button>}
    </div>
    {history.isError && <Text variant="body-sm" role="alert">{vi ? 'Chưa tải được lịch sử đánh giá của module. Hãy tải lại trước khi bắt đầu lượt mới.' : 'Could not load this module’s assessment history. Retry before starting a new attempt.'}</Text>}
    {historyOpen && <Dialog open size="wide" onOpenChange={setHistoryOpen} ariaLabel={vi ? 'Lịch sử làm bài của module' : 'Module assessment history'}>
      <DialogHeader><DialogTitle>{vi ? 'Lịch sử làm bài của module' : 'Module assessment history'}</DialogTitle></DialogHeader>
      <DialogBody><BaselineHistory module={{ moduleId: option.moduleId, moduleRevision: option.moduleRevision, title: option.title }} /></DialogBody>
      <DialogFooter><Button size="sm" variant="outline" onClick={() => setHistoryOpen(false)}>{t('common.close')}</Button></DialogFooter>
    </Dialog>}
    {error && <Text variant="body-sm" tone="destructive" role="alert">{t('employeeBaseline.errors.' + error.code, t('employeeBaseline.requestError'))}</Text>}
    {pending && <Text variant="body-sm" role="status">{t('employeeBaseline.retryNotice')}</Text>}
  </div>
}
