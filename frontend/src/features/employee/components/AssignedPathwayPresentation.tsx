import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  assignedModuleProgress,
  type AssignedModule,
  type AssignedPathway,
} from '../modules/useAssignedLearningPathways'
import { Button } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Progress } from '../../../shared/components/ui/Progress'
import { Input } from '../../../shared/components/ui/Input'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import './InteractiveRoleRoadmap.css'

function status(item: AssignedModule, vi: boolean) {
  const p = item.view && assignedModuleProgress(item.view)
  return p && p.total > 0 && p.completed === p.total
    ? {
        text: vi ? 'Đã học hết nội dung' : 'Content completed',
        variant: 'success' as const,
        done: true,
      }
    : p?.started
      ? {
          text: vi ? 'Đang học' : 'In progress',
          variant: 'warning' as const,
          done: false,
        }
      : {
          text: vi ? 'Chưa bắt đầu' : 'Not started',
          variant: 'outline' as const,
          done: false,
        }
}
function LearnLink({ item }: { item: AssignedModule }) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  return (
    <Link
      to={`/employee/modules/${encodeURIComponent(item.id)}`}
      state={{ returnTo: '/employee/pathway?view=assigned' }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md font-semibold text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      {vi ? 'Mở bài học trong module' : 'Open module lessons'}
      <ChevronRight size={16} aria-hidden="true" />
    </Link>
  )
}
function ModuleProgress({ item }: { item: AssignedModule }) {
  const { language } = useTranslation()
  if (!item.view) return null
  const p = assignedModuleProgress(item.view)
  return (
    <Progress
      value={p.percent}
      showLabel
      label={`${p.completed}/${p.total} ${language === 'vi' ? 'bài học hoàn thành' : 'lessons completed'}`}
    />
  )
}

