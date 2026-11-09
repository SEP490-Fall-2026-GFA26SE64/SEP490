import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Progress } from '../../../shared/components/ui/Progress'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { statusLabels, type OverviewSkill } from './roleOverviewData'

export function OverviewSkillRow({ skill, expanded, toggle }: { skill: OverviewSkill; expanded: boolean; toggle: () => void }) {
  const { language, t } = useTranslation(), vi = language === 'vi'
  const achieved = skill.pairs.filter(p => p.status === 'achieved').length
  return <div className="transition-colors hover:bg-muted/20">
    <button type="button" onClick={toggle} aria-expanded={expanded} className="p-4 flex items-center justify-between gap-4 w-full text-left cursor-pointer">
      <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap">
        {skill.skillCode && <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{skill.skillCode}</span>}
        <span className="font-bold text-sm text-foreground">{skill.name}</span>
        <Badge variant={achieved === skill.pairs.length ? 'success' : 'warning'}>{achieved === skill.pairs.length ? (vi ? 'Đạt chính thức' : 'Officially achieved') : (vi ? 'Chưa hoàn tất' : 'Not yet achieved')}</Badge>
      </div><div className="mt-2.5 flex items-center gap-3"><Progress value={skill.estimatedMastery} variant={achieved === skill.pairs.length ? 'success' : 'warning'} className="h-2 flex-1" /><span className="text-xs text-muted-foreground">{achieved}/{skill.pairs.length} {vi ? 'yêu cầu đạt' : 'requirements achieved'}</span></div></div>
      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {expanded && <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40 space-y-3">{skill.pairs.map(pair => <div key={pair.requirement.knowledgeLevel} className="p-3.5 rounded-xl border border-border/80 bg-card/90 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2"><strong className="text-xs">{t('knowledgeLevel.' + pair.requirement.knowledgeLevel)}</strong><Badge variant={pair.status === 'achieved' ? 'success' : 'outline'}>{statusLabels[pair.status][vi ? 1 : 0]}</Badge></div>
      {pair.step?.state === 'BYPASSED' && <p className="text-xs text-muted-foreground">{vi ? 'Được bỏ qua trong pathway; chưa phải đạt chính thức.' : 'Bypassed in the pathway; not official achievement.'}</p>}
      {pair.step?.options.map(option => <div key={option.moduleId + ':' + option.moduleRevision} className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-2"><BookOpen size={16} className="text-primary" />{option.title}</span><div className="flex items-center gap-2"><Badge variant={option.completedAt ? 'success' : option.startedAt ? 'warning' : 'outline'}>{option.completedAt ? (vi ? 'Đã học xong' : 'Learning completed') : option.startedAt ? (vi ? 'Đang học' : 'In progress') : (vi ? 'Chưa học' : 'Not started')}</Badge><Link to="/employee/pathway?view=role" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover">{vi ? 'Xem trong lộ trình' : 'Go to Pathway'}<ExternalLink size={12} /></Link></div>
      </div>)}
      {pair.step?.certificate && <p className="text-xs text-muted-foreground">{pair.step.certificate.name}</p>}
      {!pair.step && <p className="text-xs text-muted-foreground">{vi ? 'Chưa có bước học tương ứng trong pathway hiện tại.' : 'No corresponding learning step in the current pathway.'}</p>}
    </div>)}</div>}
  </div>
}
