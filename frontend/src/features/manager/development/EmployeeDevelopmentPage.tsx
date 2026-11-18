import { useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  AlertTriangle, ArrowLeft, Award, BadgeCheck, BookOpen, Briefcase, Building2, Calendar, CheckCircle2, ChevronDown, ClipboardCheck, Clock3,
  FileBadge, GitFork, Gauge, Mail, RefreshCw, ShieldAlert, Target, TrendingDown, XCircle,
} from 'lucide-react'
import type { RuleModuleOption, RulePathway, RuleStep } from '../../../shared/api/requirementPathway'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { moduleAssessmentState, type AssessmentState, type AttemptOutcomeLike } from '../../employee/baseline-assessment/usePathwayAssessmentStates'
import { RequirementPathwayPresentation } from '../../employee/components/RequirementPathwayPresentation'
import { CompetencyStatusSummary } from '../../employee/overview/CompetencyStatusSummary'
import { composeRoleOverview, moduleHistoryKey, requirementMet, statusLabels as requirementLabels, type OverviewPair, type RequirementStatus } from '../../employee/overview/roleOverviewData'
import '../../employee/overview/EmployeeOverviewPage.css'
import type { AttemptOutcome, EmployeeDevelopmentDetail } from './developmentApi'
import { ProgressRing } from './components/DevelopmentCharts'
import { StatusBadge } from './components/StatusBadge'
import { assessmentPassRate, developmentStatus, initials, pathwayProgress, statusTone } from './developmentMetrics'
import { developmentErrorMessage, sectionMessage } from './developmentMessages'
import { useEmployeeDevelopment } from './useDevelopment'
import './development.css'
import { PageLoader } from '../../../shared/components/ui/PageLoader'

type Copy = (en: string, vi: string) => string
const TABS = ['competency', 'gaps', 'pathway', 'assessments', 'achievements'] as const
type DetailTab = typeof TABS[number]

export function EmployeeDevelopmentPage() {
  const { accountId } = useParams()
  return <WorkspaceLayout><EmployeeDevelopment key={accountId} accountId={accountId} /></WorkspaceLayout>
}

function toOutcomeLike(attempt: AttemptOutcome): AttemptOutcomeLike {
  return { target: { selectionId: attempt.selectionId, selectionRevision: attempt.selectionRevision, stepId: attempt.stepId }, state: attempt.state,
    results: attempt.groups.map(group => ({ groupId: group.groupId, passed: group.passed, vetoTriggered: group.vetoTriggered })),
    groups: attempt.groups.map(group => ({ id: group.groupId, role: group.role })) }
}

/** Same composition as the employee Overview, fed by the L&D report instead of the employee's own session. */
function useDevelopmentView(detail: EmployeeDevelopmentDetail | undefined) {
  return useMemo(() => {
    if (!detail) return null
    const histories = new Map<string, AttemptOutcomeLike[]>()
    for (const attempt of detail.assessments) {
      if (attempt.purpose !== 'SKILL_ASSESSMENT' || !attempt.moduleId || !attempt.moduleRevision) continue
      const key = moduleHistoryKey(attempt.moduleId, attempt.moduleRevision)
      histories.set(key, [...(histories.get(key) ?? []), toOutcomeLike(attempt)])
    }
    const pathway = detail.pathway.data
    const competency = detail.competency.data
    const matching = pathway && competency && pathway.selectionId === competency.selectionId && pathway.selectionRevision === competency.selectionRevision && !pathway.archived ? pathway : null
    const roleName = detail.employee.target?.roleName ?? pathway?.roleName ?? ''
    const overview = competency ? composeRoleOverview({ selectionId: competency.selectionId, revision: competency.selectionRevision, roleName },
      { target: competency.target, achieved: new Set(competency.achievedKeys), baseline: new Set(competency.baselinePassedKeys) }, matching, histories) : null
    const assessmentStates = pathway ? (step: RuleStep, option?: RuleModuleOption): AssessmentState | null => {
      if (pathway.archived || step.requirement.provision !== 'MODULE_ONLY' || step.state === 'BYPASSED') return null
      const state = (item: RuleModuleOption) => moduleAssessmentState(histories.get(moduleHistoryKey(item.moduleId, item.moduleRevision)) ?? [], pathway, step)
      if (option) return option.completedAt ? state(option) : null
      const available = step.options.filter(item => item.completedAt).map(state)
      const priority: AssessmentState[] = ['passed', 'prerequisites', 'inProgress', 'failed', 'unavailable', 'loading', 'notStarted']
      return priority.find(item => available.includes(item)) ?? null
    } : undefined
    return { overview, assessmentStates, pathway }
  }, [detail])
}

