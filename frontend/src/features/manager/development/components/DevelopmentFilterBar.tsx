import { Building2, BriefcaseBusiness, RotateCcw, Search } from 'lucide-react'
import { Button } from '../../../../shared/components/ui/Button'
import { Combobox } from '../../../../shared/components/ui/Combobox'
import { Input } from '../../../../shared/components/ui/Input'
import type { DevelopmentEmployee } from '../developmentApi'
import { filterOptions, type DevelopmentFilters } from '../developmentMetrics'

export function DevelopmentFilterBar({ employees, filters, onChange, onReset, active, copy, search = true, children }: {
  employees: DevelopmentEmployee[]; filters: DevelopmentFilters; onChange: (patch: Partial<DevelopmentFilters>) => void; onReset: () => void
  active: boolean; copy: (en: string, vi: string) => string; search?: boolean; children?: React.ReactNode
}) {
  const unassigned = copy('Unassigned', 'Chưa gán')
  const departments = filterOptions(employees, 'department', unassigned)
  // Job positions are narrowed by the selected department so every option still has matches.
  const positions = filterOptions(filters.department ? employees.filter(employee => (employee.departmentId ?? '__none__') === filters.department) : employees, 'jobPosition', unassigned)
  return <div className="ld-toolbar" role="search" aria-label={copy('Filter employees', 'Lọc nhân viên')}>
    {search && <div className="ld-toolbar-search"><Input leftIcon={<Search className="size-4" />} value={filters.search} onChange={event => onChange({ search: event.target.value })}
      placeholder={copy('Search name, email or target role…', 'Tìm tên, email hoặc vị trí mục tiêu…')} aria-label={copy('Search employees', 'Tìm nhân viên')} /></div>}
    <div className="ld-toolbar-select flex items-center gap-2"><Building2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <Combobox className="flex-1" clearable aria-label={copy('Department', 'Phòng ban')} placeholder={copy('All departments', 'Tất cả phòng ban')}
        searchPlaceholder={copy('Search departments…', 'Tìm phòng ban…')} emptyMessage={copy('No departments', 'Không có phòng ban')}
        options={departments.map(option => ({ value: option.value, label: option.label, description: `${option.count} ${copy('employees', 'nhân viên')}` }))}
        value={filters.department} onChange={value => onChange({ department: value, jobPosition: '' })} /></div>
    <div className="ld-toolbar-select flex items-center gap-2"><BriefcaseBusiness className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <Combobox className="flex-1" clearable aria-label={copy('Job position', 'Vị trí công việc')} placeholder={copy('All job positions', 'Tất cả vị trí')}
        searchPlaceholder={copy('Search job positions…', 'Tìm vị trí…')} emptyMessage={copy('No job positions', 'Không có vị trí')}
        options={positions.map(option => ({ value: option.value, label: option.label, description: `${option.count} ${copy('employees', 'nhân viên')}` }))}
        value={filters.jobPosition} onChange={value => onChange({ jobPosition: value })} /></div>
    {children}
    {active && <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-3.5" />} onClick={onReset}>{copy('Reset filters', 'Xóa bộ lọc')}</Button>}
  </div>
}
