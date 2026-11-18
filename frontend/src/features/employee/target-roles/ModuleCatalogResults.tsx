import { ArrowRight, BookOpen, LockKeyhole } from 'lucide-react'
import type { SkillModuleSearchItem } from '../../../shared/api/skillLearningApi'
import type { KnowledgeLevel } from '../../../shared/api/requirementPathway'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Heading } from '../../../shared/components/typography/Heading'
import './moduleCatalog.css'

export function ModuleCatalogResults({ items, view, vi, busy, labels, reasons, onOpen, onViewSkill }: {
  items: SkillModuleSearchItem[]; view: 'list' | 'grid'; vi: boolean; busy: string
  labels: Record<KnowledgeLevel, string>; reasons: Record<string, string>
  onViewSkill?: (item: SkillModuleSearchItem) => void
  onOpen: (item: SkillModuleSearchItem) => void
}) {
  const columns = [vi ? 'Module' : 'Module', vi ? 'Kỹ năng' : 'Skill', vi ? 'Mức kiến thức' : 'Knowledge level', vi ? 'Tiến độ học' : 'Learning progress', vi ? 'Thao tác' : 'Actions']
  return <div className="learning-catalog">
    <div className={view === 'list' ? 'catalog-table' : 'catalog-grid'} role={view === 'list' ? 'table' : undefined} aria-label={vi ? 'Danh sách module' : 'Learning modules'}>
      {view === 'list' && <div className="catalog-columns" role="row">{columns.map(column => <span key={column} role="columnheader">{column}</span>)}</div>}
      {items.map(item => {
        const m = item.module
        const blocked = Boolean(m.unavailableReason) || !m.knowledgeLevel || !m.skillVersion
        const reason = m.unavailableReason ? reasons[m.unavailableReason] ?? (vi ? 'Module hiện chưa sẵn sàng để học.' : 'This module is currently unavailable for learning.') : blocked ? (vi ? 'Cấu hình kiến thức chưa đầy đủ.' : 'Knowledge configuration is incomplete.') : ''
        const state = blocked ? 'locked' : m.completed ? 'done' : m.started ? 'progress' : 'new'
        const stateLabel = blocked ? (vi ? 'Chưa đủ điều kiện' : 'Unavailable') : m.completed ? (vi ? 'Đã học xong' : 'Content completed') : m.started ? (vi ? 'Đang học' : 'In progress') : (vi ? 'Chưa bắt đầu' : 'Not started')
        const cell = view === 'list' ? 'cell' : undefined
        return <div className={view === 'list' ? 'catalog-row' : 'catalog-card'} role={view === 'list' ? 'row' : undefined} key={m.moduleId}>
          <div className="catalog-title" role={cell}><span className="catalog-book"><BookOpen size={18} aria-hidden="true" /></span><div className="min-w-0"><Heading level={3} size="card" title={m.moduleId}>{m.title}</Heading><p className={onViewSkill ? "mt-1 text-caption" : "catalog-mobile-skill"}>{onViewSkill ? <Button id={`module-skill-${encodeURIComponent(m.moduleId)}`} variant="link" size="sm" className="h-auto whitespace-normal p-0 text-left" onClick={() => onViewSkill(item)}>{item.skillName} · {vi ? 'Xem skill' : 'View skill'}</Button> : item.skillName}</p></div></div>
          <div className="catalog-owner" role={cell}><span className="sr-only">{vi ? 'Thuộc skill: ' : 'Belongs to skill: '}</span>{item.skillName}</div>
          <div className="catalog-level" role={cell}><Badge variant={m.knowledgeLevel ? 'secondary' : 'outline'} className={m.knowledgeLevel ? 'rounded-md border border-primary/20 font-semibold' : 'rounded-md bg-muted/30 font-normal'}>{m.knowledgeLevel ? labels[m.knowledgeLevel] : (vi ? 'Chưa cấu hình level' : 'Level not configured')}</Badge></div>
          <div className="catalog-progress" role={cell}><div className={`catalog-state ${state}`}>{blocked ? <LockKeyhole size={13} aria-hidden="true" /> : <span className="catalog-dot" aria-hidden="true" />}{stateLabel}</div>{reason && <p className="catalog-reason" id={`module-reason-${m.moduleId}`}>{reason}</p>}</div>
          <div className="catalog-action" role={cell}><Button size="sm" variant={state === 'progress' || state === 'done' ? 'primary' : 'outline'} disabled={Boolean(busy) || blocked} aria-describedby={reason ? `module-reason-${m.moduleId}` : undefined} onClick={() => onOpen(item)}>{busy === m.moduleId ? (vi ? 'Đang mở…' : 'Opening…') : blocked ? (vi ? 'Đang khóa' : 'Locked') : m.completed ? (vi ? 'Xem lại' : 'Review module') : m.started ? (vi ? 'Học tiếp' : 'Continue learning') : (vi ? 'Bắt đầu học' : 'Start learning')}{blocked ? <LockKeyhole size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}</Button>
          </div>
        </div>
      })}
    </div>
  </div>
}