export function AssignedPathwayPresentation({
  items,
  mode,
  retry,
}: {
  items: AssignedPathway[]
  mode: 'roadmap' | 'timeline'
  retry: () => void
}) {
  const { language } = useTranslation()
  const vi = language === 'vi'
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<AssignedModule | null>(null)
  const [skill, setSkill] = useState<{
    name: string
    moduleTitle: string
    focus: string
    difficulty: string
  } | null>(null)
  function skillNodes(item: AssignedModule, side: 'left' | 'right') {
    return item.view?.revision.payload.teachings
      .filter((_, i, teachings) =>
        side === 'left'
          ? i < Math.ceil(teachings.length / 2)
          : i >= Math.ceil(teachings.length / 2),
      )
      .map((teaching) => (
        <div key={teaching.skillId} className="relative w-full max-w-64">
          <Button
            variant="ghost"
            aria-label={teaching.skillName}
            onClick={() =>
              setSkill({
                name: teaching.skillName,
                moduleTitle: item.view!.revision.payload.title,
                focus: teaching.teachingFocus,
                difficulty: teaching.difficultyLevel,
              })
            }
            className={`roadmap-skill-box is-not-achieved h-auto w-full whitespace-normal text-left ${search && !teaching.skillName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ? 'opacity-30' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded bg-primary/15 px-1 py-0.5 font-mono text-[length:var(--text-eyebrow)] text-primary">
                {teaching.teachingFocus === 'PRIMARY'
                  ? vi
                    ? 'Chính'
                    : 'Primary'
                  : teaching.teachingFocus === 'SUPPORTING'
                    ? vi
                      ? 'Hỗ trợ'
                      : 'Supporting'
                    : vi
                      ? 'Bổ sung'
                      : 'Incidental'}
              </span>
              <span className="min-w-0 break-words">{teaching.skillName}</span>
            </span>
          </Button>
          <div
            aria-hidden="true"
            className={`absolute top-1/2 h-0.5 w-8 bg-primary/35 ${side === 'left' ? '-right-8' : '-left-8'}`}
          />
        </div>
      ))
  }
  return (
    <>
      {items.map(({ pathway, modules }) => (
        <section
          key={pathway.id}
          aria-label={pathway.title}
          className="min-w-0 space-y-4"
        >
          {mode === 'roadmap' ? (
            <>
              <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs lg:flex-row lg:items-center">
                <span className="text-body-sm font-semibold text-foreground">
                  {modules.filter((item) => status(item, vi).done).length} /{' '}
                  {modules.length}{' '}
                  {vi
                    ? 'module đã học hết nội dung'
                    : 'modules with content completed'}
                </span>
                <div className="relative w-full sm:w-60">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-3 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label={vi ? 'Tìm kỹ năng' : 'Search micro-skills'}
                    placeholder={vi ? 'Tìm kỹ năng…' : 'Search micro-skills…'}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div
                className="roadmap-container real-assigned-roadmap"
                data-testid="original-roadmap"
              >
                <div className="roadmap-canvas">
                  <div className="roadmap-target-role-node">
                    <div className="mb-1 flex items-center justify-center gap-2 text-eyebrow font-bold uppercase tracking-widest text-primary">
                      <Sparkles size={18} aria-hidden="true" />
                      {vi ? 'Lộ trình học' : 'Learning pathway'}
                    </div>
                    <Heading
                      level={1}
                      size="page"
                      className="max-w-lg break-words"
                    >
                      {pathway.title}
                    </Heading>
                  </div>
                  <div aria-hidden="true" className="h-12 w-0.5 bg-primary" />
                  <ol className="w-full">
                    {modules.map((item, index) => (
                      <li
                        key={item.id}
                        className="flex w-full flex-col items-center"
                      >
                        <div className="flex w-full items-center justify-center py-5">
                          <div className="flex min-w-0 max-w-[340px] flex-1 flex-col items-end gap-2.5 pr-8">
                            {skillNodes(item, 'left')}
                          </div>
                          <div className="flex w-80 shrink-0 flex-col items-center justify-center px-2">
                            <Button
                              variant="primary"
                              disabled={!item.view}
                              onClick={() => setDetail(item)}
                              className="roadmap-module-box h-auto w-full whitespace-normal"
                            >
                              <span className="block min-w-0 text-primary-foreground">
                                <span className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-primary-foreground/25 pb-2 text-[length:var(--text-caption)]">
                                  <span className="max-w-full break-all font-mono">
                                    {item.id}
                                  </span>
                                  <Badge variant={status(item, vi).variant}>
                                    {status(item, vi).text}
                                  </Badge>
                                </span>
                                <span className="block break-words text-card font-bold">
                                  {item.view?.revision.payload.title ??
                                    (vi
                                      ? 'Module chưa sẵn sàng'
                                      : 'Module unavailable')}
                                </span>
                              </span>
                            </Button>
                          </div>
                          <div className="flex min-w-0 max-w-[340px] flex-1 flex-col items-start gap-2.5 pl-8">
                            {skillNodes(item, 'right')}
                          </div>
                        </div>
                        {item.error && (
                          <div
                            role="alert"
                            className="space-y-2 px-4 text-body-sm text-destructive"
                          >
                            <p>{item.error}</p>
                            <Button variant="outline" onClick={retry}>
                              {vi ? 'Thử lại' : 'Retry'}
                            </Button>
                          </div>
                        )}
                        {index < modules.length - 1 && (
                          <div
                            aria-hidden="true"
                            className="roadmap-spine-segment is-active h-12"
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          ) : (
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
              data-testid="original-timeline"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-border bg-muted/15 p-5 sm:p-6 md:flex-row md:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className="shrink-0 text-primary"
                      size={20}
                      aria-hidden="true"
                    />
                    <Heading
                      level={1}
                      size="subsection"
                      className="break-words"
                    >
                      {pathway.title}
                    </Heading>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {vi
                      ? 'Lộ trình đã được Expert xác nhận · Tiến độ nội dung thực tế'
                      : 'Expert-confirmed pathway · Actual content progress'}
                  </p>
                </div>
              </div>
              <div className="p-5 sm:p-7">
                <ol className="relative space-y-6">
                  <div
                    aria-hidden="true"
                    className="absolute bottom-8 left-[19px] top-6 w-0.5 -translate-x-1/2 bg-border sm:left-[21px]"
                  />
                  {modules.map((item, index) => (
                    <li
                      key={item.id}
                      className="relative flex items-start gap-3.5 sm:gap-5"
                    >
                      <div
                        aria-hidden="true"
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 sm:h-11 sm:w-11 ${status(item, vi).done ? 'border-success bg-success text-success-foreground shadow-2xs' : item.view && assignedModuleProgress(item.view).started ? 'border-primary bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/20' : 'border-border bg-muted text-foreground'}`}
                      >
                        {status(item, vi).done ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div
                        className={`min-w-0 flex-1 space-y-3 rounded-xl border p-4 sm:p-5 ${status(item, vi).done ? 'border-border bg-card shadow-2xs' : item.view && assignedModuleProgress(item.view).started ? 'border-primary/50 bg-secondary/35 shadow-xs ring-1 ring-primary/25' : 'border-border bg-muted/20'}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className="max-w-full whitespace-normal break-all font-mono"
                          >
                            {item.id}
                          </Badge>
                          <Badge variant={status(item, vi).variant}>
                            {status(item, vi).text}
                          </Badge>
                        </div>
                        <Heading level={2} size="card" className="break-words">
                          {item.view?.revision.payload.title ??
                            (vi
                              ? 'Module chưa sẵn sàng'
                              : 'Module unavailable')}
                        </Heading>
                        {item.view ? (
                          <>
                            <span className="flex items-center gap-1 text-caption text-muted-foreground">
                              <Clock size={13} aria-hidden="true" />
                              {Math.ceil(
                                item.view.revision.payload.duration,
                              )}{' '}
                              {vi ? 'phút học' : 'min study'}
                            </span>
                            <ModuleProgress item={item} />
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-2">
                              <div className="flex flex-wrap gap-1.5">
                                {item.view.revision.payload.teachings.map(
                                  (t) => (
                                    <Badge
                                      variant="outline"
                                      key={t.skillId}
                                      className="max-w-full whitespace-normal break-words"
                                    >
                                      {t.skillName}
                                    </Badge>
                                  ),
                                )}
                              </div>
                              <LearnLink item={item} />
                            </div>
                          </>
                        ) : (
                          <div role="alert">
                            <p className="text-destructive">{item.error}</p>
                            <Button variant="outline" onClick={retry}>
                              {vi ? 'Thử lại' : 'Retry'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      ))}
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
        ariaLabel={vi ? 'Chi tiết module' : 'Module details'}
        className="max-w-2xl overflow-hidden p-0"
      >
        {detail?.view && (
          <>
            <div className="space-y-3 border-b border-border bg-gradient-to-br from-secondary/50 via-card to-card p-6 pr-14">
              <Badge variant={status(detail, vi).variant}>
                {status(detail, vi).text}
              </Badge>
              <DialogHeader>
                <DialogTitle>{detail.view.revision.payload.title}</DialogTitle>
              </DialogHeader>
              <p className="break-all text-caption text-muted-foreground">
                {detail.id}
              </p>
            </div>
            <div className="space-y-5 p-6 sm:p-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3.5 rounded-xl border border-border bg-muted/20 p-3.5">
                  <Clock
                    size={18}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-caption text-muted-foreground">
                      {vi ? 'Thời lượng dự kiến' : 'Estimated duration'}
                    </p>
                    <p className="font-semibold">
                      {Math.ceil(detail.view.revision.payload.duration)}{' '}
                      {vi ? 'phút' : 'min'}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                  <ModuleProgress item={detail} />
                </div>
              </div>
              <Heading level={2} size="card">
                {vi ? 'Kỹ năng được dạy' : 'Micro-skills taught'}
              </Heading>
              <div className="space-y-2">
                {detail.view.revision.payload.teachings.map((teaching) => (
                  <Button
                    key={teaching.skillId}
                    variant="outline"
                    className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                    onClick={() => {
                      setDetail(null)
                      setSkill({
                        name: teaching.skillName,
                        moduleTitle: detail.view!.revision.payload.title,
                        focus: teaching.teachingFocus,
                        difficulty: teaching.difficultyLevel,
                      })
                    }}
                  >
                    <BookOpen
                      size={16}
                      className="mr-2 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="break-words">{teaching.skillName}</span>
                  </Button>
                ))}
              </div>
              <Heading level={2} size="card">
                {vi ? 'Bài học trong module' : 'Module lessons'}
              </Heading>
              <ol className="space-y-2">
                {detail.view.revision.payload.content.lessons?.map(
                  (lesson, i) => (
                    <li key={lesson.id} className="flex gap-2 text-body-sm">
                      <BookOpen
                        size={16}
                        className="mt-1 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>
                        {i + 1}. {lesson.title} ·{' '}
                        {lesson.type === 'TEXT'
                          ? vi
                            ? 'Bài đọc'
                            : 'Reading'
                          : 'Video'}
                      </span>
                    </li>
                  ),
                )}
              </ol>
              <LearnLink item={detail} />
            </div>
          </>
        )}
      </Dialog>
      <Dialog
        open={Boolean(skill)}
        onOpenChange={(open) => {
          if (!open) setSkill(null)
        }}
        ariaLabel={vi ? 'Chi tiết kỹ năng' : 'Skill details'}
        className="max-w-2xl overflow-hidden p-0"
      >
        {skill && (
          <>
            <div className="space-y-3 border-b border-border bg-gradient-to-br from-secondary/50 via-card to-card p-6 pr-14">
              <Sparkles size={24} className="text-primary" aria-hidden="true" />
              <DialogHeader>
                <DialogTitle>{skill.name}</DialogTitle>
              </DialogHeader>
            </div>
            <div className="space-y-4 p-6 sm:p-7">
              <p className="text-body-sm">
                {vi ? 'Được dạy trong' : 'Taught in'}: {skill.moduleTitle}
              </p>
              <dl className="grid grid-cols-1 gap-3 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-muted-foreground">
                    {vi ? 'Mức độ bao phủ' : 'Teaching focus'}
                  </dt>
                  <dd>
                    {
                      (
                        {
                          PRIMARY: vi ? 'Chính' : 'Primary',
                          SUPPORTING: vi ? 'Hỗ trợ' : 'Supporting',
                          INCIDENTAL: vi ? 'Bổ sung' : 'Incidental',
                        } as Record<string, string>
                      )[skill.focus]
                    }
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted-foreground">
                    {vi ? 'Độ khó' : 'Difficulty'}
                  </dt>
                  <dd>
                    {
                      (
                        {
                          LOW: vi ? 'Thấp' : 'Low',
                          MEDIUM: vi ? 'Trung bình' : 'Medium',
                          HIGH: vi ? 'Cao' : 'High',
                        } as Record<string, string>
                      )[skill.difficulty]
                    }
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </Dialog>
    </>
  )
}
