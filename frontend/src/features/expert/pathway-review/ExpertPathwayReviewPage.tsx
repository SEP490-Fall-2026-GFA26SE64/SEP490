import * as React from 'react'
import {
  CheckCircle2,
  Compass,
  Eye,
  MinusCircle,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getStoredPathways,
  type InitialPathwayItem,
} from './pathwayReviewStore'

export {
  AVAILABLE_CATALOG_MODULES,
  type InitialPathwayItem,
  type PathwayModuleItem,
} from './pathwayReviewStore'

export function ExpertPathwayReviewPage() {
  const navigate = useNavigate()

  const [pathwayList, setPathwayList] = React.useState<InitialPathwayItem[]>(() => getStoredPathways())

  // Listen to store updates
  React.useEffect(() => {
    const handleSync = () => {
      setPathwayList(getStoredPathways())
    }
    window.addEventListener('expert_pathway_list_updated', handleSync)
    return () => window.removeEventListener('expert_pathway_list_updated', handleSync)
  }, [])

  // Filters & Pagination
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Navigate to Dedicated Pathway Review Page
  const handleOpenPathwayReview = (pathway: InitialPathwayItem) => {
    navigate(`/expert/pathway-review/${pathway.id}`)
  }

  // Filter logic
  const filteredPathways = React.useMemo(() => {
    return pathwayList.filter((p) => {
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.employeeName.toLowerCase().includes(q) ||
        p.targetRoleTitle.toLowerCase().includes(q) ||
        p.targetRoleCode.toLowerCase().includes(q) ||
        p.occupationTitle.toLowerCase().includes(q) ||
        p.occupationCode.toLowerCase().includes(q) ||
        p.modules.some((m) => m.title.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [pathwayList, search, statusFilter])

  const paginatedPathways = filteredPathways.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Reset pagination on search/filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  // KPIs
  const pendingCount = pathwayList.filter((p) => p.status === 'PENDING_EXPERT_CONFIRMATION').length
  const approvedCount = pathwayList.filter((p) => p.status === 'APPROVED').length
  const totalExcludedCount = pathwayList.reduce((acc, p) => acc + p.excludedModules.length, 0)

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Compass className="h-4 w-4 text-warning" />}
            title="Awaiting Review"
            value={`${pendingCount} To Review`}
            valueClassName="text-warning"
            description="Initial pathways awaiting expert confirmation"
          />

          <StatCard
            variant="gradient"
            icon={<MinusCircle className="h-4 w-4 text-primary" />}
            title="Excluded Modules"
            value={`${totalExcludedCount} Excluded`}
            valueClassName="text-primary"
            description="Modules set aside across pathways"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Approved Pathways"
            value={`${approvedCount} Active`}
            valueClassName="text-success"
            description="Employees actively learning"
          />

          <StatCard
            variant="gradient"
            icon={<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
            title="Total In Queue"
            value={`${pathwayList.length} Total`}
            description="Assigned pathways across your domains"
          />
        </div>

        {/* Pathway Catalog & Review Queue */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary shrink-0" />
                  <span>Initial Learning Pathway Queue</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Review adaptive learning pathways tailored for employees, adjust recommended modules with parallel include/exclude tables, and approve personalized study plans.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
                <div className="relative w-56 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search employee, occupation, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by Status"
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="all">All Statuses ({pathwayList.length})</option>
                    <option value="PENDING_EXPERT_CONFIRMATION">Awaiting Review ({pendingCount})</option>
                    <option value="APPROVED">Approved ({approvedCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Employee &amp; Occupation</th>
                    <th className="py-2.5 px-3">Target Role</th>
                    <th className="py-2.5 px-3 text-center">Active / Excluded Modules</th>
                    <th className="py-2.5 px-3 text-center">Est. Duration</th>
                    <th className="py-2.5 px-3">Generated Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPathways.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        {pathwayList.length === 0 ? (
                          <EmptyState
                            bordered={false}
                            icon={<CheckCircle2 className="h-6 w-6 text-success" />}
                            title="All Pathways Processed"
                            description="All learning pathways have been reviewed and approved. New pathways will appear here when team members enroll in target roles."
                          />
                        ) : (
                          <EmptyState
                            bordered={false}
                            icon={<Compass className="h-6 w-6 text-muted-foreground" />}
                            title="No Pathways Match Filters"
                            description="No learning pathways match your current search query or filter selection."
                            action={
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearch('')
                                  setStatusFilter('all')
                                }}
                              >
                                Clear Active Filters
                              </Button>
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedPathways.map((pathway) => {
                      const totalHours = pathway.modules.reduce((acc, m) => acc + m.estimatedHours, 0)
                      return (
                        <tr key={pathway.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground text-xs">{pathway.employeeName}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">{pathway.occupationCode}</span>
                              <span>{pathway.occupationTitle}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground text-xs">{pathway.targetRoleTitle}</div>
                            <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{pathway.targetRoleCode}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="font-semibold text-foreground text-xs">
                              {pathway.modules.length} active
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {pathway.excludedModules.length > 0 ? (
                                <span className="text-destructive font-medium">({pathway.excludedModules.length} excluded)</span>
                              ) : (
                                <span>(0 excluded)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-foreground text-xs">
                            {totalHours} hrs
                          </td>
                          <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                            {pathway.generatedAt}
                          </td>
                          <td className="py-3 px-3">
                            {pathway.status === 'APPROVED' ? (
                              <Badge variant="success">APPROVED</Badge>
                            ) : (
                              <Badge variant="warning">AWAITING REVIEW</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs font-semibold"
                              onClick={() => handleOpenPathwayReview(pathway)}
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span>{pathway.status === 'APPROVED' ? 'Inspect' : 'Review'}</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredPathways.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredPathways.length / pageSize) || 1}
                totalItems={filteredPathways.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="pathways"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </WorkspaceLayout>
  )
}
