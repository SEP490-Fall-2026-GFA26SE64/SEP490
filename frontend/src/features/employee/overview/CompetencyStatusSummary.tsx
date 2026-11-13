import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { OverviewPair, RequirementStatus } from './roleOverviewData'

// Target satisfaction includes the frozen Baseline pass; other diagnostics do not award completion.
const states: {id:string;statuses:RequirementStatus[];color:string;labels:[string,string]}[] = [
  {id:'incomplete',statuses:['failed','waiting','assessment_passed','required','bypassed','review','expert'],color:'var(--muted-foreground)',labels:['Not completed','Chưa hoàn thành']},
  {id:'working',statuses:['learning','assessing'],color:'var(--warning)',labels:['In progress','Đang làm']},
  {id:'completed',statuses:['achieved','baseline'],color:'var(--success)',labels:['Completed','Đã hoàn thành']},
]
export function CompetencyStatusSummary({pairs,available}:{pairs:OverviewPair[];available:boolean}) {
  const {language}=useTranslation(),vi=language==='vi'
  const unknownCount=pairs.filter(pair=>pair.status==='unavailable').length
  const counts=states.map(state=>pairs.filter(pair=>state.statuses.includes(pair.status)).length)
  const groups=states.map((state,index)=>{
    const count=counts[index],amount=available&&pairs.length?count/pairs.length*100:0,start=available&&pairs.length?counts.slice(0,index).reduce((a,b)=>a+b,0)/pairs.length*100:0
    return {...state,count,amount,start}
  })
  return <section className="overview-status-card" aria-labelledby="competency-status-heading">
    <Heading level={3} size="sm" id="competency-status-heading">{vi?'Trạng thái năng lực':'Competency status'}</Heading>
    <div className="overview-status-content">
      <div className="overview-status-ring"><svg viewBox="0 0 100 100" role="img" aria-label={vi?'Phân bố yêu cầu cấp độ':'Knowledge-level requirement distribution'}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--border))" strokeWidth="11" />
        {available&&groups.filter(group=>group.count>0).map(group=><circle key={group.id} cx="50" cy="50" r="40" fill="none" stroke={`hsl(${group.color})`} strokeWidth="11" pathLength="100" strokeDasharray={`${group.amount} ${100-group.amount}`} strokeDashoffset={-group.start} transform="rotate(-90 50 50)" />)}
      </svg><strong>{available?pairs.length:'—'}</strong></div>
      <ul className="overview-status-legend">{groups.map(group=><li key={group.id}><i style={{backgroundColor:`hsl(${group.color})`}} aria-hidden="true" /><span>{group.labels[vi?1:0]}</span><strong>{available?group.count:'—'}</strong></li>)}</ul>
    </div>{available && unknownCount>0 && <Text variant="caption" role="status">{vi?`${unknownCount} cấp độ chưa rõ trạng thái; chưa xếp nhóm.`:`${unknownCount} levels have unknown status; not classified.`}</Text>}
  </section>
}