function EmployeeDevelopment({ accountId }: { accountId: string | undefined }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy: Copy = (en, vn) => vi ? vn : en
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const tab: DetailTab = TABS.includes(params.get('tab') as DetailTab) ? params.get('tab') as DetailTab : 'competency'
  const setTab = (next: string) => setParams(current => { const query = new URLSearchParams(current); query.set('tab', next); return query }, { replace: true })
  const backTo = typeof (location.state as { from?: unknown } | null)?.from === 'string' ? (location.state as { from: string }).from : '/ld-manager/employees'
  const query = useEmployeeDevelopment(accountId)
  const view = useDevelopmentView(query.data)
  const back = <Link to={backTo} className="ld-back"><ArrowLeft className="size-4" />{copy('Back to employees', 'Quay lại danh sách nhân viên')}</Link>

  if (query.isPending) return <div className="ld-dev-page">{back}<PageLoader /></div>
  if (query.isError || !view) return <div className="ld-dev-page">{back}<EmptyState icon={<AlertTriangle />} title={copy('Development profile could not be loaded', 'Chưa tải được hồ sơ phát triển')}
    description={developmentErrorMessage(query.error, copy)} action={<Button variant="outline" onClick={() => void query.refetch()}>{copy('Retry', 'Thử lại')}</Button>} /></div>

  const detail = query.data, employee = detail.employee, status = developmentStatus(employee)
  const progress = pathwayProgress(employee), passRate = assessmentPassRate(employee)
  const overview = view.overview, skills = overview?.skills ?? [], allPairs = overview?.allPairs ?? []
  const totalLevels = allPairs.length, metLevels = allPairs.filter(pair => requirementMet(pair.status)).length
  const completeSkills = skills.filter(skill => skill.pairs.length > 0 && skill.pairs.every(pair => requirementMet(pair.status))).length
  const gaps = allPairs.filter(pair => !requirementMet(pair.status))
  const requiredSteps = view.pathway?.steps.filter(step => step.kind === 'REQUIRED') ?? []
  const fulfilled = requiredSteps.filter(step => step.state === 'FULFILLED').length
  const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : copy('Not recorded', 'Chưa ghi nhận')
  const timingText: Record<string, [string, string]> = { NOT_STARTED: ['Not started', 'Chưa bắt đầu'], LEGACY_UNTIMED: ['No deadline recorded', 'Chưa ghi nhận thời hạn'], IN_PROGRESS: ['In progress', 'Đang thực hiện'], OVERDUE: ['Overdue', 'Quá hạn'], COMPLETED: ['Completed', 'Đã hoàn tất'] }
  const timing = view.pathway?.timing

  return <div className="ld-dev-page">
    {back}
    <section className="ld-hero ld-rise" aria-label={copy('Employee profile', 'Hồ sơ nhân viên')}>
      <span className="ld-avatar" data-size="lg" style={{ '--avatar': `var(${statusTone[status]})` } as React.CSSProperties} aria-hidden="true">{initials(employee.fullName)}</span>
      <div className="ld-hero-main">
        <div className="flex flex-wrap items-center gap-3"><Heading level={1} size="page">{employee.fullName}</Heading><StatusBadge status={status} vi={vi} />{!employee.active && <Badge variant="outline">{copy('Inactive', 'Ngưng hoạt động')}</Badge>}</div>
        <div className="ld-hero-tags">
          {employee.email && <span className="ld-tag"><Mail className="size-3.5" />{employee.email}</span>}
          <span className="ld-tag"><Building2 className="size-3.5" />{copy('Department', 'Phòng ban')}: <strong>{employee.departmentName ?? copy('Unassigned', 'Chưa gán')}</strong></span>
          <span className="ld-tag"><Briefcase className="size-3.5" />{copy('Job position', 'Vị trí')}: <strong>{employee.jobPositionName ?? copy('Unassigned', 'Chưa gán')}</strong></span>
          <span className="ld-tag"><Clock3 className="size-3.5" />{copy('Last activity', 'Hoạt động gần nhất')}: <strong>{date(employee.lastActivityAt)}</strong></span>
        </div>
      </div>
      <div className="ld-hero-side">
        <div className="ld-hero-stat"><ProgressRing value={progress} size={64} tone={status === 'at_risk' ? '--destructive' : '--success'} label={copy('Pathway progress', 'Tiến độ lộ trình')} />{copy('Pathway', 'Lộ trình')}</div>
        <div className="ld-hero-stat"><ProgressRing value={passRate} size={64} tone="--primary" label={copy('Assessment pass rate', 'Tỉ lệ đạt đánh giá')} />{copy('Pass rate', 'Tỉ lệ đạt')}</div>
        <div className="ld-hero-stat"><ProgressRing value={totalLevels ? Math.round(100 * metLevels / totalLevels) : null} size={64} tone="--warning" label={copy('Levels met', 'Cấp độ đã đáp ứng')} />{copy('Levels met', 'Cấp độ đạt')}</div>
      </div>
    </section>

    <div className="ld-target-strip ld-rise" style={{ '--i': 1 } as React.CSSProperties}>
      <span><Target className="size-4" />{copy('Target role', 'Vị trí mục tiêu')}: <strong>{employee.target?.roleName ?? view.pathway?.roleName ?? copy('Not selected', 'Chưa chọn')}</strong>{(employee.target?.levelName ?? view.pathway?.levelName) && <Badge variant="secondary">{employee.target?.levelName ?? view.pathway?.levelName}</Badge>}</span>
      <span><Calendar className="size-4" />{copy('Start', 'Bắt đầu')}: <strong>{date(timing?.startedAt)}</strong></span>
      <span><Calendar className="size-4" />{copy('Deadline', 'Hạn')}: <strong>{date(timing?.deadlineAt)}</strong></span>
      {timing?.durationMonths ? <span><Clock3 className="size-4" />{copy('Duration', 'Thời lượng')}: <strong>{timing.durationMonths} {copy('months', 'tháng')}</strong></span> : null}
      {timing && <span>{copy('Timeline', 'Tiến độ thời gian')}: <Badge variant={timing.state === 'OVERDUE' ? 'destructive' : timing.state === 'COMPLETED' ? 'success' : 'outline'}>{timingText[timing.state]?.[vi ? 1 : 0] ?? timing.state}</Badge></span>}
      {view.pathway && <span>{copy('Pathway review', 'Duyệt lộ trình')}: <Badge variant={view.pathway.reviewStatus === 'APPROVED' ? 'success' : view.pathway.reviewStatus === 'REJECTED' ? 'destructive' : 'warning'}>{reviewLabel(view.pathway, copy)}</Badge></span>}
    </div>

    <section className="ld-kpi-grid ld-kpi-5" aria-label={copy('Competency statistics', 'Thống kê năng lực')}>
      {[
        <StatCard key="skills" title={copy('Skills meeting target', 'Kỹ năng đạt mục tiêu')} icon={<Award size={16} />} valueClassName="text-primary"
          value={skills.length ? Math.round(100 * completeSkills / skills.length) + '%' : '—'} description={skills.length ? `${completeSkills} / ${skills.length} ${copy('target skills fully met', 'kỹ năng mục tiêu đạt đủ')}` : sectionMessage(detail.competency.unavailableCode, copy)}>
          {skills.length > 0 && <Progress value={completeSkills} max={skills.length} variant="success" />}</StatCard>,
        <StatCard key="levels" title={copy('Levels met', 'Cấp độ đã đáp ứng')} icon={<Gauge size={16} />} value={totalLevels ? `${metLevels} / ${totalLevels}` : '—'}
          description={copy('Target levels plus added prerequisites', 'Cấp độ mục tiêu và tiên quyết bổ sung')} />,
        <StatCard key="steps" title={copy('Required steps completed', 'Bước bắt buộc hoàn tất')} icon={<CheckCircle2 size={16} />} value={requiredSteps.length ? `${fulfilled} / ${requiredSteps.length}` : '—'}
          description={copy('Bypassed steps are waived, not counted as completed', 'Bước được miễn không tính là hoàn tất')} />,
        <StatCard key="assess" title={copy('Assessments', 'Đánh giá')} icon={<ClipboardCheck size={16} />} value={employee.assessments.finalized}
          description={`${employee.assessments.passedGroups}/${employee.assessments.totalGroups} ${copy('skill groups passed', 'nhóm kỹ năng đạt')}${employee.assessments.inProgress ? ` · ${employee.assessments.inProgress} ${copy('in progress', 'đang làm')}` : ''}`} />,
        <StatCard key="evidence" title={copy('Official achievements', 'Thành tích chính thức')} icon={<BadgeCheck size={16} />} value={employee.evidence.achievedLevels} valueClassName="text-success"
          description={`${employee.evidence.completedModules} ${copy('modules completed', 'học phần hoàn tất')}${employee.evidence.needReview ? ` · ${employee.evidence.needReview} ${copy('need review', 'cần ôn lại')}` : ''}`} />,
      ].map((card, index) => <div key={index} className="ld-rise" style={{ '--i': index + 2 } as React.CSSProperties}>{card}</div>)}
    </section>

    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <TabsList className="ld-detail-tabs w-auto bg-card" aria-label={copy('Development sections', 'Các phần phát triển')}>
        <TabsTrigger value="competency" className="gap-1.5"><Award className="size-4 text-primary" />{copy('Competency profile', 'Hồ sơ năng lực')}</TabsTrigger>
        <TabsTrigger value="gaps" className="gap-1.5"><TrendingDown className="size-4 text-primary" />{copy('Skill gaps', 'Khoảng trống kỹ năng')}{overview && <Badge variant={gaps.length ? 'warning' : 'success'} className="ml-1">{gaps.length}</Badge>}</TabsTrigger>
        <TabsTrigger value="pathway" className="gap-1.5"><GitFork className="size-4 text-primary" />{copy('Learning pathway', 'Lộ trình học')}</TabsTrigger>
        <TabsTrigger value="assessments" className="gap-1.5"><ClipboardCheck className="size-4 text-primary" />{copy('Assessment outcomes', 'Kết quả đánh giá')}<Badge variant="secondary" className="ml-1">{detail.assessments.length}</Badge></TabsTrigger>
        <TabsTrigger value="achievements" className="gap-1.5"><BadgeCheck className="size-4 text-primary" />{copy('Achievements', 'Thành tích')}<Badge variant="secondary" className="ml-1">{detail.achievements.length}</Badge></TabsTrigger>
      </TabsList>
      <TabsContent value="competency"><CompetencySection overview={overview} pairs={allPairs} code={detail.competency.unavailableCode} copy={copy} vi={vi} /></TabsContent>
      <TabsContent value="gaps"><GapSection gaps={gaps} available={Boolean(overview)} code={detail.competency.unavailableCode} copy={copy} vi={vi} /></TabsContent>
      <TabsContent value="pathway">{view.pathway ? <div className="ld-panel" data-testid="ld-employee-pathway">
        <div className="ld-panel-head"><div><Heading level={2} size="card"><GitFork size={18} />{view.pathway.roleName} · {view.pathway.levelName}</Heading>
          <Text variant="caption">{copy('Read-only view of the employee’s pathway graph. Select a node to see module and assessment status.', 'Chế độ chỉ xem lộ trình của nhân viên. Chọn một nút để xem trạng thái học phần và đánh giá.')}</Text></div>
          <div className="flex flex-wrap gap-2"><Badge variant="success">{fulfilled} {copy('fulfilled', 'đã đạt')}</Badge><Badge variant="outline">{requiredSteps.filter(step => step.state === 'BYPASSED').length} {copy('waived', 'được miễn')}</Badge>
            <Badge variant="warning">{requiredSteps.filter(step => step.state !== 'FULFILLED' && step.state !== 'BYPASSED').length} {copy('remaining', 'còn lại')}</Badge></div></div>
        {view.pathway.steps.length ? <RequirementPathwayPresentation pathway={view.pathway} preview assessmentStates={view.assessmentStates} />
          : <p className="ld-section-notice">{view.pathway.generationStatus === 'NO_LEARNING_REQUIRED' ? copy('No learning is required — the employee already meets the target.', 'Không cần học thêm — nhân viên đã đáp ứng mục tiêu.') : copy('The pathway has not been generated or approved yet.', 'Lộ trình chưa được tạo hoặc chưa được duyệt.')}</p>}
      </div> : <p className="ld-section-notice"><AlertTriangle className="size-4" />{sectionMessage(detail.pathway.unavailableCode, copy)}</p>}</TabsContent>
      <TabsContent value="assessments"><AssessmentSection attempts={detail.assessments} copy={copy} vi={vi} /></TabsContent>
      <TabsContent value="achievements"><AchievementSection detail={detail} copy={copy} vi={vi} /></TabsContent>
    </Tabs>
    <Text variant="caption">{copy('Report generated', 'Báo cáo tạo lúc')} {new Date(detail.generatedAt).toLocaleString(vi ? 'vi-VN' : 'en-GB')} · <button type="button" className="inline-flex items-center gap-1 text-primary" onClick={() => void query.refetch()}><RefreshCw className={query.isFetching ? 'size-3 animate-spin' : 'size-3'} />{copy('Refresh', 'Làm mới')}</button></Text>
  </div>
}

