import { EmployeeAccessNotice } from '../components/EmployeeAccessNotice'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { readRoleOverview } from '../overview/roleOverviewData'
import { knowledgeKey } from './masteryJourney'
import { Info } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readKnowledgeProfile } from './knowledgeProfileApi'
import { readKnowledgeJourney } from './knowledgeJourneyApi'
import { employeeBaselineEnabled } from './baselineApi'
import { groupKnowledgeEntries } from './knowledgeMap'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'
import { MasteryJourneyGraph } from './MasteryJourneyGraph'
import { readAssignedKnowledgeRole, readCurrentKnowledgeTarget } from './assignedKnowledgeRoleApi'
import { KnowledgeHistoryPanel } from './KnowledgeHistoryPanel'

export function CompetencyProfile({onAssignedRoleClick}:{onAssignedRoleClick?:()=>void}) {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <OwnedKnowledgeProfile onAssignedRoleClick={onAssignedRoleClick} key={JSON.stringify([identity?.organizationId, identity?.accountId, identity?.roles])} />
}
function ProfileRequestNotice({ error, retrying, onRetry }: { error: Error | null; retrying: boolean; onRetry: () => void }) {
  const { language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const denied = error instanceof RoleFlowError && (error.status === 401 || error.status === 403)
  return <div className="space-y-2"><Text className="font-semibold">{denied ? copy('Access denied', 'Bị chặn') : copy('Load failed', 'Lỗi tải')}</Text><EmployeeAccessNotice error={error} message={copy('Could not load this part of your knowledge profile. Please try again.', 'Chưa tải được phần dữ liệu này của hồ sơ kiến thức. Vui lòng thử lại.')} retrying={retrying} onRetry={onRetry} /></div>
}
function OwnedKnowledgeProfile({onAssignedRoleClick}:{onAssignedRoleClick?:()=>void}) {
  const { language } = useTranslation(), copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const identity = useContext(WorkspaceSessionContext)?.identity
  const [params] = useSearchParams()
  const location = useLocation()
  const sectionRef = useRef<HTMLElement>(null), anchored = useRef<string | null>(null)
  const canonical = useQuery({queryKey:['employee-role-overview', identity?.organizationId, identity?.accountId], queryFn:({signal})=>readRoleOverview(signal), enabled:Boolean(employeeBaselineEnabled && identity?.organizationId && identity?.accountId && identity.roles?.includes('EMPLOYEE')),retry:false,staleTime:0,refetchInterval:query=>query.state.error?false:5000})
  const [detailsOpen,setDetailsOpen]=useState(false)
  const scope = [identity?.organizationId, identity?.accountId]
  const profiles = useInfiniteQuery({ queryKey: ['knowledge-profile-map', ...scope],
    initialPageParam: 0, queryFn: ({ pageParam, signal }) => readKnowledgeProfile(pageParam, signal),
    getNextPageParam: last => last.hasMore && last.page < 250 ? last.page + 1 : undefined,
    enabled: employeeBaselineEnabled, retry: false, refetchOnWindowFocus:true })
  const journey = useInfiniteQuery({ queryKey: ['knowledge-profile-journey', ...scope],
    initialPageParam: 0, queryFn: ({ pageParam, signal }) => readKnowledgeJourney(pageParam, signal),
    getNextPageParam: last => last.hasMore && last.page < 50 ? last.page + 1 : undefined,
    enabled: employeeBaselineEnabled, retry: false, refetchOnWindowFocus:false })
  const journeyDenied=journey.error instanceof RoleFlowError && [401,403].includes(journey.error.status)
  const assignmentAllowed = journey.isError && !journey.data && !journeyDenied
  const assignmentEnabled = Boolean(employeeBaselineEnabled && assignmentAllowed && identity?.organizationId && identity?.accountId && identity?.roles?.includes('EMPLOYEE'))
  const assignment = useQuery({ queryKey: ['knowledge-profile-assigned-role', ...scope], enabled: assignmentEnabled, retry: false, refetchOnWindowFocus:false,
    queryFn: ({ signal }) => {
      if (!identity?.organizationId || !identity.accountId) throw new RoleFlowError('UNAUTHENTICATED',401)
      return readAssignedKnowledgeRole(identity.organizationId,identity.accountId,signal)
    } })
  const currentTarget = useQuery({ queryKey: ['knowledge-profile-current-target', ...scope], enabled: assignmentEnabled, retry: false, refetchOnWindowFocus:true,
    queryFn: ({ signal })=>readCurrentKnowledgeTarget(signal) })
  const accessError=[canonical.error,journey.error,assignment.error,currentTarget.error,profiles.error].find(error=>error && 'status' in error && [401,403].includes(Number(error.status)))
  const historyNodes = useMemo(() => groupKnowledgeEntries(profiles.data?.pages.flatMap(page => page.items) ?? []), [profiles.data])
  const current = !canonical.isError ? canonical.data : undefined
  const nodes = useMemo(() => {
    const byKey = new Map(historyNodes.map(node => [node.key, node]))
    for (const pair of current?.allPairs ?? []) {
      const r = pair.requirement, key = knowledgeKey(r.skillId, r.skillVersion, r.knowledgeLevel)
      const previous = byKey.get(key)
      byKey.set(key, {...(previous ?? {key,skillId:r.skillId,skillName:r.skillName,skillVersion:r.skillVersion,knowledgeLevel:r.knowledgeLevel,entries:[],evidence:[]}),targetStatus:pair.status,origin:pair.origin,baselinePassed:pair.baselinePassed,needsReview:pair.needsReview})
    }
    return [...byKey.values()]
  }, [historyNodes,current])
  const targets = useMemo(() => {
    const loaded = journey.data ? [...new Map(journey.data.pages.flatMap(page => page.nodes).map(node => [node.id,node])).values()] : currentTarget.data ? [currentTarget.data] : []
    const selection = current?.flow.selection
    if (!selection) return loaded.filter(role => !role.current)
    const original = loaded.find(role => role.id === selection.selectionId)
    const target = {...original,id:selection.selectionId,roleId:selection.role.id,roleCode:original?.roleCode??null,roleName:selection.role.name,roleVersion:original?.roleVersion??null,levelId:selection.levelId??null,levelName:selection.role.levels.find(l=>l.id===selection.levelId)?.name??null,rank:original?.rank??null,revision:selection.revision,selectedAt:original?.selectedAt??null,current:true,source:'TARGET' as const,requirementsSource:current.pathway?'FROZEN' as const:'SELECTION' as const,
      skills:current.allSkills.map(skill=>({id:skill.id,name:skill.name,levels:skill.pairs.map(pair=>({knowledgeLevel:pair.requirement.knowledgeLevel,skillVersion:pair.requirement.skillVersion}))}))}
    return [target,...loaded.filter(role=>role.id!==target.id&&!role.current)]
  }, [journey.data,currentTarget.data,current])
  const assigned = journey.data ? journey.data.pages[0]?.assigned ?? null : assignment.data?.assigned ?? null
  const limitedAssignment = !journeyDenied && !journey.data && assignment.data!==undefined
  const graphAvailable=!accessError && Boolean(journey.data || limitedAssignment || current)
  const assignmentLoading = assignmentEnabled && assignment.isPending
  const historyIncomplete = profiles.data?.pages.at(-1)?.hasMore === true
  const moreRoles = journey.data?.pages.at(-1)?.hasMore === true
  const targetsState = current ? targets.length?'ready':'empty' : journey.data ? targets.length?'ready':'empty' : currentTarget.isPending?'loading':targets.length?'ready':currentTarget.isSuccess?'empty':'unavailable'
  useEffect(()=>{
    if (!graphAvailable || location.hash!=='#competency-profile' || anchored.current===location.key) return
    const frame=requestAnimationFrame(()=>{anchored.current=location.key;sectionRef.current?.scrollIntoView({block:'start',behavior:'auto'})})
    return ()=>cancelAnimationFrame(frame)
  },[graphAvailable,location.hash,location.key])
  const recordsCount = profiles.data?.pages.reduce((sum,page) => sum+page.items.length,0) ?? 0
  return <section id="competency-profile" ref={sectionRef} className="overview-progress-panel overview-competency-profile" aria-labelledby="competency-profile-heading">
    <div className="overview-progress-panel-head"><Heading level={2} size="card" id="competency-profile-heading">{copy('Competency profile','H\u1ed3 s\u01a1 n\u0103ng l\u1ef1c')}</Heading></div>
    <div className="min-w-0 px-4 pb-4">
    {!employeeBaselineEnabled ? <Text variant="body-sm">{copy('Unavailable', 'Chưa sẵn')}</Text> : <>
      {!graphAvailable&&(journey.isPending || assignmentLoading) && <LoadingCard label={copy('Loading', 'Đang tải')} />}
      {!graphAvailable&&(accessError||journey.isError&&!assignmentLoading) && <ProfileRequestNotice error={accessError??(assignmentAllowed && assignment.isError ? assignment.error : journey.error)} retrying={journey.isFetching || assignment.isFetching || currentTarget.isFetching || profiles.isFetching} onRetry={() => { void journey.refetch();void profiles.refetch(); if (assignmentEnabled) {void assignment.refetch();void currentTarget.refetch()} }} />}
      {canonical.isError && <ProfileRequestNotice error={canonical.error} retrying={canonical.isFetching} onRetry={()=>void canonical.refetch()} />}
      {graphAvailable && <MasteryJourneyGraph onAssignedRoleClick={onAssignedRoleClick} suppressAutoScroll scopeKey={JSON.stringify(scope)} assigned={assigned} targets={targets} targetsState={targetsState} records={nodes} incomplete={historyIncomplete} unavailable={!profiles.data || profiles.isError} pathway={current?.pathway} openSelectionId={params.get('target')} tools={<Button variant="outline" size="sm" aria-haspopup="dialog" onClick={()=>setDetailsOpen(true)}><Info size={15} aria-hidden="true" />{copy('Details','Chi tiết')}</Button>} />}
      <Dialog open={detailsOpen&&!accessError} onOpenChange={setDetailsOpen} size="wide" className="max-w-3xl" ariaLabel={copy('Graph details','Chi tiết bản đồ')} closeLabel={copy('Close graph details','Đóng chi tiết bản đồ')}>
        <DialogHeader><DialogTitle>{copy('Graph details','Chi tiết bản đồ')}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-5">
          <Text variant="body-sm">{copy('Expand your assigned Role to see chosen targets. Only targets open skills and knowledge levels. Lines show saved targets and membership, not promotions or prerequisites.', 'Bung vị trí được giao để xem mục tiêu đã chọn. Chỉ mục tiêu mới mở kỹ năng và mức kiến thức. Đường nối thể hiện mục tiêu đã lưu và kỹ năng thuộc mục tiêu, không xác nhận thăng chức hay quan hệ tiên quyết.')}</Text>
          <Text variant="body-sm">{copy('Current target progress uses the same bound requirements and pathway states as Overview. Green means met through Baseline or completed learning; other assessments alone do not fill the ring. Historical targets show a dash until their history is complete. Open a level for its pathway status and assessment history.', 'Tiến độ mục tiêu hiện tại dùng cùng yêu cầu và trạng thái lộ trình với Overview. Xanh là đáp ứng qua Baseline hoặc hoàn tất học tập; đánh giá riêng lẻ khác không làm đầy vòng. Mục tiêu cũ hiện dấu gạch khi lịch sử chưa đủ. Bấm cấp độ để xem trạng thái và lịch sử đánh giá.')}</Text>
          <nav className="flex flex-wrap gap-2" aria-label={copy('Related pages','Trang liên quan')}><Link className={buttonVariants({variant:'outline',size:'sm'})} to="/employee/pathway">{copy('My pathway','Lộ trình của tôi')}</Link><Link className={buttonVariants({variant:'outline',size:'sm'})} to="/employee/baseline-assessment">{copy('Assessment history','Lịch sử đánh giá')}</Link></nav>
          <section className="space-y-3 border-t border-border pt-4">
            <Heading level={2} size="card">{copy('Target roles', 'Vị trí mục tiêu')}</Heading>
            <Text variant="caption">{targets.length} {copy('targets loaded','mục tiêu đã tải')}</Text>
            {limitedAssignment && <Text variant="body-sm">{copy('Older targets could not be loaded. Only your actual assignment and available current target are shown.', 'Chưa tải được mục tiêu cũ. Bản đồ chỉ hiển thị vị trí được giao và mục tiêu hiện tại mà API trả về.')}</Text>}
            {journey.isError&&<Button variant="outline" size="sm" disabled={journey.isFetching||assignment.isFetching||currentTarget.isFetching} onClick={()=>{void journey.refetch();if(assignmentEnabled){void assignment.refetch();void currentTarget.refetch()}}}>{copy('Retry','Thử lại')}</Button>}
            {currentTarget.isError&&limitedAssignment&&<ProfileRequestNotice error={currentTarget.error} retrying={currentTarget.isFetching} onRetry={()=>void currentTarget.refetch()} />}
            {journey.hasNextPage && <Button variant="outline" size="sm" disabled={journey.isFetching} isLoading={journey.isFetchingNextPage} onClick={() => void journey.fetchNextPage()}>{copy('Load targets','Tải mục tiêu')}</Button>}
            {journey.data&&journey.isError&&<ProfileRequestNotice error={journey.error} retrying={journey.isFetching} onRetry={()=>void(journey.isFetchNextPageError?journey.fetchNextPage():journey.refetch())} />}
            {journey.data?.pages.at(-1)?.page === 50 && moreRoles && <Text variant="caption">{copy('Limit reached: up to 1,020 targets can be loaded.', 'Chạm ngưỡng: tối đa 1.020 mục tiêu.')}</Text>}
          </section>
          <section className="space-y-3 border-t border-border pt-4">
            <Heading level={2} size="card">{copy('Evidence history', 'Lịch sử minh chứng')}</Heading><Text variant="caption">{recordsCount} {copy('items loaded','mục đã tải')}</Text>
            {historyIncomplete&&<Text variant="body-sm">{copy('Older evidence and results are not loaded yet. Load more before concluding that a skill has no recognition or assessment.', 'Còn minh chứng và kết quả cũ chưa được tải. Tải thêm trước khi kết luận kỹ năng chưa được công nhận hoặc chưa đánh giá.')}</Text>}
            <div className="flex flex-wrap gap-2"><KnowledgeHistoryPanel nodes={nodes} incomplete={historyIncomplete} unavailable={!profiles.data || profiles.isError} />{profiles.hasNextPage&&<Button variant="outline" size="sm" disabled={profiles.isFetching} isLoading={profiles.isFetchingNextPage} onClick={()=>void profiles.fetchNextPage()}>{copy('Load history','Tải lịch sử')}</Button>}</div>
            {profiles.isPending&&<Text variant="body-sm" role="status">{copy('Loading','Đang tải')}</Text>}
            {profiles.isError&&<ProfileRequestNotice error={profiles.error} retrying={profiles.isFetching} onRetry={()=>void(profiles.isFetchNextPageError?profiles.fetchNextPage():profiles.refetch())} />}
            {profiles.data?.pages.at(-1)?.page===250&&historyIncomplete&&<Text variant="caption">{copy('Limit reached: up to 5,020 knowledge records can be loaded.', 'Chạm ngưỡng: tối đa 5.020 bản ghi kiến thức.')}</Text>}
          </section>
          {canonical.isError&&<Text variant="caption">{copy('Module shortcuts are unavailable. You can still open My pathway.', 'Chưa tải được liên kết module. Bạn vẫn có thể mở Lộ trình của tôi.')}</Text>}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={()=>setDetailsOpen(false)}>{copy('Close','Đóng')}</Button></DialogFooter>
      </Dialog>
    </>}
  </div></section>
}
