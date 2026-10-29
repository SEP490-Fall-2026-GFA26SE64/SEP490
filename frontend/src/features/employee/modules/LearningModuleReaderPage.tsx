import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Award,
  Check,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Progress } from '../../../shared/components/ui/Progress'
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
  return <LearningModuleReader key={moduleId} moduleId={moduleId} />
}
function LearningModuleReader({ moduleId }: { moduleId: string }) {
  const { language } = useTranslation()
  const vi = language === 'vi'
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
      const work = request.current
        .catch(() => undefined)
        .then(async () => {
          const result = await moduleRequest<LessonProgress>(
            `/learning/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/progress`,
            'PUT',
            { revision, positionSeconds: 0, ...patch },
          )
          setView((old) =>
            old?.revision.number === revision
              ? {
                  ...old,
                  progress: [
                    ...old.progress.filter((p) => p.lessonId !== lessonId),
                    result,
                  ],
                }
              : old,
          )
        })
      request.current = work
      return work
    },
    [revisionNumber, active, moduleId],
  )
  const enterLesson = useEffectEvent(() => {
    lastSample.current = null
    pending.current = null
    lastSent.current = 0
    videoPosition.current = progress?.positionSeconds ?? 0
    if (!active) return
    void update({ positionSeconds: progress?.positionSeconds ?? 0 }).catch(
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
  const changeLesson = (id: string) => {
    const interval = pending.current
    pending.current = null
    if (current?.type === 'VIDEO')
      void update({
        positionSeconds: videoPosition.current,
        ...(interval
          ? { segmentStart: interval.start, segmentEnd: interval.end }
          : {}),
      }).catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Cannot save progress'),
      )
    setReadEnd(false)
    setBodyReady(false)
    setVideoFailed(false)
    setActive(id)
    setError('')
  }
  const completed = lessons.filter((lesson) =>
    view?.progress.some((p) => p.lessonId === lesson.id && p.completedAt),
  ).length
  const percent = lessons.length
    ? Math.round((completed / lessons.length) * 100)
    : 0
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
    <WorkspaceLayout>
      <div
        className="flex min-h-screen min-w-0 flex-col bg-background text-foreground"
        data-testid="original-lesson-reader"
      >
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5 shadow-2xs sm:px-6">
          <Link
            to="/employee/pathway"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-body-sm font-semibold text-foreground hover:bg-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ChevronLeft
              size={16}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            {vi ? 'Về lộ trình' : 'Back to Pathway'}
          </Link>
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
              <span>
                {completed}/{lessons.length} {vi ? 'hoàn thành' : 'Completed'}
              </span>
              <Progress value={percent} variant="success" className="w-24" />
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled
              title={
                vi
                  ? 'Bài thi module chưa khả dụng'
                  : 'Module exam is not available yet'
              }
              className="gap-1.5 font-bold shadow-xs"
            >
              <Award size={15} aria-hidden="true" />
              {vi ? 'Làm bài thi module' : 'Take Module Exam'}
            </Button>
          </div>
        </header>
        {error && (
          <div
            role="alert"
            className="space-y-2 border-b border-destructive bg-card p-3 text-destructive"
          >
            <p>{error}</p>
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
                <aside
                  className="z-20 flex w-full shrink-0 flex-col border-r border-border bg-card md:w-80 lg:w-84"
                  aria-label={vi ? 'Danh sách bài học' : 'Module syllabus'}
                >
                  <div className="space-y-1.5 border-b border-border bg-muted/20 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="primary"
                        className="max-w-full whitespace-normal break-all font-mono text-[length:var(--text-eyebrow)] font-bold"
                      >
                        {moduleId}
                      </Badge>
                      <span className="text-caption text-muted-foreground">
                        {lessons.length} {vi ? 'bài học' : 'Lessons'}
                      </span>
                    </div>
                    <Heading level={2} size="card" className="break-words">
                      {view.revision.payload.title}
                    </Heading>
                    <p className="text-caption text-muted-foreground">
                      {completed}/{lessons.length} · {percent}%{' '}
                      {percent === 100
                        ? vi
                          ? 'Đã hoàn thành nội dung'
                          : 'Content completed'
                        : ''}
                    </p>
                  </div>
                  <nav
                    aria-label={vi ? 'Bài học trong module' : 'Module lessons'}
                    className="flex-1 divide-y divide-border/60 overflow-y-auto py-2"
                  >
                    {lessons.map((lesson, index) => {
                      const done = view.progress.some(
                        (p) => p.lessonId === lesson.id && p.completedAt,
                      )
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          aria-current={
                            active === lesson.id ? 'step' : undefined
                          }
                          onClick={() => changeLesson(lesson.id)}
                          className={`flex w-full items-start gap-2 border-l-4 px-4 py-5 text-left transition-colors ${active === lesson.id ? 'border-primary bg-secondary font-semibold text-primary' : 'border-transparent text-foreground hover:bg-muted'}`}
                        >
                          {done ? (
                            <CheckCircle2
                              size={18}
                              className="mt-0.5 shrink-0 text-success"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              size={18}
                              className="mt-0.5 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block break-words text-body-sm">
                              {index + 1}. {lesson.title}
                            </span>
                            <span className="mt-1 block text-caption font-normal text-muted-foreground">
                              {lesson.type === 'TEXT'
                                ? vi
                                  ? 'Bài đọc'
                                  : 'Reading'
                                : 'Video'}{' '}
                              · {Math.ceil(lesson.durationSeconds / 60)}{' '}
                              {vi ? 'phút' : 'min'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </nav>
                  <div className="space-y-2 border-t border-border p-4">
                    <p className="text-caption text-muted-foreground">
                      {vi ? 'Phiên bản' : 'Version'} {view.revision.number}
                    </p>
                    {view.latestRevision != null &&
                      view.latestRevision > view.revision.number && (
                        <Button
                          variant="outline"
                          onClick={() => setSwitching(true)}
                        >
                          {vi ? 'Có phiên bản mới' : 'New version available'}
                        </Button>
                      )}
                  </div>
                </aside>
                <div
                  className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background p-4 sm:p-6 lg:p-8"
                  aria-label={vi ? 'Nội dung bài học' : 'Lesson content'}
                  role="region"
                >
                  {current && (
                    <div className="flex flex-1 flex-col justify-between space-y-8 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8 lg:p-12">
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
                            level={1}
                            size="page"
                            className="break-words"
                          >
                            {current.title}
                          </Heading>
                        </div>
                        {current.type === 'TEXT' && (
                          <>
                            <LessonBody
                              body={current.body ?? ''}
                              format={current.bodyFormat ?? 'HTML'}
                              onReady={() => setBodyReady(true)}
                            />
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
                      <div className="mt-auto flex flex-col justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:flex-wrap sm:items-center">
                        <Button
                          variant="outline"
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
                          className={`self-start gap-1.5 text-body-sm font-semibold ${progress?.completedAt ? 'border-success/30 bg-success/15 text-success' : ''}`}
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
                            variant="primary"
                            disabled={busy}
                            onClick={() =>
                              changeLesson(lessons[activeIndex + 1].id)
                            }
                            rightIcon={<ChevronRight size={16} />}
                            className="self-start px-6 font-bold shadow-xs sm:self-auto"
                          >
                            {vi
                              ? 'Chuyển sang bài tiếp theo'
                              : 'Go to next item'}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            disabled
                            title={
                              vi
                                ? 'Bài thi module chưa khả dụng'
                                : 'Module exam is not available yet'
                            }
                            rightIcon={<Award size={16} />}
                            className="self-start px-6 font-bold sm:self-auto"
                          >
                            {vi ? 'Làm bài thi module' : 'Take Module Exam'}
                          </Button>
                        )}
                      </div>
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
                    </div>
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
    </WorkspaceLayout>
  )
}
