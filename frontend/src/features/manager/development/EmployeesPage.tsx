import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, RefreshCw, Users } from 'lucide-react'
import { Text } from '../../../shared/components/typography/Text'
import { Button } from '../../../shared/components/ui/Button'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Progress } from '../../../shared/components/ui/Progress'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import type { DevelopmentEmployee } from './developmentApi'
import { DevelopmentFilterBar } from './components/DevelopmentFilterBar'
import { StatusBadge } from './components/StatusBadge'
import { DEVELOPMENT_STATUSES, assessmentPassRate, developmentStatus, filterEmployees, initials, pathwayProgress, statusLabels, statusTone } from './developmentMetrics'
import { developmentErrorMessage } from './developmentMessages'
import { useDevelopmentFilters, useDevelopmentReport } from './useDevelopment'
import './development.css'

type SortKey = 'name' | 'progress' | 'passRate' | 'achieved' | 'activity'
type SortState = { key: SortKey; direction: 1 | -1 }
const PAGE_SIZE = 10

function SortHeader({ id, sort, onSort, className, children }: { id: SortKey; sort: SortState; onSort: (key: SortKey) => void; className?: string; children: React.ReactNode }) {
  return <th className={className} aria-sort={sort.key === id ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}>
    <button type="button" onClick={() => onSort(id)}>{children}{sort.key !== id ? <ArrowUpDown className="size-3 opacity-50" /> : sort.direction === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}</button></th>
}

export function EmployeesPage() {
  return <WorkspaceLayout><Employees /></WorkspaceLayout>
}

