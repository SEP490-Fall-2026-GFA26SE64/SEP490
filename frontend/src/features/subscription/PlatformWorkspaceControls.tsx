import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { getIdentity, getWorkspaces, request } from './subscriptionApi'
import { Failure, Loading, StateLabel, useCopy } from './SubscriptionFeedback'

export function PlatformWorkspaceControls({ principal }: { principal: string }) {
  const c = useCopy()
  const cache = useQueryClient()
  const workspaces = useQuery({ queryKey: ['platform-workspaces', principal], queryFn: getWorkspaces })
  const suspension = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      request(`/api/v1/platform/workspaces/${id}/suspension`, 'PUT', { suspended }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['platform-workspaces'] }),
  })
  return <section className="space-y-3">
    <h2 className="text-section font-semibold">{c('Workspace access controls', 'Kiểm soát truy cập không gian')}</h2>
    {suspension.isError && <Failure error={suspension.error} />}
    {workspaces.isPending ? <Loading /> : workspaces.isError ? <Failure error={workspaces.error} /> :
      workspaces.data.length === 0 ? <p>{c('No provisioned workspaces.', 'Chưa có không gian được cấp.')}</p> :
        workspaces.data.map(workspace => <Card key={workspace.organizationId}><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div><p className="font-semibold">{workspace.name}</p><StateLabel value={workspace.status} /></div>
          <Button variant="outline" disabled={suspension.isPending} onClick={() => suspension.mutate({ id: workspace.organizationId, suspended: workspace.status !== 'SUSPENDED' })}>
            {workspace.status === 'SUSPENDED' ? c('Reactivate', 'Kích hoạt lại') : c('Suspend workspace', 'Tạm ngưng không gian')}
          </Button>
        </CardContent></Card>)}
  </section>
}

export function PlatformWorkspacePage() {
  const c = useCopy()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const principal = identity.data?.accountId
  return <SubscriptionShell title={c('Workspace administration', 'Quản trị không gian')} onSignOut={() => request('/api/v1/workspace-auth/sign-out', 'POST')}>
    {identity.isPending ? <Loading /> : identity.isError ? <Failure error={identity.error} /> :
      principal && identity.data?.stage === 'COMPLETE' && identity.data.roles.includes('PLATFORM_ADMINISTRATOR') ?
        <PlatformWorkspaceControls principal={principal} /> :
        <Failure error={new Error(c('Platform Administrator authentication is required.', 'Cần xác thực Quản trị viên nền tảng.'))} />}
  </SubscriptionShell>
}
