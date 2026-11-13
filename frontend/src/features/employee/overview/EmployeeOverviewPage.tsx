import { useOverviewSectionScroll } from './useOverviewSectionScroll'
import { useContext, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Award, ChartColumnIncreasing, LayoutDashboard, Calendar, CheckCircle2, ChevronDown, Clock3, Sparkles, Target } from 'lucide-react'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Button } from '../../../shared/components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { employeeBaselineEnabled } from '../baseline-assessment/baselineApi'
import { readRoleOverview, statusLabels, requirementMet } from './roleOverviewData'
import { CompetencyProfile } from '../baseline-assessment/CompetencyProfile'
import { CompetencyStatusSummary } from './CompetencyStatusSummary'
import './EmployeeOverviewPage.css'

export function EmployeeOverviewPage() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return <WorkspaceLayout><OwnedEmployeeOverview key={JSON.stringify([identity?.organizationId, identity?.accountId, identity?.roles])} /></WorkspaceLayout>
}

function OwnedEmployeeOverview() {
  const { language, t } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const identity = useContext(WorkspaceSessionContext)?.identity
  const enabled = Boolean(employeeBaselineEnabled && identity?.organizationId && identity?.accountId && identity.roles?.includes('EMPLOYEE'))
  const [tab, setTab] = useState<'overview' | 'riasec'>('overview')
  const rootRef=useRef<HTMLDivElement>(null)
  const alignGraph=useOverviewSectionScroll(rootRef,tab==='overview')
  const [expanded, setExpanded] = useState<string | null>(null)
  const overview = useQuery({ queryKey: ['employee-role-overview', identity?.organizationId, identity?.accountId],
    queryFn: ({ signal }) => readRoleOverview(signal), enabled, retry: false, staleTime: 0, refetchInterval: query => query.state.error ? false : 5000 })
  const denied = Boolean(overview.error && 'status' in overview.error && [401,403].includes(Number(overview.error.status)))
  const real = enabled && !denied && !overview.isError ? overview.data : undefined
  const selected = real?.flow.selection
  const level = selected?.role.levels.find(item => item.id === selected.levelId)
  const unknown = copy('Not available', 'Chưa có dữ liệu')
  const skills = real?.skills ?? []
  const total = real?.allPairs.length ?? 0
  const recognized = real?.allPairs.filter(pair => requirementMet(pair.status)).length ?? 0
  const completeSkills = skills.filter(skill => skill.pairs.length > 0 && skill.pairs.every(pair => requirementMet(pair.status))).length
  const requiredSteps = real?.pathway?.steps.filter(step => step.kind === 'REQUIRED') ?? []
  const fulfilled = requiredSteps.filter(step => step.state === 'FULFILLED').length
  const timing = real?.pathway?.timing
  const date = (value?: string | null) => value ? new Date(value).toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { timeZone: 'UTC' }) : unknown
  const duration = timing?.durationMonths ? timing.durationMonths + ' ' + copy('months', 'tháng') : unknown
  const timingState = timing?.state === 'LEGACY_UNTIMED' ? copy('No deadline recorded', 'Chưa ghi nhận thời hạn')
    : timing?.state === 'NOT_STARTED' ? copy('Not started', 'Chưa bắt đầu')
    : timing?.state === 'OVERDUE' ? copy('Overdue', 'Quá hạn')
    : timing?.state === 'COMPLETED' ? copy('Completed', 'Đã hoàn tất') : null
  const available = Boolean(selected && total)
  const progress = (count: number, max: number, label: string) => <Progress value={count} max={max} variant="success" role="progressbar" aria-label={label} aria-valuenow={count} aria-valuemin={0} aria-valuemax={max} />
  return <div ref={rootRef} className="employee-overview-container overview-progress-page">
    <Heading level={1} className="sr-only">Overview</Heading>
    <Tabs value={tab} onValueChange={value => setTab(value as 'overview' | 'riasec')} className="flex justify-end">
      <TabsList role="tablist" aria-label={copy('Profile sections', 'Profile')} className="w-auto gap-1">
        {(['overview', 'riasec'] as const).map(value => <TabsTrigger key={value} value={value} role="tab" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
          className="gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'riasec' : value === 'overview' ? 'riasec' : 'overview'
            setTab(next)
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus()
          }} data-value={value}>
          {value === 'overview' ? <LayoutDashboard size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {value === 'overview' ? 'Overview' : 'RIASEC'}
        </TabsTrigger>)}
      </TabsList>
    </Tabs>
    {tab === 'riasec' ? <section className="overview-progress-panel p-6"><Heading level={2} size="card">RIASEC</Heading><Text variant="body-sm">{copy('RIASEC content will be available in a later update.', 'Nội dung RIASEC sẽ được triển khai sau.')}</Text></section> : <>
      <div className="overview-target-toolbar">
        <div className="overview-target-control"><Target size={18} className="text-primary" /><Text variant="caption">{copy('TARGET ROLE', 'VỊ TRÍ MỤC TIÊU')}</Text><span className="font-semibold">{selected?.role.name ?? copy('No Target Role selected', 'Chưa chọn vị trí mục tiêu')}</span><span className="overview-target-pill">{level?.name ?? unknown}</span></div>
        <div className="overview-timing-bar"><span><Calendar size={15} />{copy('Start', 'Bắt đầu')}: <strong>{date(timing?.startedAt)}</strong></span><span><Calendar size={15} />{copy('End', 'Kết thúc')}: <strong>{date(timing?.deadlineAt)}</strong></span><span><Clock3 size={15} />{copy('Duration', 'Thời gian')}: <strong className="text-primary">{duration}</strong></span>{timingState && <span>{timingState}</span>}</div>
      </div>
      {(!enabled || overview.isPending || overview.isError || !selected || !total) && <div className="overview-data-notice" role="status"><Text variant="body-sm">{!enabled ? copy('The competency data service is unavailable in this workspace.', 'Dịch vụ dữ liệu năng lực chưa khả dụng trong workspace này.')
        : denied ? copy('Access denied. Your profile cannot be displayed.', 'Không có quyền truy cập. Chưa thể hiển thị hồ sơ.')
        : overview.isPending ? copy('Loading target data…', 'Đang tải dữ liệu mục tiêu…')
        : overview.isError ? copy('Target data could not be loaded. Target counts are unavailable.', 'Chưa tải được dữ liệu mục tiêu. Chưa có số liệu đối chiếu.')
        : !selected ? copy('Select a Target Role in Upskilling to compare requirements.', 'Chọn vị trí mục tiêu tại Upskilling để đối chiếu yêu cầu.')
        : copy('No target requirements are available for this selection.', 'Chưa có yêu cầu mục tiêu cho lựa chọn này.')}</Text>{enabled && overview.isError && <Button variant="outline" size="sm" disabled={overview.isFetching} onClick={() => void overview.refetch()}>{copy('Retry', 'Thử lại')}</Button>}</div>}
      <section aria-labelledby="overview-statistics-title" className="space-y-3">
        <Heading level={2} size="sm" id="overview-statistics-title" className="overview-statistics-title"><ChartColumnIncreasing size={18} aria-hidden="true" />{copy('AGGREGATE COMPETENCY STATISTICS', 'THỐNG KÊ NĂNG LỰC TỔNG HỢP')}</Heading>
        <div className="overview-statistics-grid">
          <StatCard title={copy('Skills meeting target', 'Kỹ năng đạt mục tiêu')} icon={<Award size={18} />} value={available ? Math.round(100 * completeSkills / skills.length) + '%' : '—'} valueClassName="text-primary" description={available ? `${completeSkills} / ${skills.length} ` + copy('skills meet the original target levels', 'kỹ năng đáp ứng đủ cấp độ mục tiêu ban đầu') : unknown}>
            {available && progress(completeSkills, skills.length, copy('Skills meeting all target levels', 'Kỹ năng đáp ứng đủ cấp độ mục tiêu'))}
          </StatCard>
          <StatCard title={copy('Levels met', 'Cấp độ đã đáp ứng')} icon={<Target size={18} />} value={available ? recognized + ' / ' + total : '—'} description={available ? `${recognized} / ${total} ` + copy('levels met: target + added prerequisites', 'cấp độ đã đáp ứng: mục tiêu + tiên quyết bổ sung') : unknown} />
          <StatCard title={copy('Required pathway steps completed', 'Bước lộ trình bắt buộc hoàn tất')} icon={<CheckCircle2 size={18} />} value={real?.pathway && requiredSteps.length ? `${fulfilled} / ${requiredSteps.length}` : '—'} description={copy('Learning steps, including added prerequisites. Bypassed steps are excluded from completion.', 'Bước học gồm cả tiên quyết được bổ sung. Không tính bước được miễn vào số hoàn tất.')}>
            {real?.pathway && requiredSteps.length > 0 && <Text variant="caption" className="text-success">{Math.round(100 * fulfilled / requiredSteps.length)}% {copy('completed', 'hoàn tất')}</Text>}
          </StatCard>
          <CompetencyStatusSummary pairs={real?.allPairs ?? []} available={available} />
        </div>
      </section>
      <CompetencyProfile onAssignedRoleClick={alignGraph} />
      <section className="overview-progress-panel" aria-labelledby="overview-skill-progress-title">
        <div className="overview-progress-panel-head"><div><Heading level={2} size="card" id="overview-skill-progress-title">{copy('Current competency compared with target', 'Năng lực hiện tại so với mục tiêu')}</Heading><Text variant="body-sm">{copy('Levels met through Baseline or completed learning.', 'Cấp độ đã đáp ứng qua Baseline hoặc hoàn tất học tập.')}</Text></div><Text variant="caption">{selected ? skills.length : '—'} {copy('target skills', 'kỹ năng mục tiêu')}</Text></div>
        {skills.map(skill => {
          const count = skill.pairs.filter(pair => requirementMet(pair.status)).length
          const open = expanded === skill.id
          return <div key={skill.id} className="overview-progress-skill" data-progress={count===skill.pairs.length?'complete':count>0?'partial':'none'}><button type="button" aria-expanded={open} aria-controls={'overview-requirements-' + skill.id} onClick={() => setExpanded(open ? null : skill.id)}><span>{skill.name}</span><div className="overview-progress-skill-bar">{progress(count, skill.pairs.length, skill.name)}<strong>{count} / {skill.pairs.length}</strong></div><ChevronDown size={16} className={open ? 'rotate-180' : ''} /></button>
            {open && <div id={'overview-requirements-' + skill.id} className="overview-progress-requirements">{skill.pairs.map(pair => <div key={pair.requirement.skillVersion + ':' + pair.requirement.knowledgeLevel}><span>{t('knowledgeLevel.' + pair.requirement.knowledgeLevel)} · {pair.requirement.skillVersion ?? copy('Version not recorded', 'Chưa ghi nhận phiên bản')}</span><span className={'overview-level-status'} data-state={pair.status}>{pair.needsReview ? copy('Needs review · ', 'Cần ôn lại · ') : ''}{statusLabels[pair.status][vi ? 1 : 0]}{pair.needsReview && pair.baselinePassed ? copy(' · Previously met through Baseline', ' · Đã đạt Baseline trước đây') : ''}</span></div>)}</div>}
          </div>
        })}
        {!skills.length && <Text variant="body-sm" className="p-5">{copy('No target skills to compare yet.', 'Chưa có kỹ năng mục tiêu để đối chiếu.')}</Text>}
      </section>
      <footer className="overview-progress-caption"><Text variant="caption">{copy('Green includes Baseline-qualified levels and completed learning. Open a level to see how it was met.', 'Màu xanh gồm cấp độ đạt qua Baseline và hoàn tất học tập. Mở cấp độ để xem nguồn đáp ứng.')}</Text><Link to="/employee/pathway?view=role" className="text-primary">{copy('Open pathway', 'Mở lộ trình')} →</Link></footer>
    </>}
  </div>
}

export const LearnerOverviewPage = EmployeeOverviewPage
