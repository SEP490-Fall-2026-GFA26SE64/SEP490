import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { BaselineError, attemptPath, executeCommand, readSkillScope, startCommand, type AssessmentTarget, type BaselineCommand, type SkillScopeLocator } from './baselineApi'
import { PageLoader } from '../../../shared/components/ui/PageLoader'

/** Scoped read is independent of the module chosen as evidence for a NEW paper. Old servers keep their existing entry. */
export function SharedSkillAssessmentEntry({ locator, getNewTarget, legacy, disabled = false, header, admission, onLockChange, panel = false }:  {
  locator: SkillScopeLocator; getNewTarget: () => Promise<AssessmentTarget>; legacy: ReactNode; disabled?: boolean
  header?: ReactNode; admission?: ReactNode; onLockChange?: (locked: boolean) => void; panel?: boolean
}) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedSharedEntry key={JSON.stringify([identity?.organizationId, identity?.accountId, identity?.roles, locator])} locator={locator} getNewTarget={getNewTarget} legacy={legacy} disabled={disabled} header={header} admission={admission} onLockChange={onLockChange} panel={panel} />
}
function OwnedSharedEntry({ locator, getNewTarget, legacy, disabled, header, admission, onLockChange, panel }: {
  locator: SkillScopeLocator; getNewTarget: () => Promise<AssessmentTarget>; legacy: ReactNode; disabled: boolean
  header?: ReactNode; admission?: ReactNode; onLockChange?: (locked: boolean) => void; panel?: boolean
}) {
  const identity = useContext(WorkspaceSessionContext)?.identity, { language, t } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const navigate = useNavigate(), lock = useRef(false)
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<BaselineCommand | null>(null), [failure, setFailure] = useState<BaselineError | null>(null), [historyOpen, setHistoryOpen] = useState(false)
  const allowed = Boolean(identity?.organizationId && identity.accountId && identity.roles?.includes('EMPLOYEE'))
  const query = useInfiniteQuery({ queryKey: ['skillAssessmentScope', identity?.organizationId, identity?.accountId, locator], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => readSkillScope(locator, signal, pageParam), getNextPageParam: last => last.hasMore && last.page < 10000 ? last.page + 1 : undefined,
    enabled: allowed, retry: false, gcTime: 0, refetchInterval: q => q.state.error ? false : 5000 })
  useEffect(() => { onLockChange?.(busy || Boolean(pending)) }, [busy, pending, onLockChange])
  useEffect(() => {
    if (!pending) return
    const retain = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', retain); return () => window.removeEventListener('beforeunload', retain)
  }, [pending])
  const error = query.error instanceof BaselineError ? query.error : null
  const unsupported = error?.status === 404 && ['REQUEST_FAILED', 'NOT_FOUND', 'RESOURCE_NOT_FOUND'].includes(error.code)
  const data = query.data?.pages[0], denied = !allowed || Boolean(error && [401, 403].includes(error.status))
  async function start() {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure(null)
    try {
      let command = pending
      if (!command) {
        const fresh = await readSkillScope(locator)
        if (fresh.activeAttempts.length) { await query.refetch(); return }
        if (fresh.unresolvedAttempts || fresh.policyIssue) { await query.refetch(); return }
        if (fresh.maxAttempts !== null && fresh.totalAttempts >= fresh.maxAttempts) throw new BaselineError('RETAKE_LIMIT_REACHED', 409)
        if (fresh.retakeAvailableAt && Date.parse(fresh.retakeAvailableAt) > Date.parse(fresh.observedAt)) throw new BaselineError('RETAKE_NOT_YET_AVAILABLE', 409)
        command = startCommand(await getNewTarget(), 'SKILL_ASSESSMENT', fresh.previousAttemptId); setPending(command)
      }
      const accepted = await executeCommand(command); setPending(null); void navigate(attemptPath(accepted.id))
    } catch (cause) {
      const e = cause instanceof BaselineError ? cause : new BaselineError('NETWORK_ERROR'); setFailure(e)
      if (!e.ambiguous) { setPending(null); void query.refetch() }
    } finally { lock.current = false; setBusy(false) }
  }
  if (unsupported && !denied) return <>{legacy}</>
  if (denied) return <p role="alert" className="text-body-sm text-destructive">{copy('Access to this assessment history is denied.', 'Không có quyền truy cập lịch sử đánh giá này.')}</p>
  const active = data?.activeAttempts ?? []
  const cooldown = Boolean(data?.retakeAvailableAt && Date.parse(data.retakeAvailableAt) > Date.parse(data.observedAt))
  const limit = data?.maxAttempts !== null && data?.maxAttempts !== undefined && data.totalAttempts >= data.maxAttempts
  const blocked = disabled || !data || query.isError || Boolean(data.unresolvedAttempts || data.policyIssue) || cooldown || limit
  const summaries = [...new Map(query.data?.pages.flatMap(p => p.items).map(a => [a.id, a]) ?? []).values()]
  return <section aria-label={panel ? 'Skill Assessment' : copy('Shared Skill Assessment', 'Skill Assessment dùng chung')} className={panel ? 'space-y-3 rounded-lg border border-primary/20 bg-card p-4 shadow-sm' : 'space-y-3'}>
    {header}
    <p className="text-caption text-muted-foreground">{copy('History and retake limits are shared across modules and learning pathways for this skill, level and version.', 'Lịch sử và giới hạn thi lại dùng chung giữa các module và luồng học cho cùng kỹ năng, mức kiến thức và phiên bản.')}</p>
    {query.isPending && <PageLoader size="sm" label={copy('Loading assessment history…', 'Đang tải lịch sử đánh giá…')} />}
    {query.isError && <div role="alert" className="space-y-2"><p className="text-body-sm text-destructive">{copy('Could not fully load shared assessment history. Retry before starting a new attempt.', 'Chưa tải đầy đủ lịch sử đánh giá chung. Hãy thử lại trước khi mở bài mới.')}</p><Button size="sm" variant="outline" disabled={query.isFetching} onClick={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>{copy('Retry', 'Thử lại')}</Button></div>}
    {data && <>
      <p className="text-body-sm">{copy('Attempts used', 'Số lượt đã dùng')}: <strong>{data.totalAttempts}{data.maxAttempts !== null ? ` / ${data.maxAttempts}` : ''}</strong></p>
      {data.unresolvedAttempts > 0 && <p role="alert" className="text-body-sm text-destructive">{copy('Some historical attempts need reconciliation. New attempts are blocked until their skill version is verified.', 'Một số lượt thi cũ cần đối soát. Chưa thể mở bài mới trước khi xác định đúng phiên bản kỹ năng.')}</p>}
      {active.length > 1 && <p role="status" className="text-body-sm">{copy('Multiple previous assessments are still open. Complete them or let their original deadlines pass before starting another.', 'Có nhiều bài cũ đang làm. Hãy hoàn tất hoặc chờ thời hạn gốc trước khi mở bài mới.')}</p>}
      {active.length > 0 && <ul className="space-y-2" aria-label={copy('Active skill assessments', 'Bài đánh giá đang làm')}>{active.map(a => <li key={a.id} className="space-y-2 rounded-lg border border-border bg-card p-3"><p className="break-words text-caption text-muted-foreground">{a.target.selectionId ? copy('Pathway', 'Lộ trình') : copy('Individual learning', 'Học độc lập')} · {a.target.moduleId ?? copy('Original module unavailable', 'Chưa có thông tin module gốc')} · {new Date(a.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</p><Button size="sm" disabled={busy || Boolean(pending)} onClick={() => void navigate(attemptPath(a.id))}>{Date.parse(a.deadlineAt) <= Date.parse(data.observedAt) ? copy('View expired assessment', 'Xem bài đã hết giờ') : copy('Resume Skill Assessment', 'Tiếp tục Skill Assessment')}</Button></li>)}</ul>}
      {active.length === 0 && <>
        {admission}
        {data.policyIssue && <p role="alert" className="text-body-sm text-muted-foreground">{t('employeeBaseline.errors.' + data.policyIssue, copy('Assessment configuration is currently unavailable.', 'Cấu hình đánh giá hiện chưa sẵn sàng.'))}</p>}
        {limit && <p className="text-body-sm text-muted-foreground">{t('employeeBaseline.errors.RETAKE_LIMIT_REACHED')}</p>}
        {cooldown && <p className="text-body-sm text-muted-foreground">{copy('Retake available after', 'Có thể thi lại sau')}: {new Date(data.retakeAvailableAt!).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</p>}
        <Button size="sm" disabled={busy || (!pending && blocked)} onClick={() => void start()}>{busy ? copy('Opening…', 'Đang mở…') : pending ? copy('Retry', 'Thử lại') : data.totalAttempts ? copy('Retake Skill Assessment', 'Thi lại Skill Assessment') : copy('Take Skill Assessment', 'Làm Skill Assessment')}</Button>
      </>}
      <Button size="sm" variant="outline" disabled={busy || Boolean(pending)} onClick={() => setHistoryOpen(true)}>{copy('Assessment history', 'Lịch sử đánh giá')}</Button>
    </>}
    {failure && <p role="alert" className="text-body-sm text-destructive">{t('employeeBaseline.errors.' + failure.code, copy('Could not open the assessment. Learning progress is preserved.', 'Chưa thể mở bài đánh giá. Tiến độ học vẫn được giữ.'))}</p>}
    {pending && <p role="status" className="text-caption text-muted-foreground">{copy('Retry reuses the same request to avoid creating a duplicate attempt.', 'Thử lại dùng đúng yêu cầu trước để tránh tạo trùng lượt thi.')}</p>}
    <Dialog open={historyOpen && !denied} onOpenChange={setHistoryOpen} size="wide" ariaLabel={copy('Shared assessment history', 'Lịch sử đánh giá chung')} closeLabel={copy('Close history', 'Đóng lịch sử')}>
      <DialogHeader><DialogTitle>{copy('Shared assessment history', 'Lịch sử đánh giá chung')}</DialogTitle></DialogHeader><DialogBody className="space-y-3">
        {summaries.length ? <ul className="space-y-3">{summaries.map(a => <li key={a.id} className="space-y-2 rounded-lg border border-border p-3"><div className="flex flex-wrap gap-2"><Badge variant={a.state === 'IN_PROGRESS' ? 'warning' : 'outline'}>{a.state === 'IN_PROGRESS' ? copy('In progress', 'Đang làm') : copy('Completed', 'Đã hoàn tất')}</Badge><span className="text-caption text-muted-foreground">{a.target.selectionId ? copy('Pathway', 'Lộ trình') : copy('Individual learning', 'Học độc lập')}</span></div><p className="break-words text-caption text-muted-foreground">{a.target.moduleId ?? copy('Original module unavailable', 'Chưa có thông tin module gốc')} · {new Date(a.startedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')}</p><Link className={buttonVariants({ variant: 'link', size: 'sm', className: 'h-auto px-0' })} to={attemptPath(a.id)}>{a.state === 'IN_PROGRESS' ? copy('Open assessment', 'Mở bài đánh giá') : copy('View result', 'Xem kết quả')}</Link></li>)}</ul> : <p className="text-body-sm text-muted-foreground">{copy('No assessment attempts recorded.', 'Chưa có lượt đánh giá.')}</p>}
        {query.hasNextPage && <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{copy('Load more history', 'Tải thêm lịch sử')}</Button>}
        {query.isError && <p role="alert" className="text-body-sm text-destructive">{copy('History is incomplete. Close and retry the read.', 'Lịch sử chưa đầy đủ. Hãy đóng và thử tải lại.')}</p>}
      </DialogBody><DialogFooter><Button variant="outline" onClick={() => setHistoryOpen(false)}>{copy('Close', 'Đóng')}</Button></DialogFooter>
    </Dialog>
  </section>
}
