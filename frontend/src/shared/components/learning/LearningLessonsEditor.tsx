import { newLesson } from '../../lib/learningLessons'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent } from '../ui/Card'
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {vi
          ? 'Thêm bài Text hoặc Video, rồi sắp xếp theo thứ tự. Có thể lưu nháp để làm tiếp.'
          : 'Add Text or Video lessons and arrange their order. Save a draft to continue later.'}
      </p>
      {lessons.map((lesson, index) => (
        <Card key={lesson.id}>
          <CardContent className="space-y-3 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>
                {index + 1}. {lesson.type}
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
            <FormField label={vi ? 'Tiêu đề bài học' : 'Lesson title'}>
              <Input
                maxLength={240}
                value={lesson.title}
                onChange={(e) => update(lesson.id, { title: e.target.value })}
              />
            </FormField>
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
              <LessonBody
                body={lesson.body}
                format={lesson.bodyFormat ?? 'HTML'}
              />
            )}
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={disabled || busy}
          onClick={() => onChange([...lessons, newLesson('TEXT')])}
        >
          {vi ? 'Thêm bài Text' : 'Add Text lesson'}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || busy}
          onClick={() => onChange([...lessons, newLesson('VIDEO')])}
        >
          {vi ? 'Thêm bài Video' : 'Add Video lesson'}
        </Button>
      </div>
      {busy && <p role="status">{vi ? 'Đang xử lý…' : 'Processing…'}</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
