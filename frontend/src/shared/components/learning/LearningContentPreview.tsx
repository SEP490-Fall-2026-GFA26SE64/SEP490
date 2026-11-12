import { useState } from 'react'
import type { LearningLesson } from '../../api/moduleAuthoringApi'
import { useTranslation } from '../../i18n/LanguageContext'
import { Heading } from '../typography/Heading'
import { Button } from '../ui/Button'
import { Dialog, DialogBody, DialogHeader, DialogTitle } from '../ui/Dialog'
import { LessonBody } from './LessonBody'
import { LessonVideo } from './LessonVideo'
import '../../styles/learningReader.css'

/** Read-only draft/snapshot presentation. Never begins learning or writes learner progress. */
export function LearningContentPreview({ lessons, label }: { lessons: LearningLesson[]; label?: string }) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const title = vi ? 'Xem như học viên' : 'View as learner'
  return <section className="min-w-0 space-y-3" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-caption text-muted-foreground">{label ? `${label} · ` : ''}{vi ? 'Xem thử — không ghi tiến độ học' : 'Preview — no learning progress is saved'}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>{vi ? 'Mở xem toàn màn hình' : 'Open full preview'}</Button>
    </div>
    {!expanded && <LearningPreviewReader lessons={lessons} selected={selected} onSelect={setSelected} mobile={mobile} onMobileChange={setMobile} />}
    <Dialog open={expanded} onOpenChange={setExpanded} size="wide" className="h-[94dvh] max-h-[94dvh] w-full max-w-[96vw]" ariaLabel={title}>
      <DialogHeader><DialogTitle>{title}{label ? ` · ${label}` : ''}</DialogTitle></DialogHeader>
      <DialogBody><LearningPreviewReader lessons={lessons} selected={selected} onSelect={setSelected} mobile={mobile} onMobileChange={setMobile} /></DialogBody>
    </Dialog>
  </section>
}

export function LearningPreviewReader({ lessons, selected, onSelect, mobile, onMobileChange, showSyllabus = true }: { lessons: LearningLesson[]; selected: string | null; onSelect: (id: string) => void; mobile: boolean; onMobileChange: (value: boolean) => void; showSyllabus?: boolean }) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const current = lessons.find(lesson => lesson.id === selected) ?? lessons[0]
  const index = current ? lessons.indexOf(current) : -1
  if (!current) return <p role="status" className="p-4 text-body-sm text-muted-foreground">{vi ? 'Chưa có bài học để xem thử.' : 'No lessons to preview.'}</p>
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label={vi ? 'Kích thước xem thử' : 'Preview size'}>
      <Button type="button" size="sm" variant={!mobile ? 'secondary' : 'ghost'} aria-pressed={!mobile} onClick={() => onMobileChange(false)}>Desktop</Button>
      <Button type="button" size="sm" variant={mobile ? 'secondary' : 'ghost'} aria-pressed={mobile} onClick={() => onMobileChange(true)}>Mobile</Button>
    </div>
    <div className={`learner-reader learning-content-preview mx-auto min-w-0 border border-border bg-card text-foreground ${mobile ? 'max-w-[390px]' : 'w-full'}`} data-preview-viewport={mobile ? 'mobile' : 'desktop'}>
      <div className="preview-reader-layout" data-syllabus={showSyllabus}>
        {showSyllabus && <nav className="preview-syllabus min-w-0 border-b border-border p-2" aria-label={vi ? 'Danh sách bài xem thử' : 'Preview lessons'}>
          {lessons.map((lesson, position) => <Button type="button" key={lesson.id} variant={lesson.id === current.id ? 'secondary' : 'ghost'} aria-current={lesson.id === current.id ? 'step' : undefined} className="h-auto min-h-10 w-full justify-start whitespace-normal break-words text-left" onClick={() => onSelect(lesson.id)}>{position + 1}. {lesson.title || (vi ? 'Chưa có tiêu đề' : 'Untitled')}</Button>)}
        </nav>}
        <article key={current.id} className="learning-document-page min-w-0 space-y-5 p-4 sm:p-6" aria-label={current.title || (vi ? 'Bài học xem thử' : 'Preview lesson')}>
          <div className="space-y-2">
            <p className="text-eyebrow font-bold uppercase tracking-wide text-primary">{current.type === 'TEXT' ? (vi ? 'Bài đọc' : 'Reading') : 'Video'} · {current.durationSeconds > 0 ? `${Math.ceil(current.durationSeconds / 60)} ${vi ? 'phút' : 'min'}` : (vi ? 'Chưa có thời lượng' : 'Duration not set')}</p>
            <Heading level={2} size="page" className="break-words">{current.title || (vi ? 'Chưa có tiêu đề' : 'Untitled')}</Heading>
          </div>
          {current.type === 'TEXT' ? current.body?.trim() ? <div className="learner-reading-body"><LessonBody presentation="document" body={current.body} format={current.bodyFormat ?? 'HTML'} /></div> : <p role="status" className="text-muted-foreground">{vi ? 'Bài đọc chưa có nội dung.' : 'This reading lesson has no content yet.'}</p> : <LessonVideo lesson={current} appearance="lesson" />}
          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <Button type="button" size="sm" variant="ghost" disabled={index <= 0} onClick={() => onSelect(lessons[index - 1].id)}>{vi ? 'Bài trước' : 'Previous lesson'}</Button>
            <Button type="button" size="sm" variant="outline" disabled={index >= lessons.length - 1} onClick={() => onSelect(lessons[index + 1].id)}>{vi ? 'Bài tiếp theo' : 'Next lesson'}</Button>
          </div>
        </article>
      </div>
    </div>
  </div>
}
