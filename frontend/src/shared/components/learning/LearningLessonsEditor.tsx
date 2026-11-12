import { newLesson } from '../../lib/learningLessons'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PanelLeftClose, PanelLeftOpen, FileText, PlayCircle, Plus } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '../ui/Dialog'
import { FormField } from '../ui/FormField'
import {
  moduleRequest,
  uploadLearningFile,
  type LearningAsset,
  type LearningLesson,
} from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
const RichLessonEditor = lazy(() =>
  import('./RichLessonEditor').then((module) => ({
    default: module.RichLessonEditor,
  })),
)
import { LessonVideo } from './LessonVideo'
import { LessonBody } from './LessonBody'
import { LearningPreviewReader } from './LearningContentPreview'
import '../../styles/learningAuthoring.css'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs'
export function LearningLessonsEditor({
  lessons,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  lessons: LearningLesson[]
  onChange: (value: LearningLesson[]) => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [tab, setTab] = useState('edit')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fullPreview, setFullPreview] = useState(false)
  const [mobile, setMobile] = useState(false)
  const activeLesson = lessons.find(lesson => lesson.id === selectedId) ?? lessons[0]
  const selectLesson = (id: string) => setSelectedId(id)
  const addLesson = (type: 'TEXT' | 'VIDEO') => {
    const lesson = newLesson(type)
    onChange([...lessons, lesson]); setSelectedId(lesson.id); setTab('edit')
  }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [played, setPlayed] = useState<Record<string, number>>({})
  const [verified, setVerified] = useState<Record<string, string>>({})
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  const update = (id: string, change: Partial<LearningLesson>) =>
    onChange(lessons.map((l) => (l.id === id ? { ...l, ...change } : l)))
  const changeVideo = (id: string, change: Partial<LearningLesson>) => {
    setPlayed((old) => ({ ...old, [id]: 0 }))
    setVerified((old) => ({ ...old, [id]: '' }))
    update(id, change)
  }
  const move = (index: number, offset: number) => {
    const next = [...lessons]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    onChange(next)
  }
  return (
    <div className="learning-authoring-workspace">
      <div className={`learning-authoring-layout ${sidebarOpen ? '' : 'learning-authoring-layout--focused'}`}>
        {sidebarOpen && <aside className="learning-authoring-sidebar" aria-label={vi ? 'Danh sách bài đang soạn' : 'Authoring lessons'}>
          <div className="flex items-center justify-between gap-2 px-3 py-2"><strong className="text-body font-semibold text-foreground">{vi ? 'Bài học' : 'Lessons'}</strong><Button type="button" variant="ghost" size="sm" aria-expanded={true} aria-controls="authoring-lesson-list" aria-label={vi ? 'Thu gọn danh sách bài' : 'Collapse lesson list'} onClick={() => setSidebarOpen(false)}><PanelLeftClose size={16} aria-hidden="true" /></Button></div>
          <nav id="authoring-lesson-list" className="space-y-1 p-2" aria-label={vi ? 'Chọn bài để soạn' : 'Select lesson to edit'}>
            {lessons.map((item, position) => <Button type="button" key={item.id} disabled={disabled || busy} aria-current={item.id === activeLesson?.id ? 'step' : undefined} variant={item.id === activeLesson?.id ? 'secondary' : 'ghost'} className="h-auto min-h-14 w-full items-start justify-start gap-2 whitespace-normal text-left" onClick={() => selectLesson(item.id)}>
              {item.type === 'TEXT' ? <FileText size={16} className="mt-1 shrink-0" aria-hidden="true" /> : <PlayCircle size={16} className="mt-1 shrink-0" aria-hidden="true" />}<span className="min-w-0 break-words"><span className="block">{position + 1}. {item.title || (vi ? 'Chưa có tiêu đề' : 'Untitled')}</span><span className="mt-1 block text-caption text-muted-foreground">{item.type === 'TEXT' ? (vi ? 'Bài đọc' : 'Reading') : 'Video'}</span></span>
            </Button>)}
          </nav>
          <div className="space-y-2 border-t border-border p-3"><Button type="button" variant="ghost" className="w-full justify-start" disabled={disabled || busy} onClick={() => addLesson('TEXT')}><Plus size={16} aria-hidden="true" />{vi ? 'Thêm bài Text' : 'Add Text lesson'}</Button><Button type="button" variant="ghost" className="w-full justify-start" disabled={disabled || busy} onClick={() => addLesson('VIDEO')}><Plus size={16} aria-hidden="true" />{vi ? 'Thêm bài Video' : 'Add Video lesson'}</Button></div>
        </aside>}
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            {!sidebarOpen && <Button type="button" variant="ghost" size="sm" aria-expanded={false} aria-controls="authoring-lesson-list" onClick={() => setSidebarOpen(true)}><PanelLeftOpen size={16} aria-hidden="true" />{vi ? 'Hiện danh sách bài' : 'Show lesson list'}</Button>}
            <TabsList aria-label={vi ? 'Soạn và xem trước' : 'Authoring views'} className="h-auto min-h-10 w-auto flex-wrap">
              <TabsTrigger value="edit" disabled={busy}>{vi ? 'Soạn nội dung' : 'Edit content'}</TabsTrigger>
              <TabsTrigger value="learner" disabled={busy}>{vi ? 'Xem như học viên' : 'View as learner'}</TabsTrigger>
            </TabsList>
            <Button type="button" variant="outline" size="sm" disabled={busy || !activeLesson} onClick={() => setFullPreview(true)}>{vi ? 'Mở xem toàn màn hình' : 'Open full preview'}</Button>
          </div>
          <TabsContent value="learner" className="p-4"><p className="mb-3 text-caption text-muted-foreground">{vi ? 'Bản đang soạn · Xem thử, không ghi tiến độ học' : 'Current draft · Preview, no learning progress is saved'}</p><LearningPreviewReader lessons={lessons} selected={activeLesson?.id ?? null} onSelect={selectLesson} mobile={mobile} onMobileChange={setMobile} showSyllabus={false} /></TabsContent>
          <TabsContent value="edit">
            <div className="space-y-4 p-4 sm:p-6">
              {!activeLesson && <p role="status" className="text-body-sm text-muted-foreground">{vi ? 'Thêm một bài đọc hoặc video để bắt đầu.' : 'Add a Reading or Video lesson to start.'}</p>}
      {activeLesson && [activeLesson].map(lesson => {
        const index = lessons.findIndex(item => item.id === lesson.id)
        return <section key={lesson.id} className="space-y-4" aria-label={vi ? 'Bài đang soạn' : 'Current lesson editor'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>
                {index + 1}. {lesson.type === 'TEXT' ? (vi ? 'Bài đọc' : 'Reading') : 'Video'}
              </strong>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || index === 0 || busy}
                  aria-label={vi ? 'Đưa bài lên' : 'Move lesson up'}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled || index === lessons.length - 1 || busy}
                  aria-label={vi ? 'Đưa bài xuống' : 'Move lesson down'}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={disabled || busy}
                  onClick={() =>
                    onChange(lessons.filter((l) => l.id !== lesson.id))
                  }
                >
                  {vi ? 'Xóa bài' : 'Remove lesson'}
                </Button>
              </div>
            </div>
            <div className={lesson.type === 'TEXT' ? 'grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]' : ''}>
            <FormField label={vi ? 'Tiêu đề bài học' : 'Lesson title'}>
              <Input
                maxLength={240}
                value={lesson.title}
                onChange={(e) => update(lesson.id, { title: e.target.value })}
              />
            </FormField>
              {lesson.type === 'TEXT' && (
                <FormField
                  label={
                    vi
                      ? 'Thời gian đọc (phút, bỏ trống để ước tính)'
                      : 'Reading minutes (leave blank to estimate)'
                  }
                >
                  <Input
                    type="number"
                    step="any"
                    min={0.001}
                    value={
                      lesson.durationSource === 'MANUAL'
                        ? lesson.durationSeconds / 60
                        : ''
                    }
                    onChange={(e) =>
                      update(lesson.id, {
                        durationSeconds: Number(e.target.value) * 60,
                        durationSource: e.target.value ? 'MANUAL' : 'ESTIMATED',
                      })
                    }
                  />
                </FormField>
              )}
            </div>
            {lesson.type === 'TEXT' ? (
              <>
                {lesson.bodyFormat === 'HTML' ? (
                  <Suspense
                    fallback={
                      <div
                        role="status"
                        className="h-64 animate-pulse rounded bg-muted"
                      >
                        {vi ? 'Đang mở trình soạn thảo…' : 'Loading editor…'}
                      </div>
                    }
                  >
                    <RichLessonEditor
                      onBusyChange={setBusy}
                      disabled={disabled || busy}
                      html={lesson.body ?? ''}
                      onChange={(body) => update(lesson.id, { body })}
                    />
                  </Suspense>
                ) : (
                  <>
                    <LessonBody body={lesson.body ?? ''} format="MARKDOWN" />
                    <Button
                      disabled={disabled || busy}
                      onClick={() => {
                        setBusy(true)
                        void moduleRequest<{ html: string }>(
                          '/text/preview',
                          'POST',
                          { body: lesson.body, format: 'MARKDOWN' },
                        )
                          .then((r) =>
                            update(lesson.id, {
                              body: r.html,
                              bodyFormat: 'HTML',
                            }),
                          )
                          .catch((e: unknown) =>
                            setError(
                              e instanceof Error
                                ? e.message
                                : 'Cannot open editor',
                            ),
                          )
                          .finally(() => setBusy(false))
                      }}
                    >
                      {vi ? 'Mở trình soạn thảo' : 'Open editor'}
                    </Button>
                  </>
                )}

              </>
            ) : (
              <>
                <FormField label={vi ? 'Nguồn video' : 'Video source'}>
                  <select
                    className="h-10 rounded border border-border bg-card px-3"
                    value={lesson.videoSource ?? 'UPLOAD'}
                    onChange={(e) =>
                      changeVideo(lesson.id, {
                        videoSource: e.target
                          .value as LearningLesson['videoSource'],
                        assetId: null,
                        videoUrl: null,
                        durationSeconds: 0,
                        durationSource: 'MANUAL',
                      })
                    }
                  >
                    <option value="UPLOAD">MP4</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="VIMEO">Vimeo</option>
                  </select>
                </FormField>
                {lesson.videoSource === 'UPLOAD' ? (
                  <>
                    <FormField
                      label={vi ? 'Tải video MP4' : 'Upload MP4 video'}
                    >
                      <Input
                        type="file"
                        accept="video/mp4,.mp4"
                        disabled={disabled || busy}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          setBusy(true)
                          setError('')
                          void uploadLearningFile<LearningAsset>(
                            '/assets',
                            file,
                          )
                            .then((a) =>
                              update(lesson.id, {
                                assetId: a.id,
                                durationSeconds: a.durationSeconds ?? 0,
                                durationSource: 'MEDIA',
                              }),
                            )
                            .catch((e: unknown) =>
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : 'Upload failed',
                              ),
                            )
                            .finally(() => setBusy(false))
                          event.target.value = ''
                        }}
                      />
                    </FormField>
                    {lesson.assetId && (
                      <p className="text-sm text-success">
                        {vi ? 'Đã tải video' : 'Video uploaded'} ·{' '}
                        {Math.ceil(lesson.durationSeconds / 60)} min
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <FormField
                      label={vi ? 'Liên kết video HTTPS' : 'HTTPS video link'}
                    >
                      <Input
                        type="url"
                        value={lesson.videoUrl ?? ''}
                        onChange={(e) =>
                          changeVideo(lesson.id, { videoUrl: e.target.value })
                        }
                      />
                    </FormField>
                    <FormField
                      label={
                        lesson.durationSource === 'MEDIA'
                          ? vi
                            ? 'Thời lượng video (giây)'
                            : 'Video duration (seconds)'
                          : vi
                            ? 'Thời lượng dự phòng (giây)'
                            : 'Fallback duration (seconds)'
                      }
                    >
                      <Input
                        type="number"
                        step="any"
                        min={0.001}
                        readOnly={lesson.durationSource === 'MEDIA'}
                        value={lesson.durationSeconds || ''}
                        onChange={(e) =>
                          update(lesson.id, {
                            durationSeconds: Number(e.target.value),
                            durationSource: 'MANUAL',
                          })
                        }
                      />
                    </FormField>
                  </>
                )}
                {(lesson.assetId || lesson.videoUrl) && (
                  <>
                    <LessonVideo
                      lesson={lesson}
                      onSample={(s) => {
                        if (
                          s.playing &&
                          s.duration > 0 &&
                          Number.isFinite(s.duration)
                        ) {
                          setPlayed((old) =>
                            old[lesson.id] === s.duration
                              ? old
                              : { ...old, [lesson.id]: s.duration },
                          )
                        }
                      }}
                    />
                    {lesson.videoSource !== 'UPLOAD' && (
                      <Button
                        variant="outline"
                        disabled={disabled || busy || !played[lesson.id]}
                        onClick={() => {
                          setBusy(true)
                          setError('')
                          void moduleRequest('/videos/verify', 'POST', {
                            provider: lesson.videoSource,
                            url: lesson.videoUrl,
                            durationSeconds: played[lesson.id],
                            played: true,
                          })
                            .then(() => {
                              update(lesson.id, {
                                durationSeconds: played[lesson.id],
                                durationSource: 'MEDIA',
                              })
                              setVerified((old) => ({
                                ...old,
                                [lesson.id]: lesson.videoUrl ?? '',
                              }))
                            })
                            .catch((e: unknown) =>
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : 'Verification failed',
                              ),
                            )
                            .finally(() => setBusy(false))
                        }}
                      >
                        {verified[lesson.id] === lesson.videoUrl
                          ? vi
                            ? 'Đã kiểm tra video'
                            : 'Video verified'
                          : vi
                            ? 'Xác nhận video phát được'
                            : 'Verify playback'}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPreview(preview === lesson.id ? null : lesson.id)
              }
            >
              {vi ? 'Xem trước bài học' : 'Preview lesson'}
            </Button>
            {preview === lesson.id && lesson.type === 'TEXT' && lesson.body && (
              <div className="learner-reader"><div className="learner-reading-body"><LessonBody
                presentation="document"
                body={lesson.body}
                format={lesson.bodyFormat ?? 'HTML'}
              /></div></div>
            )}
        </section>
      })}
      {busy && <p role="status">{vi ? 'Đang xử lý…' : 'Processing…'}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
      </TabsContent>
    </Tabs>
      </div>
      <Dialog open={fullPreview} onOpenChange={setFullPreview} size="wide" className="h-[94dvh] max-h-[94dvh] max-w-[96vw]" ariaLabel={vi ? 'Xem như học viên' : 'View as learner'}>
        <DialogHeader><DialogTitle>{vi ? 'Xem như học viên · Bản đang soạn' : 'View as learner · Current draft'}</DialogTitle></DialogHeader>
        <DialogBody><LearningPreviewReader lessons={lessons} selected={activeLesson?.id ?? null} onSelect={selectLesson} mobile={mobile} onMobileChange={setMobile} /></DialogBody>
      </Dialog>
    </div>
  )
}
