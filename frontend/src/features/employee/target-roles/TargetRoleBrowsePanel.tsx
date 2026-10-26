import * as React from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Award,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { cn } from '../../../shared/lib/utils'
import { TargetRoleApiError } from './targetRoleApi'
import { TargetRoleDetailDialog } from './TargetRoleDetailDialog'
import { useTargetRoles } from './targetRoleQueries'
import { prepareChooseTargetRoleCommand, TargetRoleSelectionApiError } from './targetRoleSelectionApi'
import {
  useChooseTargetRoleMutation,
  useTargetRoleSelection,
} from './targetRoleSelectionQueries'
import {
  TargetRoleSelectionDialog,
  type PendingTargetRoleChoice,
  type TargetRoleChoice,
} from './TargetRoleSelectionDialog'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import type { Seniority, TargetRoleSummary } from './targetRoleTypes'

const SENIORITY_OPTIONS: Seniority[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'M3', 'M4']
const PAGE_SIZE = 12

const ROLE_RECOMMENDATIONS: Record<string, { score: number; reason: string }> = {
  'TR-001': { score: 94, reason: 'High match with Investigative RIASEC profile and Knowledge Graph baseline.' },
  'AI Knowledge Architect': { score: 94, reason: 'High match with Investigative RIASEC profile and Knowledge Graph baseline.' },
  'TR-002': { score: 88, reason: 'Strong machine learning aptitude and software engineering baseline.' },
  'Senior Machine Learning Engineer': { score: 88, reason: 'Strong machine learning aptitude and software engineering baseline.' },
  'TR-003': { score: 85, reason: 'Balanced graph visualization and API architecture aptitude.' },
  'Full-Stack Knowledge Engineer': { score: 85, reason: 'Balanced graph visualization and API architecture aptitude.' },
  'TR-004': { score: 81, reason: 'Graph database modeling and ontology mapping profile.' },
  'TR-005': { score: 79, reason: 'Data science and analytical reasoning alignment.' },
}

function getRoleRecommendationScore(role: TargetRoleSummary): number {
  if (role.code && ROLE_RECOMMENDATIONS[role.code]) {
    return ROLE_RECOMMENDATIONS[role.code].score
  }
  for (const [key, val] of Object.entries(ROLE_RECOMMENDATIONS)) {
    if (role.name.toLowerCase().includes(key.toLowerCase())) {
      return val.score
    }
  }
  return role.track === 'PROFESSIONAL' ? 78 : 72
}

function getSearchFromLocation(): string {
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get('search') ?? ''
  } catch {
    return ''
  }
}