function Employees() {
  const { language } = useTranslation(), vi = language === 'vi'
  const copy = (en: string, vn: string) => vi ? vn : en
  const navigate = useNavigate()
  const report = useDevelopmentReport()
  const { filters, update, reset, active, params } = useDevelopmentFilters()
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 1 })
  const all = report.data?.employees ?? []
  const withoutStatus = filterEmployees(all, { ...filters, status: '' })
  const sortValue = (employee: DevelopmentEmployee): string | number => sort.key === 'name' ? employee.fullName.toLocaleLowerCase()
    : sort.key === 'progress' ? pathwayProgress(employee) ?? -1 : sort.key === 'passRate' ? assessmentPassRate(employee) ?? -1
    : sort.key === 'achieved' ? employee.evidence.achievedLevels : employee.lastActivityAt ? Date.parse(employee.lastActivityAt) : 0
  const filtered = [...filterEmployees(all, filters)].sort((a, b) => { const x = sortValue(a), y = sortValue(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.direction || a.fullName.localeCompare(b.fullName) })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(totalPages, Math.max(1, Number(params.get('page')) || 1))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const setPage = (next: number) => navigate({ search: (() => { const query = new URLSearchParams(params); if (next > 1) query.set('page', String(next)); else query.delete('page'); return query.toString() })() }, { replace: true })
  const open = (employee: DevelopmentEmployee) => navigate('/ld-manager/employees/' + encodeURIComponent(employee.accountId), { state: { from: '/ld-manager/employees' + (params.size ? '?' + params : '') } })
  const toggleSort = (key: SortKey) => setSort(current => current.key === key ? { key, direction: current.direction === 1 ? -1 : 1 } : { key, direction: key === 'name' ? 1 : -1 })
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(vi ? 'vi-VN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const sortProps = (id: SortKey) => ({ id, sort, onSort: toggleSort })

  return <div className="ld-dev-page">
    <PageHeader title={copy('Employees', 'Nhân viên')} icon={<Users size={26} />}
      description={copy('Monitor each employee’s target role, competency gaps, assessment outcomes and learning progress. Select a row for the full development profile.',
        'Theo dõi vị trí mục tiêu, khoảng trống năng lực, kết quả đánh giá và tiến độ học của từng nhân viên. Chọn một dòng để xem hồ sơ phát triển đầy đủ.')}
      actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw className={report.isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} />} disabled={report.isFetching} onClick={() => void report.refetch()}>{copy('Refresh', 'Làm mới')}</Button>} />

    <DevelopmentFilterBar employees={all} filters={filters} onChange={update} onReset={reset} active={active} copy={copy} />
    <div className="ld-status-chips" role="group" aria-label={copy('Development status', 'Trạng thái phát triển')}>
      <button type="button" className="ld-chip" aria-pressed={!filters.status} onClick={() => update({ status: '' })}>{copy('All', 'Tất cả')}<strong>{withoutStatus.length}</strong></button>
      {DEVELOPMENT_STATUSES.map(status => <button key={status} type="button" className="ld-chip" style={{ '--chip': `var(${statusTone[status]})` } as React.CSSProperties}
        aria-pressed={filters.status === status} onClick={() => update({ status: filters.status === status ? '' : status })}>
        <i aria-hidden="true" />{statusLabels[status][vi ? 1 : 0]}<strong>{withoutStatus.filter(employee => developmentStatus(employee) === status).length}</strong></button>)}
    </div>

    {report.isPending ? <div className="ld-table-card p-4 space-y-3" aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="ld-skeleton h-12" />)}</div>
      : report.isError ? <EmptyState icon={<AlertTriangle />} title={copy('Employees could not be loaded', 'Chưa tải được danh sách nhân viên')} description={developmentErrorMessage(report.error, copy)}
        action={<Button variant="outline" onClick={() => void report.refetch()}>{copy('Retry', 'Thử lại')}</Button>} />
      : !filtered.length ? <EmptyState icon={<Users />} title={all.length ? copy('No employees match these filters', 'Không có nhân viên phù hợp bộ lọc') : copy('No employees yet', 'Chưa có nhân viên')}
        description={all.length ? copy('Adjust the search, department, job position or status filters.', 'Điều chỉnh từ khóa, phòng ban, vị trí hoặc trạng thái.') : copy('Employees appear once members with the Employee role are added.', 'Nhân viên xuất hiện khi có thành viên vai trò Employee.')}
        action={active ? <Button variant="outline" onClick={reset}>{copy('Reset filters', 'Xóa bộ lọc')}</Button> : undefined} />
      : <div className="ld-table-card">
        <div className="ld-table-scroll"><table className="ld-table" aria-label={copy('Employee development list', 'Danh sách phát triển nhân viên')}>
          <thead><tr>
            <SortHeader {...sortProps('name')}>{copy('Employee · Department · Position', 'Nhân viên · Phòng ban · Vị trí')}</SortHeader>
            <th>{copy('Target role', 'Vị trí mục tiêu')}</th>
            <th>{copy('Status', 'Trạng thái')}</th>
            <SortHeader {...sortProps('progress')}>{copy('Pathway progress', 'Tiến độ lộ trình')}</SortHeader>
            <SortHeader {...sortProps('passRate')}>{copy('Outcomes', 'Kết quả')}</SortHeader>
            <SortHeader {...sortProps('activity')} className="ld-col-activity">{copy('Last activity', 'Hoạt động gần nhất')}</SortHeader>
            <th aria-label={copy('Open', 'Mở')} />
          </tr></thead>
          <tbody>{visible.map((employee, index) => {
            const status = developmentStatus(employee), progress = pathwayProgress(employee), passRate = assessmentPassRate(employee), p = employee.pathway
            return <tr key={employee.accountId} tabIndex={0} style={{ '--i': index } as React.CSSProperties} data-testid="ld-employee-row" onClick={() => open(employee)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(employee) } }} aria-label={copy('Open development profile of ', 'Mở hồ sơ phát triển của ') + employee.fullName}>
              <td className="ld-col-person"><div className="ld-person"><span className="ld-avatar" style={{ '--avatar': `var(${statusTone[status]})` } as React.CSSProperties} aria-hidden="true">{initials(employee.fullName)}</span>
                <div className="min-w-0"><div className="ld-person-name" title={employee.email ?? undefined}>{employee.fullName}{!employee.active && <span className="ld-muted font-normal"> · {copy('Inactive', 'Ngưng hoạt động')}</span>}</div>
                  <div className="ld-person-meta">{employee.departmentName ?? copy('No department', 'Chưa có phòng ban')} · {employee.jobPositionName ?? copy('No job position', 'Chưa có vị trí')}</div></div></div></td>
              <td className="ld-col-target" data-label={copy('Target role', 'Vị trí mục tiêu')}>{employee.target || p ? <div className="min-w-0"><div className="truncate font-medium" title={employee.target?.roleName ?? p?.roleName ?? undefined}>{employee.target?.roleName ?? p?.roleName}</div><div className="ld-person-meta">{employee.target?.levelName ?? p?.levelName ?? copy('Level not chosen', 'Chưa chọn cấp độ')}</div></div> : <span className="ld-muted">—</span>}</td>
              <td data-label={copy('Status', 'Trạng thái')}><StatusBadge status={status} vi={vi} /></td>
              <td data-label={copy('Pathway progress', 'Tiến độ lộ trình')}>{p ? <div className="ld-progress-cell"><div><Progress value={progress ?? 0} variant={status === 'at_risk' ? 'destructive' : 'success'} aria-label={copy('Pathway progress', 'Tiến độ lộ trình')} /></div>
                <span className="ld-num">{progress === null ? '—' : progress + '%'}</span></div> : <span className="ld-muted">{copy('No pathway', 'Chưa có lộ trình')}</span>}
                {p && <div className="ld-person-meta">{p.fulfilledSteps}/{p.requiredSteps - p.bypassedSteps} {copy('steps', 'bước')}{p.bypassedSteps ? ` · ${p.bypassedSteps} ${copy('waived', 'miễn')}` : ''}</div>}</td>
              <td data-label={copy('Outcomes', 'Kết quả')}>{employee.assessments.finalized ? <span className="ld-num">{passRate === null ? '—' : passRate + '%'} <span className="ld-muted font-normal">{copy('passed', 'đạt')}</span></span>
                : <span className="ld-muted">{employee.assessments.inProgress ? copy('Assessing', 'Đang làm') : copy('No assessment', 'Chưa đánh giá')}</span>}
                <div className="ld-person-meta">{employee.evidence.achievedLevels} {copy('levels achieved', 'cấp độ đạt')}{employee.evidence.needReview > 0 ? ` · ${employee.evidence.needReview} ${copy('need review', 'cần ôn lại')}` : ''}</div></td>
              <td className="ld-col-activity whitespace-nowrap" data-label={copy('Last activity', 'Hoạt động gần nhất')}>{date(employee.lastActivityAt)}</td>
              <td className="ld-col-open"><ChevronRight className="size-4 text-muted-foreground" /></td>
            </tr>
          })}</tbody>
        </table></div>
        <div className="border-t border-border px-4 py-3"><Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} showItemRange
          itemLabel={copy('employees', 'nhân viên')} locale={vi ? 'vi' : 'en'} /></div>
      </div>}
    {report.data && <Text variant="caption">{copy('Data is read directly from pathways, assessments and official evidence; nothing is estimated.', 'Dữ liệu đọc trực tiếp từ lộ trình, đánh giá và minh chứng chính thức; không có giá trị ước tính.')}</Text>}
  </div>
}
