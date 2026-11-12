import { ArrowLeft, BookOpen, Clock3, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Button } from '../../../shared/components/ui/Button'
import { Progress } from '../../../shared/components/ui/Progress'

export function LearningReaderHeader({ title, completed, total, remainingSeconds, sidebarOpen, busy, saving, vi, onToggle, onExit }:
  { title: string; completed: number; total: number; remainingSeconds: number; sidebarOpen: boolean; busy: boolean; saving: boolean; vi: boolean; onToggle: () => void; onExit: (event: MouseEvent<HTMLAnchorElement>, destination: string) => void }) {
  const percent = total ? Math.round(completed / total * 100) : 0
  return <header className="learning-module-bar border-b border-border bg-card px-4 py-3 lg:px-6">
    <Link aria-disabled={busy} to="/employee/pathway" onClick={event => onExit(event, '/employee/pathway')} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md text-body-sm text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><ArrowLeft size={16} aria-hidden="true" />{vi ? 'Về lộ trình' : 'Back to Pathway'}</Link>
    <PageHeader title={title} className="learning-module-title min-w-0 flex-1 border-0 pb-0 [&_h1]:text-card [&_h1]:break-words" />
    <div className="learning-module-progress flex items-center gap-3 text-caption text-muted-foreground">
      <span className="inline-flex shrink-0 items-center gap-1.5"><BookOpen size={14} aria-hidden="true" />{completed}/{total} {vi ? 'bài hoàn thành' : 'lessons completed'}</span>
      <Progress value={percent} variant="success" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 w-24" aria-label={vi ? 'Tiến độ nội dung module' : 'Module content progress'} />
      <span className="tabular-nums">{percent}%</span>
      <span className="sr-only"><Clock3 size={14} aria-hidden="true" />{total ? `${Math.ceil(remainingSeconds / 60)} ${vi ? 'phút còn lại' : 'min remaining'}` : (vi ? 'Chưa có thời lượng' : 'Duration unavailable')}</span>
      {saving && <span role="status">{vi ? 'Đang lưu tiến độ…' : 'Saving progress…'}</span>}
    </div>
    <Button variant="ghost" size="sm" aria-expanded={sidebarOpen} aria-controls="learning-syllabus" onClick={onToggle} title={sidebarOpen ? (vi ? 'Tập trung đọc' : 'Focus mode') : (vi ? 'Hiện danh sách bài' : 'Show lessons')}>
      {sidebarOpen ? <PanelLeftClose size={16} aria-hidden="true" /> : <PanelLeftOpen size={16} aria-hidden="true" />}
      {sidebarOpen ? (vi ? 'Ẩn danh sách bài' : 'Hide lessons') : (vi ? 'Hiện danh sách bài' : 'Show lessons')}
    </Button>
  </header>
}
