import { useState } from 'react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { statusLabels, type OverviewPair, type RequirementStatus } from './roleOverviewData'
const colors: Record<RequirementStatus, string> = { assessment_passed:'text-warning', review:'text-warning', bypassed:'text-muted-foreground', expert:'text-destructive', failed:'text-destructive', assessing:'text-primary', unavailable:'text-border', achieved: 'text-success', waiting: 'text-warning', learning: 'text-primary', baseline: 'text-success', required: 'text-border' }
const statuses = Object.keys(statusLabels) as RequirementStatus[]
export function RequirementStatusRing({ pairs }: { pairs: OverviewPair[] }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const [selected, setSelected] = useState<RequirementStatus | null>(null)
  const counts = statuses.map(status => pairs.filter(p => p.status === status).length)
  return <div className="w-full space-y-4">
    <div className="rounded-xl border border-border bg-background/40 p-4 min-h-[300px] flex flex-col sm:flex-row items-center justify-center gap-6">
      <svg viewBox="0 0 220 220" className="w-56 h-56 shrink-0" role="img" aria-label={vi ? `${pairs.length} yêu cầu kiến thức theo trạng thái` : `${pairs.length} knowledge requirements by status`}>
        <circle cx="110" cy="110" r="80" fill="none" stroke="currentColor" strokeWidth="24" className="text-muted" />
        {statuses.map((status, i) => {
          const size = pairs.length ? counts[i] / pairs.length * 100 : 0
          const start = pairs.length ? counts.slice(0, i).reduce((sum, count) => sum + count, 0) / pairs.length * 100 : 0
          return size > 0 ? <circle key={status} cx="110" cy="110" r="80" pathLength="100" fill="none" stroke="currentColor" strokeWidth="24"
            strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} transform="rotate(-90 110 110)" className={colors[status]}>
            <title>{statusLabels[status][vi ? 1 : 0]}: {counts[i]}</title></circle> : null
        })}
        <text x="110" y="108" textAnchor="middle" className="fill-foreground text-3xl font-bold">{pairs.length}</text>
        <text x="110" y="131" textAnchor="middle" className="fill-muted-foreground text-xs">{vi ? 'yêu cầu kiến thức' : 'requirements'}</text>
      </svg>
      <div className="space-y-2 w-full sm:max-w-64">{statuses.map((status, i) => <button key={status} type="button" aria-pressed={selected === status}
        onClick={() => setSelected(selected === status ? null : status)} className={`flex items-center justify-between gap-3 w-full rounded-lg border p-2.5 text-xs ${selected === status ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-muted'}`}>
        <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full bg-current ${colors[status]}`} />{statusLabels[status][vi ? 1 : 0]}</span><strong>{counts[i]}</strong>
      </button>)}</div>
    </div>
    <p className="text-xs text-muted-foreground">{vi ? 'Đếm từng cặp Skill × mức kiến thức mà Role yêu cầu. Baseline đạt là kết quả chẩn đoán, chưa phải đạt chính thức.' : 'Counts Skill × knowledge-level requirements for this Role. A baseline pass is diagnostic, not official achievement.'}</p>
    {selected && <ul className="max-h-36 overflow-y-auto space-y-1 text-xs text-muted-foreground" aria-live="polite">{pairs.filter(p => p.status === selected).map(p => <li key={p.requirement.skillId + p.requirement.knowledgeLevel}>{p.requirement.skillName} · {p.requirement.knowledgeLevel}</li>)}{!counts[statuses.indexOf(selected)] && <li>{vi ? 'Không có yêu cầu ở trạng thái này.' : 'No requirements with this status.'}</li>}</ul>}
  </div>
}
