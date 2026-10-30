import { useQuery } from '@tanstack/react-query'
import { getTargetRole, getTargetRoles } from './targetRoleApi'
import type { TargetRoleFilters } from './targetRoleTypes'

export const targetRoleQueryKeys = {
  all: ['employee-target-roles'] as const,
  list: (filters: TargetRoleFilters) => [
    ...targetRoleQueryKeys.all,
    'list',
    {
      search: filters.search?.trim() || null,
      seniority: filters.seniority ?? null,
    },
  ] as const,
  detail: (roleId: string) => [...targetRoleQueryKeys.all, 'detail', roleId] as const,
}

export function useTargetRoles(filters: TargetRoleFilters) {
  const normalizedFilters = {
    search: filters.search?.trim() || undefined,
    seniority: filters.seniority ?? undefined,
  }
  return useQuery({
    queryKey: targetRoleQueryKeys.list(normalizedFilters),
    queryFn: ({ signal }) => getTargetRoles(normalizedFilters, signal),
  })
}

export function useTargetRole(roleId: string | null) {
  const normalizedRoleId = roleId?.trim() ?? ''
  return useQuery({
    queryKey: targetRoleQueryKeys.detail(normalizedRoleId),
    queryFn: ({ signal }) => getTargetRole(normalizedRoleId, signal),
    enabled: normalizedRoleId.length > 0,
  })
}
