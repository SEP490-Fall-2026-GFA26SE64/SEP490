import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { getIdentity, getSummary, request } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { singleWorkspaceRole } from '../../shared/auth/workspaceRole'
import { WorkspaceSessionContext } from '../../shared/auth/workspaceSession'

export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const path = useLocation().pathname
  const protectedPath = /^\/(admin|platform-admin|employee|expert|ld-manager|manager|profile)(\/|$)/.test(path)
  return protectedPath ? <Protected path={path}>{children}</Protected> : children
}
function Protected({ path, children }: { path: string; children: ReactNode }) {
  const c = useCopy()
  const cache = useQueryClient()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0, refetchInterval: 15000 })
  const billing = path === '/admin/subscription' || path.startsWith('/admin/subscription/') || path === '/admin/billing'
  const users = path === '/admin/users' || path === '/admin/user'
  const platform = path.startsWith('/platform-admin')
  const roles = identity.data?.roles ?? []
  const authenticated = identity.data?.stage === 'COMPLETE' && singleWorkspaceRole(roles) !== undefined
  const permitted = platform ? roles.includes('PLATFORM_ADMINISTRATOR') : path.startsWith('/admin') ? roles.includes('ORGANIZATION_ADMINISTRATOR') :
    path.startsWith('/employee') ? roles.includes('EMPLOYEE') : path.startsWith('/expert') ? roles.includes('DOMAIN_EXPERT') :
      /^\/(ld-manager|manager)/.test(path) ? roles.includes('LD_MANAGER') : true
  const access = useQuery({ queryKey: ['workspace-entitlement', identity.data?.accountId, identity.data?.organizationId, path],
    queryFn: () => request('/api/v1/subscription/access'), enabled: authenticated && permitted && !billing && !platform && !users,
    staleTime: 0, refetchInterval: 5000 })
  const memberAccess = useQuery({ queryKey: ['subscription-summary', identity.data?.accountId, identity.data?.organizationId],
    queryFn: () => {
      if (!identity.data?.organizationId) throw new Error('An authenticated organization is required.')
      return getSummary(identity.data.organizationId)
    }, enabled: authenticated && permitted && users, staleTime: 0, refetchInterval: 5000 })
  if (identity.isSuccess && authenticated && permitted && (billing || platform || (!users && access.isSuccess) ||
    (users && memberAccess.isSuccess && memberAccess.data.workspaceStatus !== 'SUSPENDED')) && identity.data) {
    return <WorkspaceSessionContext.Provider value={{
      identity: { fullName: identity.data.fullName, email: identity.data.email, organizationId: identity.data.organizationId,
        organizationName: memberAccess.data?.organizationName ?? null },
      onSignOut: async () => { await request('/api/v1/workspace-auth/sign-out', 'POST'); cache.clear() },
    }}><WorkspaceQueryScope key={`${identity.data.accountId}:${identity.data.organizationId}:${roles.join(',')}`}>{children}</WorkspaceQueryScope></WorkspaceSessionContext.Provider>
  }

  return <SubscriptionShell title={c('Workspace access', 'Truy cập không gian')}>
    {identity.isPending || (authenticated && permitted && (users ? memberAccess.isPending : access.isPending)) ? <Loading /> :
      identity.isError || access.isError || memberAccess.isError ? <Failure error={identity.error ?? access.error ?? memberAccess.error} /> :
        <p role="alert">{c('Your authenticated role cannot enter this workspace.', 'Vai trò xác thực của bạn không được vào không gian này.')}</p>}
    <Link className="text-primary underline" to="/login">{c('Sign in', 'Đăng nhập')}</Link>
    {roles.includes('ORGANIZATION_ADMINISTRATOR') && <Link className="ml-4 text-primary underline" to="/admin/subscription">{c('Subscription and recovery', 'Gói đăng ký và khôi phục')}</Link>}
  </SubscriptionShell>
}

// Stable component identity preserves forms/retry commands across entitlement polling.
function WorkspaceQueryScope({ children }: { children: ReactNode }) {
  const parent = useQueryClient()
  const [client] = useState(() => new QueryClient({ defaultOptions: parent.getDefaultOptions() }))
  useEffect(() => () => { void client.cancelQueries(); client.clear() }, [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
