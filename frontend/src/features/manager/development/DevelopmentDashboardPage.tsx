import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, Award, BarChart3, Building2, BriefcaseBusiness, CheckCircle2, ClipboardCheck, Clock3, Gauge, Layers, RefreshCw, Target, Users } from 'lucide-react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { BarList, ChartLegend, DonutChart, StackedBar, type ChartSegment } from './components/DevelopmentCharts'
import { DevelopmentFilterBar } from './components/DevelopmentFilterBar'
import { DEVELOPMENT_STATUSES, filterEmployees, groupBy, statusLabels, statusTone, summarize, targetRoleBreakdown, timingBreakdown, type DevelopmentFilters } from './developmentMetrics'
import { useDevelopmentFilters, useDevelopmentReport } from './useDevelopment'
import { developmentErrorMessage } from './developmentMessages'
import './development.css'

export function DevelopmentDashboardPage() {
  return <WorkspaceLayout><DevelopmentDashboard /></WorkspaceLayout>
}

function DevelopmentDashboard() {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const navigate = useNavigate()
  const report = useDevelopmentReport()
  const { filters, update, reset, active } = useDevelopmentFilters()
  const scoped = filterEmployees(report.data?.employees ?? [], { ...filters, search: '', status: '' })
  const summary = summarize(scoped)
  const unassigned = copy('Unassigned', 'Chưa gán')
  const drill = (patch: Partial<DevelopmentFilters>) => {
    const params = new URLSearchParams()
    Object.entries({ department: filters.department, jobPosition: filters.jobPosition, ...patch }).forEach(([key, value]) => { if (value) params.set(key, value) })
    navigate('/ld-manager/employees' + (params.size ? '?' + params : ''))
  }
  const percent = (value: number | null) => value === null ? '—' : value + '%'
  const updated = report.data ? new Date(report.data.generatedAt).toLocaleTimeString(vi ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : null

  const header = <PageHeader title={copy('Development dashboard', 'Bảng điều khiển phát triển')} icon={<BarChart3 size={26} />}
    description={copy('Organization-wide competency, assessment and learning progress of your employees. Select any chart element to open the matching employees.',
      'Tổng quan năng lực, kết quả đánh giá và tiến độ học tập của nhân viên. Chọn một phần biểu đồ để mở danh sách nhân viên tương ứng.')}
    actions={<>
      {updated && <Text variant="caption" className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{copy('Updated', 'Cập nhật')} {updated}</Text>}
      <Button variant="outline" size="sm" leftIcon={<RefreshCw className={report.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} />} disabled={report.isFetching} onClick={() => void report.refetch()}>{copy('Refresh', 'Làm mới')}</Button>
      <Link to="/ld-manager/employees" className={buttonVariants({ variant: 'primary', size: 'sm' })}><Users className="mr-1.5 size-3.5" />{copy('View employees', 'Xem nhân viên')}</Link>
    </>} />

  if (report.isPending) return <div className="ld-dev-page">{header}<DashboardSkeleton /></div>
  if (report.isError) return <div className="ld-dev-page">{header}<EmptyState icon={<AlertTriangle />} title={copy('Development data could not be loaded', 'Chưa tải được dữ liệu phát triển')}
    description={developmentErrorMessage(report.error, copy)} action={<Button variant="outline" onClick={() => void report.refetch()}>{copy('Retry', 'Thử lại')}</Button>} /></div>
  if (!report.data.employees.length) return <div className="ld-dev-page">{header}<EmptyState icon={<Users />} title={copy('No employees yet', 'Chưa có nhân viên')}
    description={copy('Employees appear here once the organization administrator adds members with the Employee role.', 'Nhân viên sẽ xuất hiện khi quản trị viên thêm thành viên có vai trò Employee.')} /></div>

  const statusSegments: ChartSegment[] = DEVELOPMENT_STATUSES.map(status => ({ key: status, label: statusLabels[status][vi ? 1 : 0], value: summary.statuses[status], tone: statusTone[status], onSelect: () => drill({ status }) }))
  const departments = groupBy(scoped, 'department', unassigned)
  const positions = groupBy(scoped, 'jobPosition', unassigned)
  const timing = timingBreakdown(scoped)
  const timingLabels: Record<string, [string, string, string]> = {
    IN_PROGRESS: ['In progress', 'Đang thực hiện', '--primary'], OVERDUE: ['Overdue', 'Quá hạn', '--destructive'], COMPLETED: ['Completed', 'Hoàn tất', '--success'],
    NOT_STARTED: ['Awaiting approval', 'Chờ phê duyệt', '--warning'], LEGACY_UNTIMED: ['No deadline', 'Không thời hạn', '--muted-foreground'],
  }
  const roles = targetRoleBreakdown(scoped).slice(0, 6)
  const assessmentSegments: ChartSegment[] = [
    { key: 'passed', label: copy('Passed skill groups', 'Nhóm kỹ năng đạt'), value: summary.passedGroups, tone: '--success' },
    { key: 'failed', label: copy('Not passed', 'Chưa đạt'), value: summary.failedGroups, tone: '--destructive' },
  ]

  return <div className="ld-dev-page">
    {header}
    <DevelopmentFilterBar employees={report.data.employees} filters={filters} onChange={update} onReset={reset} active={active} copy={copy} search={false}>
      <span className="ld-toolbar-meta"><Users className="size-3.5" />{scoped.length} / {report.data.employees.length} {copy('employees in scope', 'nhân viên trong phạm vi')}</span>
    </DevelopmentFilterBar>

    <section className="ld-kpi-grid ld-kpi-6" aria-label={copy('Key development indicators', 'Chỉ số phát triển chính')}>
      {[
        <StatCard key="headcount" title={copy('Employees', 'Nhân viên')} icon={<Users size={16} />} value={summary.headcount} description={`${scoped.filter(e => e.active).length} ${copy('active accounts', 'tài khoản hoạt động')}`} />,
        <StatCard key="target" title={copy('With target role', 'Đã chọn mục tiêu')} icon={<Target size={16} />} value={`${summary.withTarget} / ${summary.headcount}`}
          description={`${summary.withPathway} ${copy('with a learning pathway', 'có lộ trình học')}`}><Progress value={summary.withTarget} max={Math.max(summary.headcount, 1)} variant="primary" /></StatCard>,
        <StatCard key="progress" title={copy('Avg. pathway progress', 'Tiến độ lộ trình TB')} icon={<Gauge size={16} />} value={percent(summary.averageProgress)} valueClassName="text-primary"
          description={copy('Fulfilled required steps; waived steps excluded', 'Bước bắt buộc đã đạt; không tính bước được miễn')}>{summary.averageProgress !== null && <Progress value={summary.averageProgress} variant="success" />}</StatCard>,
        <StatCard key="pass" title={copy('Assessment pass rate', 'Tỉ lệ đạt đánh giá')} icon={<ClipboardCheck size={16} />} value={percent(summary.passRate)}
          description={`${summary.attempts} ${copy('finalized attempts', 'lượt đã chấm')}`} />,
        <StatCard key="achieved" title={copy('Official levels achieved', 'Cấp độ đạt chính thức')} icon={<Award size={16} />} value={summary.achievedLevels} valueClassName="text-success"
          description={`${summary.completedModules} ${copy('learning modules completed', 'học phần đã hoàn tất')}`} />,
        <StatCard key="risk" title={copy('Needs attention', 'Cần chú ý')} icon={<AlertTriangle size={16} />} value={summary.statuses.at_risk} valueClassName={summary.statuses.at_risk ? 'text-destructive' : undefined}
          description={copy('Overdue, blocked, expert action or review needed', 'Quá hạn, bị chặn, cần chuyên gia hoặc cần ôn lại')} className="cursor-pointer" onClick={() => drill({ status: 'at_risk' })} />,
      ].map((card, index) => <div key={index} className="ld-rise" style={{ '--i': index } as React.CSSProperties}>{card}</div>)}
    </section>

    <section className="ld-panel-grid">
      <Panel index={1} className="ld-span-5" icon={<Activity size={18} />} title={copy('Development status', 'Trạng thái phát triển')} subtitle={copy('Where every employee currently stands', 'Vị trí hiện tại của từng nhân viên')}>
        <div className="ld-donut-layout"><DonutChart segments={statusSegments} centerValue={summary.headcount} centerLabel={copy('employees', 'nhân viên')} ariaLabel={copy('Development status distribution', 'Phân bố trạng thái phát triển')} />
          <ChartLegend segments={statusSegments} total={summary.headcount} /></div>
      </Panel>
      <Panel index={2} className="ld-span-7" icon={<Building2 size={18} />} title={copy('Department development summary', 'Tổng hợp phát triển theo phòng ban')} subtitle={copy('Status mix, average pathway progress and assessment pass rate per department', 'Phân bố trạng thái, tiến độ lộ trình và tỉ lệ đạt theo phòng ban')}>
        <ul className="ld-legend-inline" aria-hidden="true">{DEVELOPMENT_STATUSES.map(status => <li key={status}><i style={{ backgroundColor: `hsl(var(${statusTone[status]}))` }} />{statusLabels[status][vi ? 1 : 0]}</li>)}</ul>
        {departments.length ? <ul className="ld-dept-list">{departments.map((group, index) => <li key={group.key} className="ld-rise" style={{ '--i': index + 6 } as React.CSSProperties}>
          <button type="button" className="ld-dept" onClick={() => drill({ department: group.key, jobPosition: '' })} aria-label={`${group.label}: ${copy('open employees', 'mở danh sách nhân viên')}`}>
            <div className="ld-dept-head"><span className="ld-bar-label">{group.label}</span><span className="ld-dept-count"><Users className="size-3.5" />{group.headcount}</span></div>
            <StackedBar ariaLabel={copy('Status mix', 'Phân bố trạng thái')} segments={DEVELOPMENT_STATUSES.map(status => ({ key: status, label: statusLabels[status][vi ? 1 : 0], value: group.statuses[status], tone: statusTone[status] }))} />
            <div className="ld-dept-metrics">
              <span><Target className="size-3.5" />{group.withTarget}/{group.headcount} {copy('with target', 'có mục tiêu')}</span>
              <span><Gauge className="size-3.5" />{copy('Progress', 'Tiến độ')} <strong>{percent(group.averageProgress)}</strong></span>
              <span><ClipboardCheck className="size-3.5" />{copy('Pass rate', 'Tỉ lệ đạt')} <strong>{percent(group.passRate)}</strong></span>
              <span><Award className="size-3.5" />{group.achievedLevels} {copy('levels', 'cấp độ')}</span>
            </div>
          </button></li>)}</ul> : <p className="ld-chart-empty">{copy('No departments in scope', 'Không có phòng ban')}</p>}
      </Panel>
      <Panel index={3} className="ld-span-4" icon={<ClipboardCheck size={18} />} title={copy('Assessment outcomes', 'Kết quả đánh giá')} subtitle={copy('Skill groups across finalized attempts', 'Nhóm kỹ năng trong các lượt đã chấm')}>
        {summary.passedGroups + summary.failedGroups > 0 ? <div className="ld-donut-layout"><DonutChart size={140} segments={assessmentSegments} centerValue={percent(summary.passRate)} centerLabel={copy('passed', 'đạt')} ariaLabel={copy('Assessment outcomes', 'Kết quả đánh giá')} />
          <ChartLegend segments={assessmentSegments} total={summary.passedGroups + summary.failedGroups} /></div> : <p className="ld-chart-empty">{copy('No finalized assessments yet', 'Chưa có lượt đánh giá đã chấm')}</p>}
      </Panel>
      <Panel index={4} className="ld-span-4" icon={<Clock3 size={18} />} title={copy('Pathway timeline', 'Thời hạn lộ trình')} subtitle={copy('Current pathway deadline state', 'Trạng thái thời hạn lộ trình hiện tại')}>
        <BarList max={Math.max(1, ...timing.map(item => item.count))} emptyLabel={copy('No pathways yet', 'Chưa có lộ trình')}
          data={summary.withPathway ? timing.filter(item => item.count > 0 || item.state !== 'LEGACY_UNTIMED').map(item => ({ key: item.state, label: timingLabels[item.state][vi ? 1 : 0], value: item.count, tone: timingLabels[item.state][2],
            onSelect: item.state === 'OVERDUE' ? () => drill({ status: 'at_risk' }) : item.state === 'COMPLETED' ? () => drill({ status: 'completed' }) : undefined })) : []} />
      </Panel>
      <Panel index={5} className="ld-span-4" icon={<Target size={18} />} title={copy('Popular target roles', 'Vị trí mục tiêu phổ biến')} subtitle={copy('Employees per selected target role', 'Số nhân viên theo vị trí mục tiêu')}>
        <BarList max={Math.max(1, ...roles.map(role => role.count))} emptyLabel={copy('No target roles selected yet', 'Chưa có vị trí mục tiêu nào được chọn')}
          data={roles.map(role => ({ key: role.label, label: role.label, value: role.count, tone: '--primary', onSelect: () => navigate('/ld-manager/employees?search=' + encodeURIComponent(role.label)) }))} />
      </Panel>
      <Panel index={6} className="ld-span-6" icon={<BriefcaseBusiness size={18} />} title={copy('Readiness by job position', 'Mức sẵn sàng theo vị trí công việc')} subtitle={copy('Average pathway progress per current job position', 'Tiến độ trung bình theo vị trí hiện tại')}>
        <BarList emptyLabel={copy('No job positions in scope', 'Không có vị trí')} data={positions.map(group => ({ key: group.key, label: group.label, value: group.averageProgress, display: percent(group.averageProgress), tone: '--primary',
          hint: `${group.headcount} ${copy('employees', 'nhân viên')} · ${group.statuses.completed} ${copy('completed', 'hoàn thành')} · ${group.statuses.at_risk} ${copy('need attention', 'cần chú ý')}`,
          onSelect: () => drill({ jobPosition: group.key }) }))} />
      </Panel>
      <Panel index={7} className="ld-span-6" icon={<Layers size={18} />} title={copy('Learning activity', 'Hoạt động học tập')} subtitle={copy('Evidence recorded for employees in scope', 'Minh chứng ghi nhận cho nhân viên trong phạm vi')}>
        <BarList max={Math.max(1, summary.achievedLevels, summary.completedModules, summary.attempts, summary.needReview)} emptyLabel="—" data={[
          { key: 'levels', label: <span className="inline-flex items-center gap-2"><Award className="size-4 text-success" />{copy('Official levels achieved', 'Cấp độ đạt chính thức')}</span>, value: summary.achievedLevels, tone: '--success' },
          { key: 'modules', label: <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{copy('Learning modules completed', 'Học phần đã hoàn tất')}</span>, value: summary.completedModules, tone: '--primary' },
          { key: 'attempts', label: <span className="inline-flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" />{copy('Finalized assessment attempts', 'Lượt đánh giá đã chấm')}</span>, value: summary.attempts, tone: '--primary' },
          { key: 'review', label: <span className="inline-flex items-center gap-2"><AlertTriangle className="size-4 text-warning" />{copy('Levels needing review', 'Cấp độ cần ôn lại')}</span>, value: summary.needReview, tone: '--warning' },
        ]} />
      </Panel>
    </section>
  </div>
}

function Panel({ index, className, icon, title, subtitle, children }: { index: number; className: string; icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return <article className={'ld-panel ld-rise ' + className} style={{ '--i': index + 5 } as React.CSSProperties}>
    <div className="ld-panel-head"><div><Heading level={2} size="card">{icon}{title}</Heading><Text variant="caption">{subtitle}</Text></div></div>
    {children}
  </article>
}

function DashboardSkeleton() {
  return <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
    <div className="ld-skeleton h-16" />
    <div className="ld-kpi-grid">{Array.from({ length: 6 }, (_, index) => <div key={index} className="ld-skeleton h-28" />)}</div>
    <div className="ld-panel-grid"><div className="ld-skeleton ld-span-5 h-72" /><div className="ld-skeleton ld-span-7 h-72" /></div>
  </div>
}
