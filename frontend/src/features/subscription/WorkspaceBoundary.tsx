import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { buttonVariants } from '../../shared/components/ui/Button'
import { getIdentity, getSummary, request } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { ROLE_HOME, singleWorkspaceRole } from '../../shared/auth/workspaceRole'
import { WorkspaceSessionContext } from '../../shared/auth/workspaceSession'
import { isSharedPath, isTenantPath, isWorkspaceSlug, useWorkspaceSlug, workspaceUrl } from '../../shared/auth/workspacePaths'

/**
 * Routes organization pages through `/workspace/{slug}`: a member may only use their own slug, legacy paths are
 * redirected to it, and guest/platform pages are served outside any workspace.
 */
export function WorkspaceBoundary({ children }: { children: ReactNode }) {
  const slug = useWorkspaceSlug()
  const { pathname, search, hash } = useLocation()
  if (slug !== null) {
    if (pathname === '/' || isTenantPath(pathname) || isSharedPath(pathname)) return <Protected path={pathname} slug={slug}>{children}</Protected>
    return <LeaveWorkspace to={`${pathname}${search}${hash}`} />
  }
  if (isTenantPath(pathname)) return <LegacyWorkspaceRedirect target={`${pathname}${search}${hash}`} />
  if (/^\/platform-admin(\/|$)/.test(pathname)) return <Protected path={pathname} slug={null}>{children}</Protected>
  return children
}

function replaceLocation(to: string) {
  window.location.replace(to)
}

function LeaveWorkspace({ to }: { to: string }) {
  useEffect(() => { replaceLocation(to) }, [to])
  return <Loading />
}

function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(next)}`
}

function LegacyWorkspaceRedirect({ target }: { target: string }) {
  const c = useCopy()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const slug = identity.data?.stage === 'COMPLETE' ? identity.data.workspaceSlug : null
  const signedOut = identity.isSuccess && (!identity.data || identity.data.stage !== 'COMPLETE')
  useEffect(() => {
    if (isWorkspaceSlug(slug)) replaceLocation(workspaceUrl(slug, target))
    else if (signedOut) replaceLocation(loginPath(target))
  }, [slug, signedOut, target])
  if (identity.isError) return <SubscriptionShell title={c('Workspace access', 'Truy cập không gian')}><Failure error={identity.error} /></SubscriptionShell>
  if (identity.isSuccess && !signedOut && !isWorkspaceSlug(slug)) {
    return <SubscriptionShell title={c('Workspace access', 'Truy cập không gian')}>
      <p role="alert">{c('Your authenticated role cannot enter this workspace.', 'Vai trò xác thực của bạn không được vào không gian này.')}</p>
      <Link className="text-primary underline" to="/login">{c('Sign in', 'Đăng nhập')}</Link>
    </SubscriptionShell>
  }
  return <Loading />
}

function Protected({ path, slug, children }: { path: string; slug: string | null; children: ReactNode }) {
  const c = useCopy()
  const cache = useQueryClient()
  const { search, hash } = useLocation()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0, refetchInterval: 15000 })
  const billing = path === '/admin/subscription' || path.startsWith('/admin/subscription/') || path === '/admin/billing'
  const users = path === '/admin/users' || path === '/admin/user'
  const platform = slug === null && path.startsWith('/platform-admin')
  const roles = identity.data?.roles ?? []
  const role = singleWorkspaceRole(roles)
  const authenticated = identity.data?.stage === 'COMPLETE' && role !== undefined
  const signedOut = identity.isSuccess && (!identity.data || identity.data.stage !== 'COMPLETE')
  // Never request tenant data for a workspace the member does not belong to.
  const ownWorkspace = platform || (slug !== null && isWorkspaceSlug(slug) && identity.data?.workspaceSlug === slug)
  const permitted = platform ? roles.includes('PLATFORM_ADMINISTRATOR') : path.startsWith('/admin') ? roles.includes('ORGANIZATION_ADMINISTRATOR') :
    path.startsWith('/employee') ? roles.includes('EMPLOYEE') : path.startsWith('/expert') ? roles.includes('DOMAIN_EXPERT') :
      /^\/(ld-manager|manager)/.test(path) ? roles.includes('LD_MANAGER') : true
  const home = path === '/'
  const accessScope = path === '/ld-manager/approvals' ? '/ld-manager/modules' : path
  const gated = authenticated && ownWorkspace && permitted && !home
  const access = useQuery({ queryKey: ['workspace-entitlement', identity.data?.accountId, identity.data?.organizationId, accessScope],
    queryFn: () => request('/api/v1/subscription/access'), enabled: gated && !billing && !platform && !users,
    staleTime: 0, refetchInterval: 5000 })
  const memberAccess = useQuery({ queryKey: ['subscription-summary', identity.data?.accountId, identity.data?.organizationId],
    queryFn: () => {
      if (!identity.data?.organizationId) throw new Error('An authenticated organization is required.')
      return getSummary(identity.data.organizationId)
    }, enabled: gated && users, staleTime: 0, refetchInterval: 5000 })
  const returnTo = slug !== null && isWorkspaceSlug(slug) ? `${workspaceUrl(slug, path)}${search}${hash}` : `${path}${search}${hash}`
  useEffect(() => { if (signedOut) replaceLocation(loginPath(returnTo)) }, [signedOut, returnTo])

  if (signedOut) return <Loading />
  if (identity.isSuccess && authenticated && home && ownWorkspace && role) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }
  if (identity.isSuccess && authenticated && !ownWorkspace) {
    return <SubscriptionShell title={c('Workspace not found', 'Không tìm thấy không gian')}>
      <p role="alert">{c('This workspace does not exist or you do not have access to it.', 'Không gian này không tồn tại hoặc bạn không có quyền truy cập.')}</p>
      {isWorkspaceSlug(identity.data?.workspaceSlug) && role && role !== 'PLATFORM_ADMINISTRATOR'
        ? <a className={buttonVariants({ variant: 'primary' })} href={workspaceUrl(identity.data.workspaceSlug, ROLE_HOME[role])}>{c('Go to your workspace', 'Về không gian của bạn')}</a>
        : <a className={buttonVariants({ variant: 'primary' })} href="/login">{c('Sign in', 'Đăng nhập')}</a>}
    </SubscriptionShell>
  }
  if (identity.isSuccess && gated && (billing || platform || (!users && access.isSuccess) ||
    (users && memberAccess.isSuccess && memberAccess.data.workspaceStatus !== 'SUSPENDED')) && identity.data) {
    return <WorkspaceSessionContext.Provider value={{
      identity: { accountId: identity.data.accountId ?? null, fullName: identity.data.fullName, email: identity.data.email, organizationId: identity.data.organizationId, roles,
        organizationName: memberAccess.data?.organizationName ?? null, workspaceSlug: identity.data.workspaceSlug },
      onSignOut: async () => { await request('/api/v1/workspace-auth/sign-out', 'POST'); cache.clear() },
    }}><WorkspaceQueryScope key={`${identity.data.accountId}:${identity.data.organizationId}:${roles.join(',')}`}>{children}</WorkspaceQueryScope></WorkspaceSessionContext.Provider>
  }

  return <SubscriptionShell title={c('Workspace access', 'Truy cập không gian')}>
    {identity.isPending || (gated && (users ? memberAccess.isPending : access.isPending)) ? <Loading /> :
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
