import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Briefcase, Check, CircleHelp, Layers, Lightbulb, TriangleAlert } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { statusLabels } from '../overview/roleOverviewData'
import { KnowledgeMapDetails } from './KnowledgeMapDetails'
import type { JourneyRole } from './knowledgeJourneyApi'
import type { KnowledgeNode } from './knowledgeMap'
import { buildJourney, overviewLayout, skillProgress, levelTone, memberEdge, type GraphPoint } from './masteryJourney'
import type { RulePathway } from '../../../shared/api/requirementPathway'
import './MasteryJourneyGraph.css'

export function MasteryJourneyGraph({ assigned, targets, records, incomplete, unavailable, targetsState, scopeKey, tools, pathway, openSelectionId, linear = false, suppressAutoScroll = false, onAssignedRoleClick }: {
  assigned: JourneyRole | null; targets: JourneyRole[]; records: KnowledgeNode[]; incomplete: boolean; unavailable: boolean; targetsState: 'loading' | 'unavailable' | 'empty' | 'ready'
  onAssignedRoleClick?:()=>void; suppressAutoScroll?: boolean; linear?: boolean; openSelectionId?: string | null; scopeKey: string; tools?: ReactNode; pathway?: RulePathway | null
}) {
  const { t, language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const maskId=useId().replace(/:/g,'')
  const levelRefs=useRef(new Map<string,HTMLButtonElement>()),[levelHeight,setLevelHeight]=useState(180)
  const stage = useRef<HTMLDivElement>(null), roleRefs = useRef(new Map<string, HTMLButtonElement>()), skillRefs = useRef(new Map<string, HTMLButtonElement>())
  const client=useQueryClient()
  // UI navigation only; never cache inferred assignments, outcomes or recognition here.
  const viewKey=useMemo(()=>['knowledge-profile-graph-view',scopeKey],[scopeKey])
  const {data:saved}=useQuery({queryKey:viewKey,queryFn:async()=>({roleId:null as string|null,skillKey:null as string|null,expanded:false}),initialData:{roleId:null as string|null,skillKey:null as string|null,expanded:false},enabled:false,gcTime:Infinity})
  const [width, setWidth] = useState(600), [roleId, setRoleId] = useState<string | null>(linear ? targets[0]?.id ?? null : saved.roleId), [skillKey, setSkillKey] = useState<string | null>(linear?null:saved.skillKey), [detailKey, setDetailKey] = useState<string | null>(null)
  const [roleHeights,setRoleHeights]=useState(new Map<string,number>())
  const [targetsExpanded,setTargetsExpanded]=useState(linear || saved.expanded)
  useEffect(()=>{client.setQueryData(viewKey,{roleId,skillKey,expanded:targetsExpanded})},[client,viewKey,roleId,skillKey,targetsExpanded])
  const openedSelection = useRef<string | null>(null)
  useEffect(()=>{
    if (!openSelectionId || openedSelection.current === openSelectionId || !targets.some(target=>target.id===openSelectionId)) return
    openedSelection.current=openSelectionId
    setTargetsExpanded(true);setRoleId(openSelectionId);setSkillKey(null);setDetailKey(null)
  },[openSelectionId,targets])
  const [hovered,setHovered]=useState<string|null>(null),[focused,setFocused]=useState<string|null>(null)
  const highlighted=hovered??focused
  const interaction=(key:string)=>({onMouseEnter:()=>setHovered(key),onMouseLeave:()=>setHovered(null),onFocus:()=>setFocused(key),onBlur:()=>setFocused(null)})
  const emphasis=(...keys:string[])=>({'data-muted':Boolean(highlighted&&!keys.includes(highlighted)),'data-highlight':Boolean(highlighted&&keys.includes(highlighted))})
  const [focusMetrics,setFocusMetrics]=useState({roleId:'',roleHeight:160,skillHeight:140})
  const returnTimer=useRef<ReturnType<typeof setTimeout> | null>(null)
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return
    setWidth(Math.max(1,el.clientWidth))
    const observer = new ResizeObserver(entries => setWidth(Math.max(1,entries[0].contentRect.width)))
    observer.observe(el); return () => observer.disconnect()
  }, [])
  const visibleTargets = useMemo(()=>targetsExpanded || !assigned ? targets : [],[targetsExpanded,assigned,targets])
  const branches = useMemo(() => buildJourney(assigned,visibleTargets,records,roleId), [assigned,visibleTargets,records,roleId])
  const layout = useMemo(() => overviewLayout(branches,width,roleHeights), [branches,width,roleHeights])
  const roleNeighbors=useMemo(()=>{
    const neighbors=new Map<string,string[]>()
    for(const edge of layout.edges){neighbors.set(edge.from,[...(neighbors.get(edge.from)??[]),'role:'+edge.to]);neighbors.set(edge.to,[...(neighbors.get(edge.to)??[]),'role:'+edge.from])}
    return neighbors
  },[layout])
  const role = branches.find(r => r.id === roleId && r.source==='TARGET'), skill = role?.skills.find(s => s.key === skillKey), detail = skill?.levels.find(l => l.key === detailKey)
  const mode = !role ? 'overview' : skill ? 'skill' : 'role', narrow = width < 580
  useLayoutEffect(()=>{if(linear&&stage.current)stage.current.scrollLeft=0},[linear,mode,skillKey])
  useLayoutEffect(()=>{
    if(!skill)return
    const measure=()=>{let height=180;levelRefs.current.forEach(el=>{height=Math.max(height,el.offsetHeight)});setLevelHeight(height)}
    const observer=new ResizeObserver(measure);levelRefs.current.forEach(el=>observer.observe(el));measure()
    return ()=>observer.disconnect()
  },[skill,width])
  useLayoutEffect(()=>{
    if(mode!=='overview')return
    const observer=new ResizeObserver(()=>setRoleHeights(old=>{
      const next=new Map(old);let changed=false
      for(const [id,el] of roleRefs.current){const height=Math.ceil(el.offsetHeight);if(next.get(id)!==height){next.set(id,height);changed=true}}
      return changed?next:old
    }))
    roleRefs.current.forEach(el=>observer.observe(el))
    return ()=>observer.disconnect()
  },[mode,branches])
  useLayoutEffect(()=>()=>{if(returnTimer.current)clearTimeout(returnTimer.current)},[])
  useLayoutEffect(()=>{
    if(mode!=='role'||!role)return
    const measure=()=>{
      const roleHeight=roleRefs.current.get(role.id)?.offsetHeight??160
      let skillHeight=0;skillRefs.current.forEach(el=>{skillHeight=Math.max(skillHeight,el.offsetHeight)})
      setFocusMetrics(old=>old.roleId===role.id&&old.roleHeight===roleHeight&&old.skillHeight===skillHeight?old:{roleId:role.id,roleHeight,skillHeight})
    }
    const observer=new ResizeObserver(measure)
    const node=roleRefs.current.get(role.id);if(node)observer.observe(node)
    skillRefs.current.forEach(el=>observer.observe(el));measure()
    return ()=>observer.disconnect()
  },[mode,role])
  const roleHeight=focusMetrics.roleId===roleId?focusMetrics.roleHeight:160, skillHeight=focusMetrics.roleId===roleId?Math.max(140,focusMetrics.skillHeight):140
  const dense = narrow || (role?.skills.length ?? 0) > 8 || roleHeight>180 || skillHeight>150
  const skillColumns = Math.max(1,Math.min(narrow?2:Infinity,Math.floor(width/166))), levelColumns = narrow ? 1 : 3
  const focusWidth=linear&&skill?Math.max(width,(skill.levels.length+1)*240):width
  const selectedSkillX=linear&&skill?(focusWidth-skill.levels.length*240)/2:width/2
  const selectedSkillY=linear?100:narrow?210:250
  const gridStart=linear?90:Math.max(210,70+roleHeight+8),gridRow=skillHeight+(linear?80:16),levelStart=linear?selectedSkillY+skillHeight+80:Math.max(narrow?400:470,selectedSkillY+skillHeight+50),levelRow=levelHeight+35
  const height = mode === 'overview' ? layout.height : mode === 'skill' && linear ? Math.max(300,Math.max(skillHeight,levelHeight)+120) : mode === 'skill' ? levelStart+(narrow?Math.max(0,(skill?.levels.length??1)-1)*levelRow:0)+levelHeight+35 : linear ? Math.max(320,Math.ceil((role?.skills.length??0)/skillColumns)*gridRow+60) : dense ? Math.max(400,Math.max(0,Math.ceil((role?.skills.length ?? 0)/skillColumns)-1)*gridRow+gridStart+skillHeight+12) : 650
  const center = { x: width/2,y: mode === 'skill' ? 100 : dense ? 70 : height/2-25 }
  const [viewportHeight,setViewportHeight]=useState(0)
  useLayoutEffect(()=>{
    const measure=()=>{
      const header=document.querySelector('.workspace-header')?.getBoundingClientRect().bottom??0
      setViewportHeight(Math.max(1,window.innerHeight-header-32))
    }
    measure();window.addEventListener('resize',measure)
    const header=document.querySelector('.workspace-header')
    const observer=new ResizeObserver(measure);if(header)observer.observe(header)
    return()=>{window.removeEventListener('resize',measure);observer.disconnect()}
  },[])
  const fitScale=!linear&&viewportHeight>0?Math.min(1,viewportHeight/height):1
  const roleOrigin = role ? layout.positions.get(role.id) : undefined
  const camera = roleOrigin ? `translate(${center.x-roleOrigin.x}px,${center.y-roleOrigin.y}px)` : 'translate(0px,0px)'
  const skillPoints = new Map<string, GraphPoint>()
  role?.skills.forEach((s,index) => {
    const angle = -Math.PI/2+index/role.skills.length*Math.PI*2
    let point: GraphPoint
    if (linear) point = {x:width*(index%skillColumns+.5)/skillColumns,y:gridStart+Math.floor(index/skillColumns)*gridRow}
    else if (dense) point = { x: width*(index%skillColumns+.5)/skillColumns,y: gridStart+Math.floor(index/skillColumns)*gridRow }
    else if (narrow) {
      const rows = Math.ceil(role.skills.length/2), row = Math.floor(index/2), before = Math.ceil(rows/2)
      const y = row < before ? 75+row*155 : height-140-(rows-1-row)*155
      point = { x:width*(index%2 ? .78 : .22),y }
    } else point = { x:width/2+Math.cos(angle)*Math.min(245,width*.32),y:center.y+Math.sin(angle)*200 }
    skillPoints.set(s.key, s.key === skillKey ? {x:selectedSkillX,y:selectedSkillY} : point)
  })
  const levelPoints = skill?.levels.map((_,index) => ({ x: linear?selectedSkillX+(index+1)*240:narrow?width/2+18:width*((index%levelColumns)+.5)/Math.min(3,skill.levels.length),y: linear?selectedSkillY:levelStart+(narrow?index*levelRow:0) })) ?? []
  const skillRadius=40
  const levelMaskWidth=(narrow?Math.min(180,Math.max(76,width-112)):180)+16
  const narrowEdge=(a:GraphPoint,b:GraphPoint,startRadius:number,endRadius:number)=>{
    const right=!skill&&skillColumns>1&&b.x>width/2,side=right?1:-1,lane=right?width-18:18
    return `M ${a.x+side*startRadius} ${a.y} H ${lane} V ${b.y} H ${b.x+side*endRadius}`
  }
  function focusStage() {
    if (linear || suppressAutoScroll) return
    requestAnimationFrame(() => stage.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}))
  }
  function cancelReturn() {if(returnTimer.current){clearTimeout(returnTimer.current);returnTimer.current=null}}
  function selectRole(id: string) {
    setHovered(null);setFocused(null)
    const branch=branches.find(r=>r.id===id)
    cancelReturn()
    if(branch?.source==='ASSIGNED'){setTargetsExpanded(value=>!value);setRoleId(null);setSkillKey(null);setDetailKey(null);onAssignedRoleClick?.();return}
    if(branch?.source!=='TARGET')return
    setRoleId(id);setSkillKey(null);setDetailKey(null);focusStage()
  }
  function selectSkill(key: string) { setHovered(null);setFocused(null);cancelReturn();setSkillKey(key); setDetailKey(null);focusStage() }
  function back() {
    setHovered(null);setFocused(null)
    cancelReturn()
    if (detailKey) { setDetailKey(null); return }
    if (skillKey) { const key=skillKey; setSkillKey(null); requestAnimationFrame(()=>skillRefs.current.get(key)?.focus({preventScroll:true})) }
    else if (linear) { setSkillKey(null) }
    else { const id=roleId;setRoleId(null);if(id){requestAnimationFrame(()=>roleRefs.current.get(id)?.focus({preventScroll:true}));if(!suppressAutoScroll)returnTimer.current=setTimeout(()=>roleRefs.current.get(id)?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),matchMedia('(prefers-reduced-motion: reduce)').matches?0:740)} }
  }
  const contextLabel = role ? `${role.roleName}${role.levelName?' · '+role.levelName:''}` : ''
  const matchedPathway=role&&pathway&&pathway.selectionId===role.id&&pathway.selectionRevision===role.revision&&pathway.roleId===role.roleId&&pathway.levelId===role.levelId?pathway:null
  const modules=detail?.skillVersion&&matchedPathway&&!matchedPathway.archived&&!matchedPathway.targetReleased
    ? [...new Map(matchedPathway.steps.filter(step=>step.requirement.skillId===detail.skillId&&step.requirement.skillVersion===detail.skillVersion&&step.requirement.knowledgeLevel===detail.knowledgeLevel).flatMap(step=>step.options.filter(option=>!step.learningLocked||option.startedAt).map(option=>[option.moduleId,{id:option.moduleId,title:option.title}] as const))).values()]:[]
  return <div className="mastery-journey space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label={copy('Map navigation', 'Điều hướng bản đồ')} className="flex min-w-0 flex-wrap items-center gap-2">
        <Button variant="link" size="sm" onClick={()=>{cancelReturn();setRoleId(null);setSkillKey(null);setDetailKey(null);setTargetsExpanded(linear);if(linear)setRoleId(targets[0]?.id??null);onAssignedRoleClick?.()}}>{linear?copy('Pathway skills','Kỹ năng theo lộ trình'):copy('Assigned role', 'Vị trí được giao')}</Button>
        {role && <><Text as="span" variant="caption" aria-hidden="true">/</Text><button type="button" className="journey-crumb" onClick={()=>{cancelReturn();setSkillKey(null);setDetailKey(null)}} aria-current={skill?undefined:'page'}>{contextLabel}</button></>}
        {skill && <><Text as="span" variant="caption" aria-hidden="true">/</Text><Text as="span" variant="caption" aria-current="page">{skill.name}</Text></>}
      </nav>
      <div className="flex flex-wrap gap-2">{tools}{role && (!linear || skill) && <Button variant="outline" size="sm" onClick={back}><ArrowLeft size={14} aria-hidden="true" />{copy('Back', 'Trở lại')}</Button>}</div>
    </div>
    <Text variant="body-sm" role="status">{!role ? targetsExpanded||!assigned ? copy('Choose a target Role to explore its skills.', 'Chọn vị trí mục tiêu để xem kỹ năng của mục tiêu đó.') : copy('Select your assigned Role to expand your chosen targets.', 'Bấm vị trí được giao để bung các mục tiêu đã chọn.') : !skill ? copy('Select a skill to explore its knowledge levels.', 'Chọn kỹ năng để xem các mức kiến thức.') : copy('Select a knowledge level for recognition, results and history.', 'Chọn mức kiến thức để xem công nhận, kết quả và lịch sử.')}</Text>
    {mode==='overview'&&(targetsExpanded||!assigned)&&targetsState!=='ready'&&<Text variant="body-sm" role="status">{targetsState==='loading'?copy('Loading targets…','Đang tải mục tiêu…'):targetsState==='unavailable'?copy('Target history could not be loaded. No target nodes have been inferred.', 'Chưa tải được lịch sử mục tiêu. Hệ thống không tự thêm node mục tiêu.'):copy('No targets have been selected yet.', 'Bạn chưa chọn mục tiêu nào.')}</Text>}
    {!assigned && !linear && <Text variant="caption">{copy('No assigned Role is recorded in the Role data currently available.', 'Dữ liệu vị trí hiện có chưa ghi nhận vị trí được giao.')}</Text>}
    <div ref={stage} className="journey-stage" data-mode={mode} style={{height:height*fitScale,overflowX:linear&&skill?'auto':undefined}} tabIndex={linear&&skill?0:undefined} role="region" aria-label={copy('Role and skill graph', 'Bản đồ vị trí và kỹ năng')} onKeyDown={e=>{if(e.key==='Escape'&&!detailKey&&role){e.preventDefault();back()}}}>
      <div style={{position:'absolute',width,height,left:(width-width*fitScale)/2,top:0,transform:`scale(${fitScale})`,transformOrigin:'top left'}}>
      <div className="journey-reveal" aria-hidden="true" />
      <div className="journey-world" style={{transform:camera}}>
        <svg className="journey-edges journey-overview-edges" width={width} height={layout.height} aria-hidden="true">{layout.edges.map(edge=>{
          const a=layout.positions.get(edge.from)!, b=layout.positions.get(edge.to)!, side=b.x<=width/2?-1:1, lane=Math.max(10,Math.min(width-10,b.x+side*100))
          const d=`M ${a.x+side*42} ${a.y} L ${lane} ${a.y} L ${lane} ${b.y} L ${b.x+side*42} ${b.y}`
          return <path key={`${edge.from}:${edge.to}`} {...emphasis('role:'+edge.from,'role:'+edge.to)} d={d} className={edge.branch?'journey-branch-edge':''} />
        })}</svg>
        {!linear && branches.map((branch,index)=>{
          const point=layout.positions.get(branch.id);if(!point)return null
          const selected=role?.id===branch.id
          return <button type="button" key={branch.id} {...interaction('role:'+branch.id)} {...emphasis('role:'+branch.id,...(mode==='overview'?roleNeighbors.get(branch.id)??[]:role?.skills.map(s=>'skill:'+s.key)??[]))} ref={el=>{if(el)roleRefs.current.set(branch.id,el);else roleRefs.current.delete(branch.id)}} className="journey-node journey-role" data-selected={selected} data-source={branch.source} style={{left:point.x,top:point.y,'--journey-target-order':Math.min(index,8)} as CSSProperties} disabled={Boolean(role)&&!selected} aria-hidden={role&&!selected?true:undefined} aria-expanded={branch.source==='ASSIGNED'?targetsExpanded:selected} onClick={()=>selectRole(branch.id)}>
            <span className="journey-disc"><Briefcase size={25} aria-hidden="true" /></span><Text as="span" variant="caption" className="journey-label journey-role-kind journey-role-secondary">{branch.source==='ASSIGNED'?copy('Assigned role','Được giao'):branch.current?copy('Target role','Mục tiêu'):copy('Saved target','Đã lưu')}</Text><Text as="span" className="journey-label font-semibold">{branch.roleName}</Text>
            {branch.levelName && <Text as="span" variant="caption" className="journey-label">{branch.levelName}</Text>}
            <Text as="span" variant="caption" className="journey-label journey-role-secondary">{branch.source==='ASSIGNED'?targetsExpanded?copy('Hide targets','Thu mục tiêu'):copy('Show targets','Xem mục tiêu'):`${branch.skillCount} ${copy('skills','kỹ năng')}`}</Text>
            {branch.selectedAt && <Text as="span" variant="caption" className="journey-label journey-role-secondary"><time dateTime={branch.selectedAt}>{new Date(branch.selectedAt).toLocaleDateString(language)}</time></Text>}
          </button>
        })}
      </div>
      {role && <>
        <svg key={mode} className="journey-edges journey-member-edges" width={focusWidth} height={height} aria-hidden="true">
          <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={focusWidth} height={height}>
            <rect width={focusWidth} height={height} fill="white" />
            {!linear&&mode==='role'&&<rect x={center.x-100} y={center.y+43} width={200} height={Math.max(0,roleHeight-85)} fill="black" />}
            {role.skills.filter(s=>!skill||s.key===skill.key).map(s=>{const p=skillPoints.get(s.key)!;return <g key={s.key}><circle cx={p.x} cy={p.y} r={32} fill="black" /><rect x={p.x-(narrow?64:84)} y={p.y+35} width={narrow?128:168} height={Math.max(0,skillHeight-68)} fill="black" /></g>})}
            {levelPoints.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={38} fill="black" /><rect x={p.x-levelMaskWidth/2} y={p.y+42} width={levelMaskWidth} height={Math.max(0,levelHeight-83)} fill="black" /></g>)}
          </mask></defs>
          <g mask={`url(#${maskId})`}>
            {!skill && !linear && role.skills.map(s=>{const progress=skillProgress(s),p=skillPoints.get(s.key)!;return <path key={s.key} {...emphasis('role:'+role.id,'skill:'+s.key)} data-tone={progress.positive===progress.total&&progress.total>0?'positive':progress.positive>0?'partial':'unknown'} d={narrow?narrowEdge(center,p,42,skillRadius):memberEdge(center,p,42,skillRadius)} />})}
            {!skill && linear && role.skills.slice(1).map((s,index)=>{
              const previous=role.skills[index],a=skillPoints.get(previous.key)!,b=skillPoints.get(s.key)!
              const wrapped=b.y!==a.y,gap=a.y+skillHeight+15
              const d=wrapped?`M ${a.x+40} ${a.y} H ${width-10} V ${gap} H ${b.x} V ${b.y-42}`:`M ${a.x+40} ${a.y} H ${b.x-40}`
              const progress=skillProgress(previous)
              return <path key={s.key} d={d} data-tone={progress.positive===progress.total?'positive':progress.positive?'partial':'unknown'} />
            })}
            {skill && levelPoints.map((p,i)=><path key={i} {...emphasis('skill:'+skill.key,'level:'+skill.levels[i].key)} data-tone={levelTone(skill.levels[i])} d={linear?`M ${(i?levelPoints[i-1].x:selectedSkillX)+(i?42:skillRadius)} ${selectedSkillY} H ${p.x-42}`:narrow?narrowEdge({x:width/2,y:selectedSkillY},p,skillRadius,42):memberEdge({x:width/2,y:selectedSkillY},p,skillRadius,42)} />)}
          </g>
        </svg>
        {role.skills.map((s,index)=>{
          const point=skillPoints.get(s.key)!, selected=s.key===skillKey
          const progress=skillProgress(s),progressKnown=progress.known&&(s.levels.filter(l=>s.required.has(l.knowledgeLevel)).every(l=>Boolean(l.targetStatus))||!unavailable&&!incomplete),passed=progressKnown&&progress.total>0&&progress.positive===progress.total
          const progressLabel=progressKnown?copy(`${progress.positive} of ${progress.total} target requirements met.`,`${progress.positive}/${progress.total} yêu cầu mục tiêu đã đáp ứng.`):copy('Progress unavailable until the target state or full history is loaded.','Chưa đủ dữ liệu trạng thái mục tiêu hoặc lịch sử để tính tiến độ.')
          const duplicate=role.skills.some(other=>other.id===s.id&&other.key!==s.key)
          return <button type="button" key={s.key} {...interaction('skill:'+s.key)} {...emphasis('skill:'+s.key,...(skill?skill.levels.map(l=>'level:'+l.key):['role:'+role.id]))} ref={el=>{if(el)skillRefs.current.set(s.key,el);else skillRefs.current.delete(s.key)}} className="journey-node journey-skill" data-selected={selected} data-passed={passed} data-progress={progress.positive>0} style={{left:point.x,top:point.y,'--journey-order':Math.min(index,8)} as CSSProperties} disabled={Boolean(skill)&&!selected} aria-hidden={skill&&!selected?true:undefined} aria-expanded={selected} aria-label={`${copy('Skill','Kỹ năng')}: ${s.name}. ${progressLabel} ${copy('View knowledge levels','Xem mức kiến thức')}`} onClick={()=>selectSkill(s.key)}>
            <span className="journey-disc"><svg className="journey-progress" viewBox="0 0 76 76" aria-hidden="true"><circle className="journey-progress-track" cx="38" cy="38" r="34" /><circle className="journey-progress-value" cx="38" cy="38" r="34" pathLength="100" strokeDasharray={`${progress.total?progress.positive/progress.total*100:0} 100`} /></svg><Lightbulb size={22} aria-hidden="true" /></span><Text as="span" variant="caption" className="journey-kind-tag">{copy('Skill','Kỹ năng')}</Text><Text as="span" className="journey-label font-semibold">{s.name}</Text>
            <Text as="span" variant="caption" className="journey-progress-count" aria-hidden="true">{progressKnown?`${progress.positive}/${progress.total}`:'—'}</Text>
            {duplicate&&<Text as="span" variant="caption" className="journey-label">{copy('Version','Phiên bản')} {s.version??copy('Unknown','Chưa rõ')}</Text>}
          </button>
        })}
        {skill?.levels.map((node,index)=>{
          const point=levelPoints[index],tone=levelTone(node),recognized=node.targetStatus ? node.targetStatus==='achieved' : node.evidence.length>0,passed=node.targetStatus ? node.targetStatus==='baseline' : node.latestAssessment?.passed===true&&!node.latestAssessment.vetoTriggered
          const statusLabel=node.targetStatus ? statusLabels[node.targetStatus][language==='vi'?1:0] : recognized?copy('Recognized competency','Năng lực đã công nhận'):passed?copy('Assessment passed; recognition is separate.','Đánh giá đạt; công nhận được ghi riêng.'):tone==='failed'?copy('Assessment not passed','Đánh giá chưa đạt'):copy('No matching result available','Chưa có kết quả phù hợp')
          return <button type="button" key={node.key} ref={el=>{if(el)levelRefs.current.set(node.key,el);else levelRefs.current.delete(node.key)}} {...interaction('level:'+node.key)} {...emphasis('level:'+node.key,'skill:'+skill.key)} className="journey-node journey-level" data-tone={tone} data-recognized={recognized} style={{left:point.x,top:point.y,'--journey-order':index} as CSSProperties} aria-label={`${copy('Knowledge level','Mức kiến thức')}: ${t('knowledgeLevel.'+node.knowledgeLevel)}. ${node.origin==='prerequisite'?copy('Added prerequisite.','Tiên quyết bổ sung.'):skill.required.has(node.knowledgeLevel)?copy('Original target level.','Cấp độ mục tiêu ban đầu.'):copy('History only, outside target requirements.','Chỉ có trong lịch sử, ngoài yêu cầu mục tiêu.')} ${statusLabel}. ${copy('Open details','Mở chi tiết')}`} aria-haspopup="dialog" onClick={()=>setDetailKey(node.key)}>
            <span className="journey-disc">{recognized?<Check size={26} aria-hidden="true" />:passed?<Lightbulb size={26} aria-hidden="true" />:tone==='failed'?<TriangleAlert size={26} aria-hidden="true" />:<CircleHelp size={26} aria-hidden="true" />}</span>
            <Text as="span" variant="caption" className="journey-level-kind"><Layers size={13} aria-hidden="true" />{copy('Knowledge level','Mức kiến thức')}</Text>
            <Text as="span" className="journey-label font-semibold">{t('knowledgeLevel.'+node.knowledgeLevel)}</Text>
            <Text as="span" variant="caption" className="journey-label">{node.origin==='prerequisite'?copy('Added prerequisite','Tiên quyết bổ sung'):skill.required.has(node.knowledgeLevel)?copy('Original target level','Cấp độ mục tiêu ban đầu'):copy('From your history only','Chỉ có trong lịch sử')}{node.needsReview?' · '+copy('Needs review','Cần ôn lại'):''}</Text>
          </button>
        })}
        {(!role.skills.length || skill&&!skill.levels.length) && <div className="journey-no-data"><Heading level={3} size="card">{copy('No data','Trống')}</Heading><Text variant="body-sm">{copy('No knowledge-level requirements are available for this saved Role or skill. No levels or recognition have been inferred.', 'Chưa có yêu cầu mức kiến thức cho vị trí hoặc kỹ năng này. Hệ thống không tự thêm mức hay suy diễn công nhận.')}</Text></div>}
      </>}
      {!branches.length&&<div className="journey-no-data"><Text>{copy('No data','Trống')}</Text></div>}
    </div>
    </div>
    <KnowledgeMapDetails node={detail} incomplete={incomplete} unavailable={unavailable} onClose={()=>setDetailKey(null)} contextLabel={contextLabel} modules={modules} />
  </div>
}
