import { CheckCircle2, Circle, FileText, PlayCircle } from 'lucide-react'
import type { LearningLesson, LessonProgress } from '../../../shared/api/moduleAuthoringApi'
import { Button } from '../../../shared/components/ui/Button'

export function LearningLessonSidebar({ title, lessons, progress, active, completed, revision, newer, busy, vi, onSelect, onSwitch }:
  { title: string; lessons: LearningLesson[]; progress: LessonProgress[]; active: string; completed: number; revision: number; newer: boolean; busy: boolean; vi: boolean; onSelect: (id: string) => void; onSwitch: () => void }) {
  return <aside id="learning-syllabus" className="w-full shrink-0 border-b border-border bg-card md:w-64 md:border-b-0 md:border-r lg:w-72" aria-label={vi ? 'Danh sách bài học' : 'Module syllabus'}>
    <div className="space-y-2 px-5 pb-3 pt-6">
      <p className="text-eyebrow font-bold uppercase tracking-wide text-muted-foreground">{vi ? 'Nội dung khóa học' : 'Course content'}</p>
      <span className="sr-only">{title}</span>
      <p className="text-caption text-muted-foreground">{completed}/{lessons.length} {vi ? 'bài hoàn thành' : 'lessons completed'}</p>
    </div>
    <nav aria-label={vi ? 'Bài học trong module' : 'Module lessons'} className="max-h-[60vh] space-y-1 overflow-y-auto p-2 md:max-h-none">
      {lessons.map((lesson, index) => {
        const done = progress.some(p => p.lessonId === lesson.id && p.completedAt)
        const selected = active === lesson.id
        const Icon = lesson.type === 'TEXT' ? FileText : PlayCircle
        return <button key={lesson.id} type="button" disabled={busy} aria-current={selected ? 'step' : undefined} onClick={() => onSelect(lesson.id)} className={`flex min-h-14 w-full items-start gap-2.5 relative rounded-lg border-l-2 px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${selected ? 'border-primary bg-secondary text-foreground' : 'border-transparent hover:bg-muted'}`}>
          {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> : <Circle size={18} className={`mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />}
          <span className="min-w-0 flex-1"><span className={`block break-words text-body-sm ${selected ? 'font-semibold' : 'font-medium'}`}>{index + 1}. {lesson.title}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted-foreground"><Icon size={13} aria-hidden="true" />{lesson.type === 'TEXT' ? (vi ? 'Bài đọc' : 'Reading') : 'Video'} · {Math.ceil(lesson.durationSeconds / 60)} {vi ? 'phút' : 'min'}</span>
            <span className="sr-only">{done ? (vi ? 'Đã hoàn thành' : 'Completed') : selected ? (vi ? 'Đang mở' : 'Current lesson') : (vi ? 'Chưa hoàn thành' : 'Not completed')}</span>
          </span>
        </button>
      })}
    </nav>
    <div className="space-y-2 border-t border-border p-4"><p className="text-caption text-muted-foreground">{vi ? 'Phiên bản' : 'Version'} {revision}</p>{newer && <Button variant="outline" disabled={busy} onClick={onSwitch}>{vi ? 'Có phiên bản mới' : 'New version available'}</Button>}</div>
  </aside>
}
