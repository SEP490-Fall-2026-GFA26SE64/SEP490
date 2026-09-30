import * as React from 'react'
import { AlertCircle, Compass, RefreshCw, Search, Target } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { TargetRoleApiError } from './targetRoleApi'
import { TargetRoleDetailDialog } from './TargetRoleDetailDialog'
import { useTargetRoles } from './targetRoleQueries'
import type { Seniority } from './targetRoleTypes'

const SENIORITY_OPTIONS: Seniority[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'M3', 'M4']

export function TargetRoleBrowsePanel() {
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [seniority, setSeniority] = React.useState<Seniority | null>(null)
  const [detailRoleId, setDetailRoleId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const roles = useTargetRoles({ search, seniority })
  const hasFilters = search.length > 0 || seniority !== null
  const showToolbarClear = hasFilters
    && (roles.isPending || roles.isError || (roles.data?.length ?? 0) > 0)

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setSeniority(null)
  }

  return (
    <section className="space-y-4" aria-labelledby="target-role-catalog-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="target-role-catalog-heading" className="flex items-center gap-2 text-base font-bold text-foreground">
            <Compass size={18} className="text-primary" />
            Explore Target Roles
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Browse active roles and their required competency count for your organization.
          </p>
        </div>
        {!roles.isPending && !roles.isError && (
          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
            {roles.data.length} Roles in Catalog
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-2xs md:flex-row">
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
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Seniority
          <select
            value={seniority ?? ''}
            onChange={(event) => setSeniority((event.target.value || null) as Seniority | null)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All levels</option>
            {SENIORITY_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>

        {showToolbarClear && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
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
      ) : roles.data.length === 0 ? (
        <EmptyState
          icon={<Target size={28} className="text-primary" />}
          title={hasFilters ? 'No matching roles' : 'No target roles available'}
          description={hasFilters
            ? 'No target roles match the current name and seniority filters.'
            : 'No roles are available. Please contact your Organization Administrator.'}
          action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {roles.data.map((role) => (
            <Card key={role.id} className="border-border bg-card">
              <CardHeader className="space-y-2 border-b border-border/70 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" className="text-[10px] font-bold">{role.seniority}</Badge>
                  <Badge variant="outline" className="text-[10px]">{role.track}</Badge>
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">{role.name}</CardTitle>
                  <CardDescription className="mt-0.5 font-mono text-[11px]">{role.code}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs">
                <p className="line-clamp-3 leading-relaxed text-muted-foreground">
                  {role.description ?? 'No role description is currently available.'}
                </p>
                <div className="flex items-center justify-between border-t border-border/70 pt-3">
                  <span className="text-muted-foreground">Required micro-skills</span>
                  <span className="font-mono font-bold text-foreground">{role.requirementCount}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setDetailRoleId(role.id)}>
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <TargetRoleDetailDialog roleId={detailRoleId} onClose={() => setDetailRoleId(null)} />
    </section>
  )
}
