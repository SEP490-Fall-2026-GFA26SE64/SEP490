import { useQuery } from '@tanstack/react-query'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readRulePathway, type RulePathway, type RuleStep, type RuleModuleOption } from '../../../shared/api/requirementPathway'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { SkillLearningPanel } from './SkillLearningPanel'
import { AssessmentStatus, SkillAssessmentEntry } from '../baseline-assessment/SkillAssessmentEntry'
import { usePathwayAssessmentStates } from '../baseline-assessment/usePathwayAssessmentStates'
import { useCallback, useContext, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { LearningReaderHeader } from './LearningReaderHeader'
import { LearningLessonSidebar } from './LearningLessonSidebar'
import '../../../shared/styles/learningReader.css'
import {
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LearnerLessonLayout } from '../../../shared/layouts/LearnerLessonLayout'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Heading } from '../../../shared/components/typography/Heading'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { LessonVideo } from '../../../shared/components/learning/LessonVideo'
import { LessonBody } from '../../../shared/components/learning/LessonBody'
import {
  moduleRequest,
  type LearningView,
  type LessonProgress,
} from '../../../shared/api/moduleAuthoringApi'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

/** Existing sidebar/reading/player/next-lesson layout, connected to versioned server content. */
export function LearningModuleReaderPage() {
  const { moduleId = '' } = useParams()
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <LearningModuleReader key={`${identity?.organizationId}:${identity?.accountId}:${moduleId}`} moduleId={moduleId} />
}
function LearningModuleReader({ moduleId }: { moduleId: string }) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [saving, setSaving] = useState(0)
  const [unsaved, setUnsaved] = useState(false)
  const failedWrite = useRef<{ lessonId: string; revision: number; patch: Record<string, number | boolean> } | null>(null)
  const [view, setView] = useState<LearningView | null>(null)
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [readEnd, setReadEnd] = useState(false)
  const [bodyReady, setBodyReady] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [issue, setIssue] = useState(false)
  const [detail, setDetail] = useState('')
  const [switching, setSwitching] = useState(false)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const issueCommand = useRef(crypto.randomUUID())
  const bodyEnd = useRef<HTMLDivElement>(null)
  const request = useRef(Promise.resolve())
  const lock = useRef(false)
  const videoPosition = useRef(0)
  const lastSample = useRef<{
    position: number
    time: number
    playing: boolean
  } | null>(null)
  const pending = useRef<{ start: number; end: number } | null>(null)
  const lastSent = useRef(0)
  useEffect(() => {
    const abort = new AbortController()
    void moduleRequest<LearningView>(
      `/learning/${encodeURIComponent(moduleId)}/begin`,
      'POST',
      {},
      abort.signal,
    )
      .then((result) => {
        if (abort.signal.aborted) return
        setView(result)
        setActive(
          result.activeLessonId &&
            result.revision.payload.content.lessons?.some(
              (l) => l.id === result.activeLessonId,
            )
            ? result.activeLessonId
            : (result.revision.payload.content.lessons?.[0]?.id ?? ''),
        )
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : 'Cannot open module')
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [moduleId, attempt])
  useEffect(() => {
    if (!saving && !unsaved) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saving, unsaved])
  const lessons = view?.revision.payload.content.lessons ?? []
  const current = lessons.find((l) => l.id === active)
  const progress = view?.progress.find((p) => p.lessonId === active)
  const revisionNumber = view?.revision.number
  const update = useCallback(
    (patch: {
      positionSeconds?: number
      segmentStart?: number
      segmentEnd?: number
      reachedEnd?: boolean
      complete?: boolean
    }) => {
      if (!revisionNumber || !active) return Promise.resolve()
      const revision = revisionNumber
      const lessonId = active
      setSaving(count => count + 1)
      const work = request.current
        .catch(() => undefined)
        .then(async () => {
          const persist = async (write: { lessonId: string; revision: number; patch: Record<string, number | boolean> }) => {
            failedWrite.current = write
            setUnsaved(true)
            const result = await moduleRequest<LessonProgress>(
              `/learning/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(write.lessonId)}/progress`,
              'PUT', { revision: write.revision, positionSeconds: 0, ...write.patch },
            )
            failedWrite.current = null
            setUnsaved(false)
            setView(old => old?.revision.number === write.revision ? { ...old, progress: [...old.progress.filter(p => p.lessonId !== write.lessonId), result] } : old)
          }
          // Retry an unacknowledged write before a later sample or navigation can replace it.
          if (failedWrite.current) await persist(failedWrite.current)
          await persist({ lessonId, revision, patch })
        })
      const tracked = work.finally(() => setSaving(count => count - 1))
      request.current = tracked
      return tracked
    },
    [revisionNumber, active, moduleId],
  )
  const enterLesson = useEffectEvent(() => {
    lastSample.current = null
    pending.current = null
    lastSent.current = 0
    videoPosition.current = progress?.positionSeconds ?? 0
    if (!active) return
    void Promise.resolve().then(() => update({ positionSeconds: progress?.positionSeconds ?? 0 })).catch(
      (e: unknown) =>
        setError(e instanceof Error ? e.message : 'Cannot save progress'),
    )
  })
  useEffect(() => {
    enterLesson()
  }, [active, revisionNumber])
  useEffect(() => {
    const target = bodyEnd.current
    if (!target || !bodyReady || current?.type !== 'TEXT') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setReadEnd(true)
          void update({ reachedEnd: true }).catch((e: unknown) =>
            setError(e instanceof Error ? e.message : 'Cannot save progress'),
          )
        }
      },
      { threshold: 1 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [active, current?.body, current?.type, bodyReady, update])
  const flushProgress = async () => {
    if (!current) { await request.current; return }
    const interval = pending.current
    await update({
      positionSeconds: current.type === 'VIDEO' ? videoPosition.current : (progress?.positionSeconds ?? 0),
      ...(current.type === 'VIDEO' && interval ? { segmentStart: interval.start, segmentEnd: interval.end } : {}),
      ...(current.type === 'TEXT' && readEnd ? { reachedEnd: true } : {}),
    })
    if (pending.current === interval) pending.current = null
  }
  const changeLesson = (id: string) => {
    if (id === active) return
    void run(async () => {
      await flushProgress()
      setReadEnd(false)
      setBodyReady(false)
      setVideoFailed(false)
      setActive(id)
    })
  }
  const exitReader = (event: MouseEvent<HTMLAnchorElement>, destination: string) => {
    // Modified clicks retain ordinary link behavior without changing this reader.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    void run(async () => { await flushProgress(); navigate(destination) })
  }
  const completed = lessons.filter((lesson) =>
    view?.progress.some((p) => p.lessonId === lesson.id && p.completedAt),
  ).length
  const watched =
    progress?.watchedIntervals.reduce(
      (total, interval) => total + interval.end - interval.start,
      0,
    ) ?? 0
  const eligible =
    current?.type === 'TEXT'
      ? readEnd || progress?.reachedEnd
      : !videoFailed &&
        Boolean(current && watched / current.durationSeconds >= 0.9)
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const activeIndex = lessons.findIndex((lesson) => lesson.id === active)
  const isLast = activeIndex === lessons.length - 1
  return (
    <LearnerLessonLayout>
      <div
        className="learner-reader flex min-w-0 flex-col overflow-clip bg-card text-foreground"
        data-testid="original-lesson-reader"
      >
        <LearningReaderHeader title={view?.revision.payload.title ?? (vi ? 'Nội dung học' : 'Learning content')} completed={completed} total={lessons.length} remainingSeconds={lessons.reduce((seconds, lesson) => {
          const saved = view?.progress.find(p => p.lessonId === lesson.id)
          if (saved?.completedAt) return seconds
          const covered = lesson.type === 'VIDEO' ? (saved?.watchedIntervals.reduce((sum, interval) => sum + interval.end - interval.start, 0) ?? 0) : 0
          return seconds + Math.max(0, lesson.durationSeconds - covered)
        }, 0)} sidebarOpen={sidebarOpen} busy={busy} saving={saving > 0} vi={vi} onToggle={() => setSidebarOpen(open => !open)} onExit={exitReader} />

        {error && (
          <div
            role="alert"
            className="space-y-2 border-b border-destructive bg-card p-3 text-destructive"
          >
            <p>{error}</p>
            {view && unsaved && <Button variant="outline" disabled={busy} onClick={() => void run(flushProgress)}>{vi ? 'Thử lưu lại tiến độ' : 'Retry saving progress'}</Button>}
            {!view && (
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true)
                  setError('')
                  setAttempt((a) => a + 1)
                }}
              >
                {vi ? 'Thử lại' : 'Retry'}
              </Button>
            )}
          </div>
        )}
        {notice && (
          <p role="status" className="p-3 text-success">
            {notice}
          </p>
        )}
        {loading ? (
          <div role="status" className="h-64 animate-pulse bg-muted p-5">
            {vi ? 'Đang tải bài học…' : 'Loading lessons…'}
          </div>
        ) : (
          view && (
            <>
              <div className="flex min-w-0 flex-1 flex-col md:flex-row">
                {sidebarOpen && <LearningLessonSidebar title={view.revision.payload.title} lessons={lessons} progress={view.progress} active={active} completed={completed} revision={view.revision.number} newer={view.latestRevision != null && view.latestRevision > view.revision.number} busy={busy} vi={vi} onSelect={changeLesson} onSwitch={() => setSwitching(true)} />}
                <div
                  className="min-w-0 flex-1 bg-card p-4 sm:p-6 lg:px-10 lg:py-8"
                  aria-label={vi ? 'Nội dung bài học' : 'Lesson content'}
                  role="region"
                >
                  {!current && <div role="status" className="rounded-xl border border-border bg-card p-6"><Heading level={2} size="card">{vi ? 'Chưa có bài học' : 'No lessons available'}</Heading><p className="mt-2 text-body-sm text-muted-foreground">{vi ? 'Module này chưa có nội dung để học. Quay lại lộ trình hoặc báo cho Expert phụ trách.' : 'This module has no available lessons. Return to your pathway or contact the responsible Expert.'}</p></div>}
                  {current && (
                    <article aria-labelledby="learning-lesson-title" className="learning-document-page mx-auto flex w-full max-w-6xl flex-col space-y-6 py-2">
                      <div className="space-y-6">
                        {current.type === 'VIDEO' && (
                          <div className="overflow-hidden rounded-xl bg-muted shadow-xs">
                            <LessonVideo
                              key={`${view.revision.number}:${current.id}`}
                              lesson={current}
                              appearance="lesson"
                              startAt={progress?.positionSeconds ?? 0}
                              onUnavailable={() => setVideoFailed(true)}
                              onSample={(sample) => {
                                if (sample.playing && sample.duration > 0)
                                  setVideoFailed(false)
                                videoPosition.current = sample.position
                                const now = performance.now()
                                const previous = lastSample.current
                                if (previous?.playing) {
                                  const delta =
                                    sample.position - previous.position
                                  const elapsed = (now - previous.time) / 1000
                                  if (
                                    delta > 0 &&
                                    delta <= elapsed * 2 + 0.5 &&
                                    delta < 5
                                  ) {
                                    if (!pending.current)
                                      pending.current = {
                                        start: previous.position,
                                        end: sample.position,
                                      }
                                    else if (
                                      Math.abs(
                                        pending.current.end - previous.position,
                                      ) < 0.2
                                    )
                                      pending.current.end = sample.position
                                    else
                                      pending.current = {
                                        start: previous.position,
                                        end: sample.position,
                                      }
                                  } else if (delta !== 0) pending.current = null
                                }
                                lastSample.current = {
                                  position: sample.position,
                                  time: now,
                                  playing: sample.playing,
                                }
                                if (
                                  now - lastSent.current >= 5000 ||
                                  !sample.playing
                                ) {
                                  lastSent.current = now
                                  const interval = pending.current
                                  pending.current = null
                                  void update({
                                    positionSeconds: sample.position,
                                    ...(interval
                                      ? {
                                          segmentStart: interval.start,
                                          segmentEnd: interval.end,
                                        }
                                      : {}),
                                  }).catch((e: unknown) =>
                                    setError(
                                      e instanceof Error
                                        ? e.message
                                        : 'Cannot save progress',
                                    ),
                                  )
                                }
                              }}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <p className="text-eyebrow font-bold uppercase tracking-wide text-primary">
                            {current.type === 'TEXT'
                              ? vi
                                ? 'Bài đọc'
                                : 'Reading'
                              : vi
                                ? 'Bài giảng video'
                                : 'Video lecture'}{' '}
                            · {Math.ceil(current.durationSeconds / 60)}{' '}
                            {vi ? 'phút' : 'min'}
                          </p>
                          <Heading
                            id="learning-lesson-title"
                            level={1}
                            size="page"
                            className="break-words"
                          >
                            {current.title}
                          </Heading>
                        </div>
                        {current.type === 'TEXT' && (
                          <>
                            <div className="learner-reading-body"><LessonBody
                              presentation="document"
                              body={current.body ?? ''}
                              format={current.bodyFormat ?? 'HTML'}
                              onReady={() => setBodyReady(true)}
                            /></div>
                            <div
                              ref={bodyEnd}
                              className="h-1"
                              aria-hidden="true"
                            />
                          </>
                        )}
                        <p className="text-body-sm text-muted-foreground">
                          {current.type === 'TEXT'
                            ? vi
                              ? 'Đọc đến cuối bài rồi bấm hoàn thành.'
                              : 'Reach the end, then mark this lesson completed.'
                            : `${vi ? 'Đã xem' : 'Watched'} ${Math.min(100, Math.floor((watched / current.durationSeconds) * 100))}% · ${vi ? 'Cần xem ít nhất 90% để xác nhận hoàn thành.' : 'Watch at least 90% before marking completed.'}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        <Button variant="outline" disabled={busy || activeIndex <= 0} onClick={() => changeLesson(lessons[activeIndex - 1].id)} leftIcon={<ChevronLeft size={16} aria-hidden="true" />}>
                          {vi ? 'Bài trước' : 'Previous lesson'}
                        </Button>
                        <Button
                          variant={progress?.completedAt ? 'outline' : 'primary'}
                          disabled={
                            busy || !eligible || Boolean(progress?.completedAt)
                          }
                          onClick={() =>
                            void run(async () => {
                              await update({
                                positionSeconds:
                                  current.type === 'VIDEO'
                                    ? videoPosition.current
                                    : 0,
                                reachedEnd: readEnd,
                                complete: true,
                              })
                            })
                          }
                          className={`gap-1.5 text-body-sm font-semibold ${progress?.completedAt ? 'border-success/30 bg-success/15 text-success' : ''}`}
                        >
                          <Check size={14} aria-hidden="true" />
                          {progress?.completedAt
                            ? vi
                              ? 'Đã hoàn thành bài'
                              : 'Lesson completed'
                            : vi
                              ? 'Đánh dấu đã hoàn thành'
                              : 'Mark as completed'}
                        </Button>
                        {!isLast ? (
                          <Button
                            variant={progress?.completedAt ? 'primary' : 'outline'}
                            disabled={busy}
                            onClick={() =>
                              changeLesson(lessons[activeIndex + 1].id)
                            }
                            rightIcon={<ChevronRight size={16} />}
                            className="font-semibold"
                          >
                            {vi
                              ? 'Chuyển sang bài tiếp theo'
                              : 'Next lesson'}
                          </Button>
                        ) : (
                          <p className="text-body-sm text-muted-foreground" role="status">{vi ? 'Điều kiện thi kỹ năng được hiển thị bên dưới.' : 'Skill learning eligibility is shown below.'}</p>
                        )}
                      </div>
                      {completed === lessons.length && lessons.length > 0 && <div role="status" className="rounded-lg border border-success/30 bg-success/10 p-4 text-body-sm"><p className="font-semibold text-success">{vi ? 'Đã hoàn thành nội dung module' : 'Module content completed'}</p><p className="mt-1 text-muted-foreground">{vi ? 'Tiếp tục đánh giá kỹ năng bên dưới. Hoàn thành nội dung chưa đồng nghĩa đã đạt kỹ năng.' : 'Continue to the Skill Assessment below. Content completion is separate from official skill achievement.'}</p></div>}
                      {view.revision.payload.teachings.length === 1 && <SkillLearningPanel skillId={view.revision.payload.teachings[0].skillId} skillName={view.revision.payload.teachings[0].skillName} moduleId={moduleId} completedLessons={view.progress.filter(p => p.completedAt !== null).length} />}
                      {lessons.length > 0 && completed === lessons.length && view.revision.payload.knowledgeLevel && view.revision.payload.teachings.length === 1 && <CompletedModuleAssessmentLink moduleId={moduleId} revision={view.revision.number} />}
                      {view.revision.payload.teachings.length !== 1 && <p role="status" className="text-body-sm text-muted-foreground">{vi ? 'Liên kết kỹ năng của phiên bản này cần được đối soát trước khi xác định điều kiện thi.' : 'This historical version needs skill mapping reconciliation before learning eligibility can be determined.'}</p>}
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            issueCommand.current = crypto.randomUUID()
                            setDetail('')
                            setIssue(true)
                          }}
                        >
                          {vi ? 'Báo lỗi nội dung' : 'Report content issue'}
                        </Button>
                      </div>
                    </article>
                  )}
                </div>
              </div>
            </>
          )
        )}
        <Dialog
          open={issue}
          onOpenChange={(open) => {
            if (!busy) setIssue(open)
          }}
          ariaLabel={vi ? 'Báo lỗi nội dung' : 'Report content issue'}
        >
          <DialogHeader>
            <DialogTitle>
              {vi
                ? 'Mô tả lỗi để Expert kiểm tra'
                : 'Describe the issue for the responsible Expert'}
            </DialogTitle>
          </DialogHeader>
          <Input
            maxLength={2000}
            aria-label={vi ? 'Nội dung báo lỗi' : 'Issue description'}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssue(false)}>
              {vi ? 'Hủy' : 'Cancel'}
            </Button>
            <Button
              disabled={busy || !detail.trim()}
              onClick={() =>
                void run(async () => {
                  await moduleRequest(
                    `/learning/${encodeURIComponent(moduleId)}/issues`,
                    'POST',
                    {
                      lessonId: active,
                      detail,
                      commandId: issueCommand.current,
                    },
                  )
                  setIssue(false)
                  setNotice(
                    vi
                      ? 'Đã gửi báo lỗi đến Expert phụ trách.'
                      : 'Issue reported to the responsible Expert.',
                  )
                })
              }
            >
              {vi ? 'Gửi báo lỗi' : 'Send report'}
            </Button>
          </DialogFooter>
        </Dialog>
        <Dialog
          open={switching}
          onOpenChange={(open) => {
            if (!busy) setSwitching(open)
          }}
          ariaLabel={vi ? 'Chuyển phiên bản' : 'Switch version'}
        >
          <DialogHeader>
            <DialogTitle>
              {vi
                ? 'Chuyển sang phiên bản mới?'
                : 'Switch to the latest version?'}
            </DialogTitle>
          </DialogHeader>
          <p>
            {vi
              ? 'Giữ tiến độ các bài không đổi. Những bài thay đổi nội dung cần học lại; lịch sử phiên bản cũ vẫn được lưu.'
              : 'Unchanged lessons keep their progress. Changed lessons require learning again; earlier history is retained.'}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setSwitching(false)}
            >
              {vi ? 'Giữ phiên bản hiện tại' : 'Keep current version'}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await flushProgress()
                  const result = await moduleRequest<LearningView>(
                    `/learning/${encodeURIComponent(moduleId)}/switch`,
                    'POST',
                    { revision: view?.revision.number },
                  )
                  setView(result)
                  setReadEnd(false)
                  setBodyReady(false)
                  setVideoFailed(false)
                  setActive(
                    result.revision.payload.content.lessons?.[0]?.id ?? '',
                  )
                  setSwitching(false)
                })
              }
            >
              {vi ? 'Chuyển phiên bản' : 'Switch version'}
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </LearnerLessonLayout>
  )
}

function CompletedModuleAssessmentLink({ moduleId, revision }: { moduleId: string; revision: number }) {
  const { t } = useTranslation(), identity = useContext(WorkspaceSessionContext)?.identity
  const scope = `${identity?.organizationId}:${identity?.accountId}:${identity?.roles?.join(',')}`
  const query = useQuery({ queryKey: ['initialPathway', scope, 'moduleAssessmentEntry', moduleId, revision], queryFn: ({ signal }) => readRulePathway(null, signal), enabled: Boolean(identity?.organizationId && identity?.accountId), retry: false, gcTime: 0,
    refetchInterval: current => !current.state.error && current.state.data && !current.state.data.archived ? 5000 : false })
  if (query.isPending) return <p className="text-body-sm text-muted-foreground" role="status">{t('initialPathway.loading')}</p>
  if (query.error) return <InitialPathwayFeedback error={query.error} onRetry={() => void query.refetch()} />
  const pathway = query.data
  if (!pathway || pathway.archived) return null
  const step = pathway.steps.find(step => step.state !== 'BYPASSED' && step.options.some(option => option.moduleId === moduleId && option.moduleRevision === revision))
  const option = step?.options.find(option => option.moduleId === moduleId && option.moduleRevision === revision)
  if (!step || !option) return null
  if (!option.completedAt) return <Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('initialPathway.refresh')}</Button>
  return <ReaderModuleAssessment pathway={pathway} step={step} option={option} />
}

function ReaderModuleAssessment({ pathway, step, option }: { pathway: RulePathway; step: RuleStep; option: RuleModuleOption }) {
  const { t } = useTranslation()
  const assessmentState = usePathwayAssessmentStates({ ...pathway, steps: [{ ...step, options: [option] }] }, false)
  return <div className="space-y-2"><Badge variant={step.state === 'FULFILLED' ? 'success' : 'warning'}>{t('rulePathway.official')}: {t('rulePathway.state.' + step.state)}</Badge><AssessmentStatus state={assessmentState(step, option)} /><SkillAssessmentEntry pathway={pathway} step={step} option={option} /></div>
}
