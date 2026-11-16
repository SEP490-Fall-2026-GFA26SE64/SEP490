import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../shared/components/ui/Dialog'
import { BaselineHistory } from './BaselineResults'
import { useContext, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Button } from '../../../shared/components/ui/Button'
import { BaselineError, attemptPath, executeCommand, readContextAttempt, startCommand, type BaselineCommand } from './baselineApi'

/** Backend revalidates admission and exact completion; no client-side mastery or pass simulation. */
export function IndependentSkillAssessmentEntry({ moduleId, revision }: { moduleId: string; revision: number }) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  const { language, t } = useTranslation(), vi = language === 'vi'
  const navigate = useNavigate(), lock = useRef(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState<BaselineError | null>(null)
  const [pending, setPending] = useState<BaselineCommand | null>(null)
  const target = { selectionId: null, selectionRevision: 0, moduleId, moduleRevision: revision }
  const query = useQuery({ queryKey: ['independentAssessment', identity?.organizationId, identity?.accountId, moduleId, revision],
    queryFn: ({ signal }) => readContextAttempt(target, 'SKILL_ASSESSMENT', signal), enabled: Boolean(identity), retry: false, gcTime: 0 })
  async function open() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null)
    try {
      if (query.data?.state === 'IN_PROGRESS') { void navigate(attemptPath(query.data.id)); return }
      const command = pending ?? startCommand(target, 'SKILL_ASSESSMENT', query.data?.id ?? null)
      setPending(command)
      const accepted = await executeCommand(command); setPending(null)
      void navigate(attemptPath(accepted.id))
    } catch (cause) {
      const failure = cause instanceof BaselineError ? cause : new BaselineError('NETWORK_ERROR')
      setError(failure); if (!failure.ambiguous) setPending(null)
    } finally { lock.current = false; setBusy(false) }
  }
  const failure = error ?? (query.error instanceof BaselineError ? query.error : null)
  return <section className="space-y-2 rounded-lg border border-border bg-card p-4" aria-label={vi ? 'Đánh giá kỹ năng độc lập' : 'Independent Skill Assessment'}>
    <p className="text-body-sm text-muted-foreground">{vi ? 'Thi đạt và đủ điều kiện bắt buộc để được ghi nhận kỹ năng chính thức.' : 'Pass the assessment and its required conditions to earn official skill achievement.'}</p>
    {failure && <p role="alert" className="text-body-sm text-destructive">{t('employeeBaseline.errors.' + failure.code, vi ? 'Bài đánh giá chưa sẵn sàng. Tiến độ học vẫn được giữ.' : 'Assessment is unavailable. Your learning progress is preserved.')} ({failure.code})</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy || query.isPending || Boolean(query.error)} onClick={() => void open()}>{busy ? (vi ? 'Đang mở…' : 'Opening…') : pending && error ? (vi ? 'Thử lại' : 'Retry') : query.data?.state === 'IN_PROGRESS' ? (vi ? 'Tiếp tục Skill Assessment' : 'Resume Skill Assessment') : query.data ? (vi ? 'Thi lại Skill Assessment' : 'Retake Skill Assessment') : (vi ? 'Làm Skill Assessment' : 'Take Skill Assessment')}</Button>
      {query.data && <Button size="sm" variant="outline" disabled={busy} onClick={() => void navigate(attemptPath(query.data!.id))}>{vi ? 'Xem lần thi gần nhất' : 'View latest attempt'}</Button>}
      <Button size="sm" variant="outline" disabled={busy || Boolean(pending)} onClick={() => setHistoryOpen(true)}>{vi ? 'Lịch sử đánh giá' : 'Assessment history'}</Button>
      {query.error && <Button size="sm" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>{vi ? 'Thử lại' : 'Retry'}</Button>}
    </div>
    {historyOpen && <Dialog open onOpenChange={setHistoryOpen} size="wide" ariaLabel={vi ? 'Lịch sử đánh giá' : 'Assessment history'}><DialogHeader><DialogTitle>{vi ? 'Lịch sử đánh giá' : 'Assessment history'}</DialogTitle></DialogHeader><DialogBody><BaselineHistory module={{ moduleId, moduleRevision: revision, title: vi ? 'Module đang học' : 'Current module' }} /></DialogBody><DialogFooter><Button variant="outline" onClick={() => setHistoryOpen(false)}>{vi ? 'Đóng' : 'Close'}</Button></DialogFooter></Dialog>}
  </section>
}
