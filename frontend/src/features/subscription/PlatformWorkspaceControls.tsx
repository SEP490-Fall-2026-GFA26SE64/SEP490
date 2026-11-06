import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Card, CardContent } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { getIdentity, getWorkspaces, request, type Workspace } from './subscriptionApi'
import { Failure, Loading, StateLabel, useCopy } from './SubscriptionFeedback'

export function PlatformWorkspaceControls({ principal }: { principal: string }) {
  const c = useCopy()
  const cache = useQueryClient()
  const [selection, setSelection] = useState<{ workspace: Workspace; suspended: boolean } | null>(null)
  const workspaces = useQuery({ queryKey: ['platform-workspaces', principal], queryFn: getWorkspaces, staleTime: 0 })
  const suspension = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      request(`/api/v1/platform/workspaces/${id}/suspension`, 'PUT', { suspended }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['platform-workspaces'] })
      setSelection(null)
    },
  })
  function closeConfirmation(open: boolean) {
    if (!open && !suspension.isPending) {
      setSelection(null)
      suspension.reset()
    }
  }
  const date = (value: string) => new Intl.DateTimeFormat(c('en-GB', 'vi-VN'), {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
  return <section className="space-y-3">
    <div>
      <Heading level={2} size="section">{c('Provisioned organizations', 'Tổ chức đã được cấp không gian')}</Heading>
      <Text variant="body-sm" className="mt-1 text-muted-foreground">
        {c('Organization details are read-only. Workspace access and subscription coverage are separate.',
          'Thông tin tổ chức chỉ để xem. Quyền truy cập không gian và hiệu lực gói đăng ký được quản lý riêng.')}
      </Text>
    </div>
    {workspaces.isPending ? <Loading /> : workspaces.isError ? <Failure error={workspaces.error} retry={() => { void workspaces.refetch() }} /> :
      workspaces.data.length === 0 ? <Card><CardContent className="pt-5"><Text className="text-muted-foreground">
        {c('No provisioned workspaces.', 'Chưa có không gian được cấp.')}
      </Text></CardContent></Card> :
        <div className="grid gap-4 lg:grid-cols-2">{workspaces.data.map(workspace =>
          <Card key={workspace.organizationId} role="group" aria-label={workspace.name} className="min-w-0">
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Heading level={3} size="subsection" className="min-w-0 break-words">{workspace.name}</Heading>
                <Button variant="outline" disabled={suspension.isPending} onClick={() => {
                  suspension.reset()
                  setSelection({ workspace, suspended: workspace.status !== 'SUSPENDED' })
                }}>
                  {workspace.status === 'SUSPENDED' ? c('Reactivate', 'Kích hoạt lại') : c('Suspend workspace', 'Tạm ngưng không gian')}
                </Button>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="mb-1 text-caption text-muted-foreground">{c('Workspace access', 'Truy cập không gian')}</dt>
                  <dd><Badge variant={workspace.status === 'SUSPENDED' ? 'destructive' : 'success'}><StateLabel value={workspace.status} /></Badge></dd></div>
                <div><dt className="mb-1 text-caption text-muted-foreground">{c('Workspace setup', 'Thiết lập không gian')}</dt>
                  <dd><Badge variant={workspace.setupState === 'READY' ? 'success' : workspace.setupState === 'FAILED' ? 'destructive' : 'warning'}>
                    <StateLabel value={workspace.setupState} /></Badge></dd></div>
                <div className="col-span-2"><dt className="mb-1 text-caption text-muted-foreground">{c('Subscription status', 'Trạng thái gói đăng ký')}</dt>
                  <dd><Badge variant={workspace.subscription.status === 'ACTIVE' ? 'success' : 'outline'}>
                    <StateLabel value={workspace.subscription.status} /></Badge></dd></div>
                {workspace.subscription.current ? <>
                  <div className="col-span-2"><dt className="text-caption text-muted-foreground">{c('Current plan', 'Gói hiện tại')}</dt>
                    <dd className="font-semibold">{workspace.subscription.current.name}</dd></div>
                  <div className="col-span-2"><dt className="text-caption text-muted-foreground">{c('Current period (Vietnam time)', 'Kỳ hiện tại (giờ Việt Nam)')}</dt>
                    <dd className="text-body-sm">
                      <time dateTime={workspace.subscription.current.startsAt}>{date(workspace.subscription.current.startsAt)}</time>
                      {' – '}<time dateTime={workspace.subscription.current.endsAt}>{date(workspace.subscription.current.endsAt)}</time>
                    </dd></div>
                </> : <div className="col-span-2"><dt className="sr-only">{c('Current period', 'Kỳ hiện tại')}</dt><dd className="text-body-sm text-muted-foreground">
                  {c('No current subscription period.', 'Không có kỳ đăng ký đang hiệu lực.')}
                </dd></div>}
              </dl>
              <div className="border-t border-border pt-3">
                <Heading level={4} size="card" className="mb-2">{c('Organization administrators', 'Quản trị viên tổ chức')}</Heading>
                {workspace.administrators.length === 0 ? <Text variant="body-sm" className="text-muted-foreground">
                  {c('No administrator assigned.', 'Chưa có quản trị viên được chỉ định.')}
                </Text> : <ul className="space-y-2">{workspace.administrators.map(admin => <li key={admin.accountId} className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Text variant="body-sm" className="font-medium break-words">{admin.fullName ?? c('Name unavailable', 'Chưa có tên')}</Text>
                    <Text variant="caption" className="break-all text-muted-foreground">{admin.email}</Text>
                  </div>
                  <Badge variant={admin.active && admin.accountActive ? 'secondary' : 'outline'}>
                    {admin.active && admin.accountActive ? c('Active administrator', 'Quản trị viên đang hoạt động') : c('Inactive administrator', 'Quản trị viên không hoạt động')}
                  </Badge>
                </li>)}</ul>}
              </div>
            </CardContent>
          </Card>)}</div>}
    <Dialog open={selection !== null} onOpenChange={closeConfirmation}
      ariaLabel={selection?.suspended ? c('Confirm workspace suspension', 'Xác nhận tạm ngưng không gian') : c('Confirm workspace reactivation', 'Xác nhận kích hoạt lại không gian')}
      closeLabel={c('Close dialog', 'Đóng hộp thoại')}>
      <DialogHeader>
        <DialogTitle>{selection?.suspended ? c('Suspend workspace?', 'Tạm ngưng không gian?') : c('Reactivate workspace?', 'Kích hoạt lại không gian?')}</DialogTitle>
        <DialogDescription className="text-body-sm">
          <span className="block break-words font-semibold text-foreground">{selection?.workspace.name}</span>
          {selection?.suspended ? c('Workspace access will be blocked. Subscription periods will not change.',
            'Truy cập không gian sẽ bị chặn. Các kỳ đăng ký không thay đổi.') :
            c('Administrative suspension will be removed. Subscription and workspace readiness requirements still apply.',
              'Lệnh tạm ngưng sẽ được gỡ bỏ. Các điều kiện về gói đăng ký và thiết lập không gian vẫn áp dụng.')}
        </DialogDescription>
      </DialogHeader>
      {suspension.isError && <Failure error={suspension.error} />}
      <DialogFooter>
        <Button variant="outline" disabled={suspension.isPending} onClick={() => closeConfirmation(false)}>{c('Cancel', 'Hủy')}</Button>
        <Button variant={selection?.suspended ? 'destructive' : 'primary'} disabled={suspension.isPending || !selection}
          onClick={() => { if (selection) suspension.mutate({ id: selection.workspace.organizationId, suspended: selection.suspended }) }}>
          {suspension.isPending ? c('Saving…', 'Đang lưu…') : selection?.suspended ? c('Confirm suspension', 'Xác nhận tạm ngưng') : c('Confirm reactivation', 'Xác nhận kích hoạt lại')}
        </Button>
      </DialogFooter>
    </Dialog>
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