export function TargetRoleBrowsePanel() {
  const initialSearch = getSearchFromLocation()
  const [searchInput, setSearchInput] = React.useState(initialSearch)
  const [search, setSearch] = React.useState(initialSearch)
  const [seniority, setSeniority] = React.useState<Seniority | null>(null)
  const [sortBy, setSortBy] = React.useState<'recommendation' | 'alphabetical'>('recommendation')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [detailRoleId, setDetailRoleId] = React.useState<string | null>(null)
  const [pendingChoice, setPendingChoice] = React.useState<PendingTargetRoleChoice | null>(null)
  const pendingChoiceRef = React.useRef<PendingTargetRoleChoice | null>(null)
  const submissionInFlightRef = React.useRef(false)

  React.useEffect(() => {
    const handleLocationChange = () => {
      const q = getSearchFromLocation()
      setSearchInput(q)
      setSearch(q.trim())
      setCurrentPage(1)
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setCurrentPage(1)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const [statusFilter, setStatusFilter] = React.useState<'All' | 'Active' | 'Done'>('All')

  React.useEffect(() => {
    setCurrentPage(1)
  }, [seniority, statusFilter, sortBy])

  const roles = useTargetRoles({ search, seniority })
  const selection = useTargetRoleSelection()
  const chooseRole = useChooseTargetRoleMutation()
  const { selectTargetRole, profile } = useEmployeeLearningState()
  const hasFilters = search.length > 0 || seniority !== null || statusFilter !== 'All' || sortBy !== 'recommendation'
  const showToolbarClear = hasFilters
    && (roles.isPending || roles.isError || (roles.data?.length ?? 0) > 0)

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setSeniority(null)
    setStatusFilter('All')
    setSortBy('recommendation')
    setCurrentPage(1)
  }

  const filteredRoles = React.useMemo(() => {
    if (!roles.data) return []
    const map = new Map<string, TargetRoleSummary>()
    for (const r of roles.data) {
      const key = r.code || r.id
      if (!map.has(key)) {
        map.set(key, r)
      }
    }
    const deduplicated = Array.from(map.values())
    let result = deduplicated
    if (statusFilter !== 'All') {
      result = deduplicated.filter((role) => {
        const prevRoles = profile?.previousRoles || []
        const isDone = prevRoles.some(
          (pr) =>
            pr.status === 'completed' &&
            (pr.roleTitle.toLowerCase() === role.name.toLowerCase() ||
             (role.code && pr.roleKey.toLowerCase() === role.code.toLowerCase()))
        )
        const isActive = !isDone && (
          selection.data?.roleId === role.id ||
          Boolean(profile?.targetRole && profile.targetRole.toLowerCase() === role.name.toLowerCase())
        )
        if (statusFilter === 'Active') return isActive
        if (statusFilter === 'Done') return isDone
        return true
      })
    }

    const sorted = [...result]
    if (sortBy === 'recommendation') {
      sorted.sort((a, b) => getRoleRecommendationScore(b) - getRoleRecommendationScore(a))
    } else if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [roles.data, statusFilter, sortBy, selection.data?.roleId, profile?.targetRole, profile?.previousRoles])

  const totalItems = filteredRoles.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const paginatedRoles = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRoles.slice(start, start + PAGE_SIZE)
  }, [filteredRoles, currentPage])

  const catalogRef = React.useRef<HTMLElement | null>(null)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openConfirmation = (role: TargetRoleChoice) => {
    if (pendingChoiceRef.current || selection.isPending || selection.isError
      || chooseRole.isPending || selection.data?.roleId === role.id) return
    chooseRole.reset()
    const choice = {
      role,
      command: prepareChooseTargetRoleCommand({
        roleId: role.id,
        expectedCurrentSelectionId: selection.data?.selectionId ?? null,
      }),
    }
    pendingChoiceRef.current = choice
    setPendingChoice(choice)
  }

  const closeConfirmation = () => {
    if (chooseRole.isPending) return
    chooseRole.reset()
    pendingChoiceRef.current = null
    setPendingChoice(null)
  }

  const confirmSelection = () => {
    if (!pendingChoice || submissionInFlightRef.current || chooseRole.isPending) return
    submissionInFlightRef.current = true
    const chosenRole = pendingChoice.role
    chooseRole.mutate(pendingChoice.command, {
      onSuccess: () => {
        selectTargetRole(
          chosenRole.name,
          chosenRole.code,
          '2026-12-31',
          85,
          'Selected from catalog'
        )
        pendingChoiceRef.current = null
        setPendingChoice(null)
      },
      onError: (error) => {
        if (error instanceof TargetRoleSelectionApiError
          && (error.code === 'STALE_SELECTION' || error.code === 'SELECTION_STATE_CONFLICT')) {
          void selection.refetch()
        }
      },
      onSettled: () => {
        submissionInFlightRef.current = false
      },
    })
  }

  return (
    <section ref={catalogRef} className="space-y-4" aria-labelledby="target-role-catalog-heading">

      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-2xs md:flex-row md:items-center">
        <label className="relative flex-1" htmlFor="target-role-search">
          <span className="sr-only">Search target roles by name</span>
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="target-role-search"
            type="search"
            maxLength={100}
            placeholder="Search target roles by name..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </label>

        {/* Filter Controls Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort By Filter Pill */}
          <div
            className={cn(
              "relative h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none shrink-0",
              sortBy !== 'recommendation'
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
          >
            <ArrowUpDown size={13} className={sortBy !== 'recommendation' ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Sort:</span>
            <span className="font-semibold text-foreground">
              {sortBy === 'recommendation' ? 'Recommendation' : 'Alphabetical (A-Z)'}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
            <select
              aria-label="Sort target roles"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as 'recommendation' | 'alphabetical')
                setCurrentPage(1)
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="recommendation" className="bg-card text-foreground">Recommendation (Default)</option>
              <option value="alphabetical" className="bg-card text-foreground">Alphabetical (A-Z)</option>
            </select>
          </div>

          {/* Status Filter Pill */}
          <div
            className={cn(
              "relative h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none shrink-0",
              statusFilter !== 'All'
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
          >
            <Target size={13} className={statusFilter !== 'All' ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Status:</span>
            <span className="font-semibold text-foreground">
              {statusFilter === 'All' ? 'All' : statusFilter}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'All' | 'Active' | 'Done')}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="All" className="bg-card text-foreground">All</option>
              <option value="Active" className="bg-card text-foreground">Active</option>
              <option value="Done" className="bg-card text-foreground">Done</option>
            </select>
          </div>

          {/* Seniority Filter Pill */}
          <div
            className={cn(
              "relative h-9 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-all cursor-pointer shadow-2xs select-none shrink-0",
              seniority
                ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-border bg-background hover:bg-muted/60 text-foreground"
            )}
          >
            <Award size={13} className={seniority ? 'text-primary' : 'text-muted-foreground'} />
            <span className="text-muted-foreground font-normal">Seniority:</span>
            <span className="font-semibold text-foreground">
              {seniority ?? 'All levels'}
            </span>
            <ChevronDown size={13} className="text-muted-foreground ml-0.5 shrink-0" />
            <select
              aria-label="Filter by seniority"
              value={seniority ?? ''}
              onChange={(event) => setSeniority((event.target.value || null) as Seniority | null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              <option value="" className="bg-card text-foreground">All levels</option>
              {SENIORITY_OPTIONS.map((level) => (
                <option key={level} value={level} className="bg-card text-foreground">{level}</option>
              ))}
            </select>
          </div>

          {showToolbarClear && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 px-3 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>


      {roles.isPending ? (
        <div role="status" className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading target roles...
        </div>
      ) : roles.isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
          <AlertCircle size={28} className="mx-auto mb-2 text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Target-role catalog unavailable</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {roles.error instanceof TargetRoleApiError && roles.error.code === 'CATALOG_UNAVAILABLE'
              ? 'The catalog service is temporarily unavailable. Please retry.'
              : 'Target roles could not be loaded. Please retry the request.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void roles.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : filteredRoles.length === 0 ? (
        <EmptyState
          icon={<Target size={28} className="text-primary" />}
          title={hasFilters ? 'No matching roles' : 'No target roles available'}
          description={hasFilters
            ? 'No target roles match the current name and seniority filters.'
            : 'No roles are available. Please contact your Organization Administrator.'}
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedRoles.map((role) => {
              const isDone = (profile?.previousRoles || []).some(
                (pr) =>
                  pr.status === 'completed' &&
                  (pr.roleTitle.toLowerCase() === role.name.toLowerCase() ||
                   (role.code && pr.roleKey.toLowerCase() === role.code.toLowerCase()))
              )
              const isActive = !isDone && (
                selection.data?.roleId === role.id ||
                Boolean(profile?.targetRole && profile.targetRole.toLowerCase() === role.name.toLowerCase())
              )
              const recScore = getRoleRecommendationScore(role)
              return (
                <Card
                  key={role.id}
                  aria-label={`Target role ${role.name}`}
                  className={cn(
                    "flex flex-col justify-between hover:shadow-md transition-all duration-150 border-border bg-card group",
                    isActive && "border-primary/50 ring-1 ring-primary/20",
                    isDone && "border-success/30 bg-card hover:border-success/50"
                  )}
                >
                  <div className="p-5 space-y-2.5">
                    {/* Badges: Role Code and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[11px] font-semibold text-primary truncate max-w-[170px]">
                          {role.code}
                        </Badge>
                        {sortBy === 'recommendation' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Sparkles size={10} />
                            {recScore}% Match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isDone ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] whitespace-nowrap text-success border-success/30 bg-success/5 font-semibold gap-1"
                          >
                            <CheckCircle2 size={11} className="text-success shrink-0" />
                            <span>Done</span>
                          </Badge>
                        ) : isActive ? (
                          <Badge variant="success" className="text-[10px] whitespace-nowrap">
                            Active role
                          </Badge>
                        ) : null}
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono font-bold text-muted-foreground border-border bg-muted/40"
                          title="Junior · Middle · Senior tiers"
                        >
                          J · M · S
                        </Badge>
                      </div>
                    </div>

                    {/* Role Name (without code, matching skill item) */}
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                      {role.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {role.description || 'Target role defined for capability enhancement and career advancement.'}
                    </p>
                  </div>

                  {/* Card Footer matching skill item */}
                  <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Target size={13} className="text-muted-foreground" />
                      <span>{role.requirementCount} Micro-skills</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7.5 px-3"
                        onClick={() => setDetailRoleId(role.id)}
                      >
                        View details
                      </Button>
                      {isDone ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-xs h-7.5 px-3 bg-success/5 text-success border-success/30 cursor-default font-semibold opacity-95"
                          title="You have already completed this target role."
                        >
                          <CheckCircle2 size={12} className="mr-1 text-success shrink-0" />
                          <span>Done</span>
                        </Button>
                      ) : isActive ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="text-xs h-7.5 px-3 font-semibold"
                        >
                          Active
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selection.isPending || selection.isError || chooseRole.isPending}
                          className="text-xs h-7.5 px-3 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          onClick={() => openConfirmation(role)}
                        >
                          Choose
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              itemLabel="roles"
              className="rounded-xl border border-border"
            />
          )}
        </div>
      )}
      <TargetRoleDetailDialog
        roleId={detailRoleId}
        activeRoleId={selection.data?.roleId ?? null}
        isCompleted={(profile?.previousRoles || []).some((pr) => {
          if (!detailRoleId || !roles.data) return false
          const role = roles.data.find((r) => r.id === detailRoleId)
          if (!role) return false
          return (
            pr.status === 'completed' &&
            (pr.roleTitle.toLowerCase() === role.name.toLowerCase() ||
             (role.code && pr.roleKey.toLowerCase() === role.code.toLowerCase()))
          )
        })}
        selectionUnavailable={selection.isError || chooseRole.isPending}
        selectionPending={selection.isPending}
        onClose={() => setDetailRoleId(null)}
        onChoose={openConfirmation}
      />
      <TargetRoleSelectionDialog
        choice={pendingChoice}
        currentSelection={selection.data ?? null}
        error={chooseRole.error}
        isPending={chooseRole.isPending}
        onCancel={closeConfirmation}
        onConfirm={confirmSelection}
      />
    </section>
  )
}
