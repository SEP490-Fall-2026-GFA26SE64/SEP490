import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readDevelopmentReport, readEmployeeDevelopment } from './developmentApi'
import { emptyFilters, type DevelopmentFilters } from './developmentMetrics'

const KEYS: (keyof DevelopmentFilters)[] = ['search', 'department', 'jobPosition', 'status']

/** Filters live in the URL so Dashboard drill-downs and the browser back button keep the same scope. */
export function useDevelopmentFilters() {
  const [params, setParams] = useSearchParams()
  const filters: DevelopmentFilters = { ...emptyFilters }
  KEYS.forEach(key => { filters[key] = params.get(key) ?? '' })
  const update = (patch: Partial<DevelopmentFilters>) => setParams(current => {
    const next = new URLSearchParams(current)
    Object.entries(patch).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
    next.delete('page')
    return next
  }, { replace: true })
  const reset = () => setParams(current => { const next = new URLSearchParams(current); KEYS.forEach(key => next.delete(key)); next.delete('page'); return next }, { replace: true })
  const active = KEYS.some(key => filters[key])
  return { filters, update, reset, active, params }
}

/** Organization and actor are part of every cache key; reports never leak across sessions. */
function useScope() {
  const identity = useContext(WorkspaceSessionContext)?.identity
  return { scope: [identity?.organizationId, identity?.accountId] as const, enabled: Boolean(identity?.organizationId && identity?.accountId && identity.roles?.includes('LD_MANAGER')) }
}
export function useDevelopmentReport() {
  const { scope, enabled } = useScope()
  return useQuery({ queryKey: ['ld-development-report', ...scope], queryFn: ({ signal }) => readDevelopmentReport(signal), enabled, retry: false, staleTime: 30_000 })
}
export function useEmployeeDevelopment(accountId: string | undefined) {
  const { scope, enabled } = useScope()
  return useQuery({ queryKey: ['ld-employee-development', ...scope, accountId], queryFn: ({ signal }) => readEmployeeDevelopment(accountId!, signal),
    enabled: enabled && Boolean(accountId), retry: false, staleTime: 30_000 })
}
