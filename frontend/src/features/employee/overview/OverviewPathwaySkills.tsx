import { useInfiniteQuery } from '@tanstack/react-query'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readKnowledgeProfile } from '../baseline-assessment/knowledgeProfileApi'
import { groupKnowledgeEntries } from '../baseline-assessment/knowledgeMap'
import { useContext, useMemo } from 'react'
import type { RulePathway } from '../../../shared/api/requirementPathway'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { MasteryJourneyGraph } from '../baseline-assessment/MasteryJourneyGraph'
import type { JourneyRole } from '../baseline-assessment/knowledgeJourneyApi'
import type { KnowledgeNode } from '../baseline-assessment/knowledgeMap'
import { knowledgeKey } from '../baseline-assessment/masteryJourney'
import { orderByDependencies } from '../components/requirementOrder'
import type { OverviewPair } from './roleOverviewData'

export function OverviewPathwaySkills({pathway,pairs,scope}:{pathway:RulePathway|null|undefined;pairs:OverviewPair[];scope:string}) {
  const {language}=useTranslation(),vi=language==='vi'
  const identity=useContext(WorkspaceSessionContext)?.identity
  const history=useInfiniteQuery({queryKey:['knowledge-profile-map',identity?.organizationId,identity?.accountId],initialPageParam:0,queryFn:({pageParam,signal})=>readKnowledgeProfile(pageParam,signal),getNextPageParam:last=>last.hasMore&&last.page<250?last.page+1:undefined,enabled:Boolean(pathway&&identity?.organizationId&&identity?.accountId),retry:false,refetchOnWindowFocus:true})
  const denied=Boolean(history.error&&'status' in history.error&&[401,403].includes(Number(history.error.status)))
  const historyNodes=useMemo(()=>new Map(groupKnowledgeEntries(history.isError?[]:history.data?.pages.flatMap(page=>page.items)??[]).map(node=>[node.key,node])),[history.data,history.isError])
  const data=useMemo(()=>{
    if(!pathway)return null
    const steps=[...orderByDependencies(pathway.steps.filter(step=>step.kind==='REQUIRED'),pathway.dependencies),...pathway.steps.filter(step=>step.kind==='PARALLEL_SUPPLEMENT')]
    const skills=new Map<string,JourneyRole['skills'][number]>(),records:KnowledgeNode[]=[]
    for(const step of steps){
      const r=step.requirement,key=knowledgeKey(r.skillId,r.skillVersion,r.knowledgeLevel)
      const pair=pairs.find(pair=>knowledgeKey(pair.requirement.skillId,pair.requirement.skillVersion,pair.requirement.knowledgeLevel)===key)
      const status=pair?.status ?? (step.state==='FULFILLED'?'achieved':step.state==='BYPASSED'?'bypassed':step.state==='NEEDS_EXPERT_ACTION'?'expert':step.learningLocked?'waiting':step.state==='IN_PROGRESS'?'learning':'required')
      records.push({...historyNodes.get(key),key,skillId:r.skillId,skillName:r.skillName,skillVersion:r.skillVersion,knowledgeLevel:r.knowledgeLevel,entries:historyNodes.get(key)?.entries??[],evidence:historyNodes.get(key)?.evidence??[],targetStatus:status,origin:pair?.origin??'prerequisite',baselinePassed:pair?.baselinePassed,needsReview:pair?.needsReview})
      const skill=skills.get(r.skillId)??{id:r.skillId,name:r.skillName,levels:[]}
      if(!skill.levels.some(level=>level.knowledgeLevel===r.knowledgeLevel&&level.skillVersion===r.skillVersion))skill.levels.push({knowledgeLevel:r.knowledgeLevel,skillVersion:r.skillVersion})
      skills.set(r.skillId,skill)
    }
    const target:JourneyRole={id:pathway.selectionId,roleId:pathway.roleId,roleCode:null,roleName:pathway.roleName,roleVersion:null,levelId:pathway.levelId,levelName:pathway.levelName,rank:null,revision:pathway.selectionRevision,selectedAt:null,current:true,source:'TARGET',requirementsSource:'FROZEN',skills:[...skills.values()]}
    return {target,records}
  },[pathway,pairs,historyNodes])
  return <section className="overview-progress-panel overview-pathway-skills">
    <div className="overview-progress-panel-head"><div><Heading level={2} size="card">{vi?'Kỹ năng theo lộ trình':'Skills along your pathway'}</Heading><Text variant="body-sm">{vi?'Thứ tự học từ trái sang phải. Bấm kỹ năng để xem các cấp độ; đường nối chỉ thể hiện thứ tự.':'Follow the learning order from left to right. Select a skill for its levels; connections show order only.'}</Text></div></div>
    {denied?<Text variant="body-sm" role="alert">{vi?'Không có quyền truy cập hồ sơ':'Access denied'}</Text>:data&&data.records.length>0?<MasteryJourneyGraph key={data.target.id} linear scopeKey={scope+':overview-pathway'} assigned={null} targets={[data.target]} records={data.records} incomplete={!history.data||Boolean(history.data.pages.at(-1)?.hasMore)} unavailable={history.isError||!history.data} targetsState="ready" pathway={pathway} />:<Text variant="body-sm" className="p-5">{vi?'Chưa có bước học trong lộ trình. Các cấp độ đạt qua Baseline vẫn có trong hồ sơ năng lực.':'No pathway learning steps available. Levels met through Baseline remain in your competency profile.'}</Text>}
  </section>
}