function reviewLabel(pathway: RulePathway, copy: Copy) {
  if (pathway.generationStatus === 'NO_LEARNING_REQUIRED') return copy('No learning required', 'Không cần học thêm')
  switch (pathway.reviewStatus) {
    case 'APPROVED': return copy('Approved', 'Đã duyệt')
    case 'REJECTED': return copy('Rejected', 'Bị từ chối')
    case 'AWAITING_EXPERT_REVIEW': return copy('Awaiting expert review', 'Chờ chuyên gia duyệt')
    default: return ['PENDING', 'GENERATING'].includes(pathway.generationStatus) ? copy('Generating', 'Đang tạo') : pathway.generationStatus
  }
}

function CompetencySection({ overview, pairs, code, copy, vi }: { overview: ReturnType<typeof composeRoleOverview> | null; pairs: OverviewPair[]; code: string | null; copy: Copy; vi: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<string | null>(null)
  const reduced = useReducedMotion()
  if (!overview) return <p className="ld-section-notice"><AlertTriangle className="size-4" />{sectionMessage(code, copy)}</p>
  return <div className="ld-panel-grid">
    <div className="ld-span-4 flex flex-col gap-4"><CompetencyStatusSummary pairs={pairs} available={pairs.length > 0} /></div>
    <section className="overview-progress-panel ld-span-8" aria-labelledby="ld-competency-title" data-testid="ld-competency-profile">
      <div className="overview-progress-panel-head"><div><Heading level={2} size="card" id="ld-competency-title">{copy('Current competency compared with target', 'Năng lực hiện tại so với mục tiêu')}</Heading>
        <Text variant="body-sm">{copy('Levels met through Baseline or completed learning. Open a skill to see each level.', 'Cấp độ đạt qua Baseline hoặc hoàn tất học tập. Mở kỹ năng để xem từng cấp độ.')}</Text></div>
        <Text variant="caption">{overview.skills.length} {copy('target skills', 'kỹ năng mục tiêu')}</Text></div>
      {overview.skills.map(skill => {
        const count = skill.pairs.filter(pair => requirementMet(pair.status)).length, open = expanded === skill.id
        return <div key={skill.id} className="overview-progress-skill" data-progress={count === skill.pairs.length ? 'complete' : count > 0 ? 'partial' : 'none'}>
          <button type="button" aria-expanded={open} aria-controls={'ld-requirements-' + skill.id} onClick={() => setExpanded(open ? null : skill.id)}>
            <span>{skill.name}</span><div className="overview-progress-skill-bar"><Progress value={count} max={skill.pairs.length} variant="success" aria-label={skill.name} /><strong>{count} / {skill.pairs.length}</strong></div>
            <ChevronDown size={16} className={'ld-chevron'} data-open={open} /></button>
          <AnimatePresence initial={false}>{open && <motion.div id={'ld-requirements-' + skill.id} className="overview-progress-requirements" initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
            {skill.pairs.map(pair => <div key={pair.requirement.skillVersion + ':' + pair.requirement.knowledgeLevel}><span>{t('knowledgeLevel.' + pair.requirement.knowledgeLevel)} · {pair.requirement.skillVersion ?? copy('Version not recorded', 'Chưa ghi nhận phiên bản')}</span>
              <span className="overview-level-status" data-state={pair.status}>{pair.needsReview ? copy('Needs review · ', 'Cần ôn lại · ') : ''}{requirementLabels[pair.status][vi ? 1 : 0]}</span></div>)}
          </motion.div>}</AnimatePresence>
        </div>
      })}
      {!overview.skills.length && <Text variant="body-sm" className="p-5">{copy('No target skills to compare yet.', 'Chưa có kỹ năng mục tiêu để đối chiếu.')}</Text>}
    </section>
  </div>
}

const gapTone = (status: RequirementStatus) => ['failed', 'expert', 'unavailable'].includes(status) ? 'destructive' : ['learning', 'assessing', 'waiting', 'assessment_passed', 'review'].includes(status) ? 'warning' : 'muted'
const gapRank = { destructive: 0, warning: 1, muted: 2 } as const
function GapSection({ gaps, available, code, copy, vi }: { gaps: OverviewPair[]; available: boolean; code: string | null; copy: Copy; vi: boolean }) {
  const { t } = useTranslation()
  if (!available) return <p className="ld-section-notice"><AlertTriangle className="size-4" />{sectionMessage(code, copy)}</p>
  if (!gaps.length) return <EmptyState icon={<CheckCircle2 className="text-success" />} title={copy('No open skill gaps', 'Không còn khoảng trống kỹ năng')} description={copy('Every target and prerequisite level is met.', 'Mọi cấp độ mục tiêu và tiên quyết đều đã đáp ứng.')} />
  const sorted = [...gaps].sort((a, b) => gapRank[gapTone(a.status)] - gapRank[gapTone(b.status)] || a.requirement.skillName.localeCompare(b.requirement.skillName))
  const counts = { destructive: sorted.filter(pair => gapTone(pair.status) === 'destructive').length, warning: sorted.filter(pair => gapTone(pair.status) === 'warning').length, muted: sorted.filter(pair => gapTone(pair.status) === 'muted').length }
  return <div className="ld-panel" data-testid="ld-skill-gaps">
    <div className="ld-panel-head"><div><Heading level={2} size="card"><TrendingDown size={18} />{copy('Open skill gaps', 'Khoảng trống kỹ năng đang mở')}</Heading>
      <Text variant="caption">{copy('Levels not yet met, most urgent first. Waived (bypassed) levels stay visible because they are not achievements.', 'Cấp độ chưa đạt, ưu tiên mức khẩn cấp. Cấp độ được miễn vẫn hiển thị vì chưa phải thành tích.')}</Text></div>
      <div className="flex flex-wrap gap-2"><Badge variant="destructive">{counts.destructive} {copy('blocked / failed', 'bị chặn / chưa đạt')}</Badge><Badge variant="warning">{counts.warning} {copy('in progress', 'đang tiến hành')}</Badge><Badge variant="outline">{counts.muted} {copy('not started', 'chưa bắt đầu')}</Badge></div></div>
    <ul className="ld-gap-list">{sorted.map((pair, index) => {
      const step = pair.step, started = step?.options.filter(option => option.startedAt).length ?? 0, done = step?.options.filter(option => option.completedAt).length ?? 0
      return <li key={pair.requirement.skillId + pair.requirement.knowledgeLevel + pair.requirement.skillVersion} className="ld-gap-item ld-rise" data-tone={gapTone(pair.status)} style={{ '--i': Math.min(index, 12) } as React.CSSProperties}>
        <div className="min-w-0"><div className="ld-gap-title">{pair.requirement.skillName} · {t('knowledgeLevel.' + pair.requirement.knowledgeLevel)}</div>
          <div className="ld-gap-meta">{pair.origin === 'target' ? copy('Target requirement', 'Yêu cầu mục tiêu') : copy('Added prerequisite', 'Tiên quyết bổ sung')}
            {step ? ` · ${step.options.length} ${copy('module option(s)', 'học phần')} · ${started} ${copy('started', 'đã bắt đầu')} · ${done} ${copy('completed', 'hoàn tất')}` : ''}
            {pair.requirement.provision === 'CERTIFICATE_ONLY' ? ' · ' + copy('Certificate required', 'Cần chứng chỉ') : ''}{pair.baselinePassed ? ' · ' + copy('Previously met through Baseline', 'Đã đạt Baseline trước đây') : ''}</div></div>
        <Badge variant={gapTone(pair.status) === 'destructive' ? 'destructive' : gapTone(pair.status) === 'warning' ? 'warning' : 'outline'}>{requirementLabels[pair.status][vi ? 1 : 0]}</Badge>
      </li>
    })}</ul>
  </div>
}

function AssessmentSection({ attempts, copy, vi }: { attempts: AttemptOutcome[]; copy: Copy; vi: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(attempts.find(attempt => attempt.state === 'FINALIZED')?.attemptId ?? null)
  const reduced = useReducedMotion()
  if (!attempts.length) return <EmptyState icon={<ClipboardCheck />} title={copy('No assessments yet', 'Chưa có lượt đánh giá')} description={copy('Baseline and skill assessment attempts appear here once the employee starts them.', 'Lượt Baseline và đánh giá kỹ năng sẽ xuất hiện khi nhân viên bắt đầu.')} />
  const when = (value: string | null) => value ? new Date(value).toLocaleString(vi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
  return <div className="ld-attempts" data-testid="ld-assessments">{attempts.map((attempt, index) => {
    const passed = attempt.groups.filter(group => group.passed && !group.vetoTriggered).length, total = attempt.groups.length
    const outcome = attempt.state === 'IN_PROGRESS' ? 'progress' : total > 0 && passed === total ? 'passed' : passed > 0 ? 'partial' : 'failed'
    const tone = outcome === 'passed' ? '--success' : outcome === 'partial' || outcome === 'progress' ? '--warning' : '--destructive'
    const Icon = outcome === 'passed' ? CheckCircle2 : outcome === 'progress' ? Clock3 : outcome === 'partial' ? ShieldAlert : XCircle
    const isOpen = open === attempt.attemptId
    return <article key={attempt.attemptId} className="ld-attempt ld-rise" style={{ '--i': Math.min(index, 10) } as React.CSSProperties}>
      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : attempt.attemptId)}>
        <span className="ld-attempt-icon" style={{ '--tone': `var(${tone})` } as React.CSSProperties}><Icon className="size-5" /></span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-semibold">{attempt.purpose === 'BASELINE' ? copy('Baseline assessment', 'Đánh giá Baseline') : copy('Skill assessment', 'Đánh giá kỹ năng')}
          <Badge variant="outline">{attempt.roleName ?? '—'}{attempt.levelName ? ' · ' + attempt.levelName : ''}</Badge></div>
          <div className="ld-person-meta">{copy('Started', 'Bắt đầu')} {when(attempt.startedAt)}{attempt.finishedAt ? ` · ${copy('Finished', 'Kết thúc')} ${when(attempt.finishedAt)}` : ''}{attempt.finishReason === 'DEADLINE' ? ' · ' + copy('time limit reached', 'hết thời gian') : ''}</div></div>
        <Badge variant={outcome === 'passed' ? 'success' : outcome === 'failed' ? 'destructive' : 'warning'}>{outcome === 'progress' ? copy('In progress', 'Đang làm') : `${passed}/${total} ${copy('passed', 'đạt')}`}</Badge>
        <ChevronDown className="ld-chevron size-4" data-open={isOpen} />
      </button>
      <AnimatePresence initial={false}>{isOpen && <motion.div initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduced ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
        <div className="ld-attempt-body">{attempt.state === 'IN_PROGRESS' ? <Text variant="body-sm">{copy('Results appear once the attempt is submitted or reaches its time limit.', 'Kết quả hiển thị khi lượt làm được nộp hoặc hết thời gian.')}</Text>
          : <table className="ld-group-table"><thead><tr><th>{copy('Skill · level', 'Kỹ năng · cấp độ')}</th><th>{copy('Group', 'Nhóm')}</th><th>{copy('Score', 'Điểm')}</th><th>{copy('Result', 'Kết quả')}</th></tr></thead>
            <tbody>{attempt.groups.map(group => <tr key={group.groupId}><td className="font-medium">{group.skillName} · {t('knowledgeLevel.' + group.knowledgeLevel)}</td>
              <td className="ld-muted">{group.role === 'TARGET' ? copy('Target', 'Mục tiêu') : group.role === 'MAIN' ? copy('Main', 'Chính') : copy('Prerequisite', 'Tiên quyết')}</td>
              <td><div className="flex items-center gap-2"><div className="w-24"><Progress value={group.correctCount} max={Math.max(group.totalCount, 1)} variant={group.passed && !group.vetoTriggered ? 'success' : 'destructive'} /></div><span className="ld-num">{group.correctCount}/{group.totalCount}</span></div></td>
              <td>{group.vetoTriggered ? <Badge variant="destructive">{copy('Mandatory item missed', 'Sai câu bắt buộc')}</Badge> : group.passed ? <Badge variant="success">{copy('Passed', 'Đạt')}</Badge> : <Badge variant="destructive">{copy('Not passed', 'Chưa đạt')}</Badge>}</td></tr>)}</tbody></table>}</div>
      </motion.div>}</AnimatePresence>
    </article>
  })}</div>
}

function AchievementSection({ detail, copy, vi }: { detail: EmployeeDevelopmentDetail; copy: Copy; vi: boolean }) {
  const { t } = useTranslation()
  if (!detail.achievements.length) return <EmptyState icon={<BadgeCheck />} title={copy('No official achievements yet', 'Chưa có thành tích chính thức')}
    description={copy('Official achievements are recorded from passed module assessments or approved certificates. Baseline results alone are diagnostics.', 'Thành tích chính thức được ghi nhận từ đánh giá học phần đạt hoặc chứng chỉ được duyệt. Kết quả Baseline chỉ mang tính chẩn đoán.')} />
  return <div className="ld-panel" data-testid="ld-achievements">
    <div className="ld-panel-head"><div><Heading level={2} size="card"><BadgeCheck size={18} />{copy('Official achievements', 'Thành tích chính thức')}</Heading>
      <Text variant="caption">{detail.employee.evidence.needReview ? `${detail.employee.evidence.needReview} ${copy('levels are flagged for review; their achievement still stands.', 'cấp độ được đánh dấu cần ôn lại; thành tích vẫn được giữ.')}` : copy('Exact skill levels recognized for this employee.', 'Các cấp độ kỹ năng được công nhận cho nhân viên này.')}</Text></div></div>
    <div className="ld-achievements">{detail.achievements.map((item, index) => <div key={item.skillId + item.knowledgeLevel} className="ld-achievement ld-rise" style={{ '--i': Math.min(index, 12) } as React.CSSProperties}>
      {item.sourceKind === 'CERTIFICATE' ? <FileBadge className="size-5" /> : <BookOpen className="size-5" />}
      <div className="min-w-0"><div className="font-semibold">{item.skillName}</div><div className="ld-person-meta">{t('knowledgeLevel.' + item.knowledgeLevel)}{item.skillVersion ? ' · ' + item.skillVersion : ''}</div>
        <div className="ld-person-meta">{item.sourceKind === 'CERTIFICATE' ? copy('Certificate', 'Chứng chỉ') : copy('Module assessment', 'Đánh giá học phần')} · {new Date(item.achievedAt).toLocaleDateString(vi ? 'vi-VN' : 'en-GB')}</div></div>
    </div>)}</div>
  </div>
}
