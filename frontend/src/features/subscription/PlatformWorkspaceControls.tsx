import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'
import { Building, CreditCard, Eye, Mail, Phone, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { Pagination } from '../../shared/components/ui/Pagination'
import { StatCard } from '../../shared/components/ui/StatCard'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { useTranslation } from "../../shared/i18n/LanguageContext";
import { getIdentity, getWorkspaces, request, type Workspace } from './subscriptionApi'
import { Failure, Loading, StateLabel } from "./SubscriptionFeedback";
import { useCopy } from "./SubscriptionFeedback.helpers";

type Administrator = Workspace['administrators'][number]

function systemAdministrator(workspace: Workspace): Administrator | null {
  return workspace.administrators.find(admin => admin.systemAdministrator) ?? workspace.administrators[0] ?? null
}

function ProfileItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-caption text-muted-foreground">{label}</dt>
    <dd className="break-words text-body-sm font-medium text-foreground">{children}</dd>
  </div>
}

export function PlatformWorkspaceControls({ principal }: { principal: string }) {
  const c = useCopy()
  const { language } = useTranslation()
  const cache = useQueryClient()
  const [selection, setSelection] = useState<{ workspace: Workspace; suspended: boolean } | null>(null)
  const [details, setDetails] = useState<Workspace | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [page, setPage] = useState(1)
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
  function confirm(workspace: Workspace) {
    suspension.reset()
    setDetails(null)
    setSelection({ workspace, suspended: workspace.status !== 'SUSPENDED' })
  }
  const date = (value: string) => new Intl.DateTimeFormat(c('en-GB', 'vi-VN'), {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
  const day = (value: string) => new Intl.DateTimeFormat(c('en-GB', 'vi-VN'), {
    dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
  const regions = useMemo(() => {
    try { return new Intl.DisplayNames([language], { type: 'region' }) } catch { return null }
  }, [language])
  const country = (code: string) => { try { return regions?.of(code) ?? code } catch { return code } }
  const industryLabels: Record<string, string> = {
    'Software Engineering & AI': c('Software & artificial intelligence', 'Phần mềm & trí tuệ nhân tạo'),
    'Cloud Infrastructure & DevOps': c('Cloud & DevOps', 'Điện toán đám mây & DevOps'),
    'Data Engineering & Analytics': c('Data & analytics', 'Dữ liệu & phân tích'),
    'Cybersecurity & Network Systems': c('Cybersecurity & networks', 'An ninh mạng & hệ thống mạng'),
    'Enterprise Financial Technology': c('Financial technology', 'Công nghệ tài chính'),
  }
  const industry = (value: string) => industryLabels[value] ?? value
  const headcount = (value: string) => c(value, value.replace('employees', 'nhân viên'))
  const notProvided = c('Not provided', 'Chưa cung cấp')
  const workspacePath = (slug: string) => `/workspace/${slug}`
  const rows = workspaces.data ?? []
  const query = search.trim().toLocaleLowerCase()
  const filtered = rows.filter(workspace => (status === 'ALL' || workspace.status === status) &&
    [workspace.name, workspace.organizationId, workspace.workspaceSlug ?? '',
      ...workspace.administrators.flatMap(admin => [admin.fullName ?? '', admin.email, admin.phone ?? ''])]
      .some(value => value.toLocaleLowerCase().includes(query)))
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const accessBadge = (workspace: Workspace) =>
    <Badge variant={workspace.status === 'SUSPENDED' ? 'destructive' : 'success'}><StateLabel value={workspace.status} /></Badge>
  const setupBadge = (workspace: Workspace) =>
    <Badge variant={workspace.setupState === 'READY' ? 'success' : workspace.setupState === 'FAILED' ? 'destructive' : 'warning'}>
      <StateLabel value={workspace.setupState} />
    </Badge>
  const adminState = (admin: Administrator) => admin.active && admin.accountActive
    ? <Badge variant="secondary">{c('Active administrator', 'Quản trị viên đang hoạt động')}</Badge>
    : <Badge variant="outline">{c('Inactive administrator', 'Quản trị viên không hoạt động')}</Badge>
  const phoneLine = (admin: Administrator) => <p className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
    <Phone size={13} aria-hidden="true" className="shrink-0" />
    <span className="sr-only">{c('Phone', 'Số điện thoại')}: </span>
    {admin.phone ? <span className="break-all font-medium text-foreground">{admin.phone}</span> : <span className="italic">{notProvided}</span>}
  </p>
  return <section className="min-w-0 space-y-6">
    <PageHeader forceShowTitle title={c('Organizations', 'Tổ chức')}
      description={c('Review each organization profile and its System Administrator. Workspace access and subscription coverage are managed separately.',
        'Xem hồ sơ tổ chức và Quản trị viên hệ thống của từng tổ chức. Quyền truy cập không gian và hiệu lực gói đăng ký được quản lý riêng.')} />
    {workspaces.isSuccess && <div role="region" aria-label={c('Organization overview', 'Tổng quan tổ chức')}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title={c('Provisioned organizations', 'Tổ chức đã được cấp không gian')} value={rows.length}
        icon={<Building size={18} aria-hidden="true" />} />
      <StatCard title={c('Active workspace access', 'Không gian đang mở truy cập')} value={rows.filter(row => row.status === 'ACTIVE').length}
        icon={<ShieldCheck size={18} aria-hidden="true" />} />
      <StatCard title={c('Suspended workspace access', 'Không gian bị tạm ngưng')} value={rows.filter(row => row.status === 'SUSPENDED').length}
        icon={<ShieldAlert size={18} aria-hidden="true" />} />
      <StatCard title={c('Active subscriptions', 'Gói đăng ký đang hiệu lực')} value={rows.filter(row => row.subscription.status === 'ACTIVE').length}
        icon={<CreditCard size={18} aria-hidden="true" />} />
    </div>}
    {workspaces.isPending ? <Loading /> : workspaces.isError ? <Failure error={workspaces.error} retry={() => { void workspaces.refetch() }} /> :
      <Card className="min-w-0 border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
              <Input type="search" aria-label={c('Search organizations', 'Tìm kiếm tổ chức')}
                placeholder={c('Search organization, workspace URL, administrator or phone…', 'Tìm tổ chức, đường dẫn không gian, quản trị viên hoặc số điện thoại…')}
                className="pl-9" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
            </div>
            <div role="group" aria-label={c('Filter by workspace access', 'Lọc theo truy cập không gian')}
              className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map(value => <Button key={value} size="sm"
                variant={status === value ? 'secondary' : 'ghost'} aria-pressed={status === value}
                onClick={() => { setStatus(value); setPage(1) }}>
                {value === 'ALL' ? c('All organizations', 'Tất cả tổ chức') :
                  value === 'ACTIVE' ? c('Active', 'Đang hoạt động') : c('Suspended', 'Tạm ngưng')}
              </Button>)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? <Text className="px-4 py-12 text-center text-muted-foreground">
            {rows.length === 0 ? c('No provisioned workspaces.', 'Chưa có không gian được cấp.') :
              c('No organizations match your search or filter.', 'Không có tổ chức phù hợp với tìm kiếm hoặc bộ lọc.')}
          </Text> : <div role="region" aria-label={c('Organization directory', 'Danh sách tổ chức')} tabIndex={0}
            className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <table className="w-full min-w-[1040px] table-fixed text-left text-body-sm">
              <caption className="sr-only">{c('Provisioned organizations', 'Tổ chức đã được cấp không gian')}</caption>
              <thead className="border-b border-border bg-muted/40 text-caption text-muted-foreground">
                <tr>
                  <th scope="col" className="w-[27%] px-4 py-3">{c('Organization', 'Tổ chức')}</th>
                  <th scope="col" className="w-[25%] px-4 py-3">{c('System Administrator', 'Quản trị viên hệ thống')}</th>
                  <th scope="col" className="w-[21%] px-4 py-3">{c('Subscription & period', 'Gói đăng ký & kỳ hạn')}</th>
                  <th scope="col" className="px-4 py-3">{c('Workspace status', 'Trạng thái không gian')}</th>
                  <th scope="col" className="w-44 px-4 py-3 text-right">{c('Actions', 'Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">{visible.map(workspace => {
                const admin = systemAdministrator(workspace)
                const others = workspace.administrators.length - (admin ? 1 : 0)
                const meta = [workspace.industry && industry(workspace.industry), workspace.country && country(workspace.country)]
                  .filter(Boolean).join(' · ')
                return <tr key={workspace.organizationId} aria-label={workspace.name} className="align-top transition-colors hover:bg-muted/20">
                  <th scope="row" className="px-4 py-4 font-normal">
                    <div className="flex min-w-0 gap-3">
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-body-sm font-bold text-primary">
                        {workspace.name.trim().charAt(0).toLocaleUpperCase() || '?'}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <Text className="break-words font-semibold">{workspace.name}</Text>
                        {workspace.workspaceSlug && <Text variant="caption" className="break-all font-mono text-primary">
                          {workspacePath(workspace.workspaceSlug)}
                        </Text>}
                        <Text variant="caption" className="break-words text-muted-foreground">
                          {meta || c('Profile details not provided', 'Chưa cung cấp thông tin hồ sơ')}
                        </Text>
                        {workspace.createdAt && <Text variant="caption" className="text-muted-foreground">
                          {c('Created', 'Tạo ngày')} <time dateTime={workspace.createdAt}>{day(workspace.createdAt)}</time>
                        </Text>}
                      </div>
                    </div>
                  </th>
                  <td className="px-4 py-4">
                    {admin === null ? <Text variant="body-sm" className="text-muted-foreground">
                      {c('No administrator assigned.', 'Chưa có quản trị viên được chỉ định.')}
                    </Text> : <div className="min-w-0 space-y-1">
                      <Text variant="body-sm" className="break-words font-medium">{admin.fullName ?? c('Name unavailable', 'Chưa có tên')}</Text>
                      <p className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                        <Mail size={13} aria-hidden="true" className="shrink-0" /><span className="break-all">{admin.email}</span>
                      </p>
                      {admin.systemAdministrator && phoneLine(admin)}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {admin.systemAdministrator && <Badge variant="primary">{c('System Administrator', 'Quản trị viên hệ thống')}</Badge>}
                        {adminState(admin)}
                      </div>
                      {others > 0 && <Text variant="caption" className="pt-1 text-muted-foreground">
                        {c(`+${others} more administrator${others > 1 ? 's' : ''}`, `+${others} quản trị viên khác`)}
                      </Text>}
                    </div>}
                  </td>
                  <td className="space-y-1.5 px-4 py-4">
                    <Badge variant={workspace.subscription.status === 'ACTIVE' ? 'success' : 'outline'}>
                      <StateLabel value={workspace.subscription.status} />
                    </Badge>
                    {workspace.subscription.current ? <>
                      <Text variant="body-sm" className="break-words font-semibold">{workspace.subscription.current.name}</Text>
                      <p className="text-caption text-muted-foreground">
                        <time dateTime={workspace.subscription.current.startsAt}>{date(workspace.subscription.current.startsAt)}</time>
                        {' – '}<time dateTime={workspace.subscription.current.endsAt}>{date(workspace.subscription.current.endsAt)}</time>
                      </p>
                    </> : <Text variant="body-sm" className="text-muted-foreground">
                      {c('No current subscription period.', 'Không có kỳ đăng ký đang hiệu lực.')}
                    </Text>}
                  </td>
                  <td className="space-y-2 px-4 py-4">
                    <div className="space-y-1">
                      <Text variant="caption" className="text-muted-foreground">{c('Workspace access', 'Truy cập không gian')}</Text>
                      {accessBadge(workspace)}
                    </div>
                    <div className="space-y-1">
                      <Text variant="caption" className="text-muted-foreground">{c('Workspace setup', 'Thiết lập không gian')}</Text>
                      {setupBadge(workspace)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setDetails(workspace)}>
                        <Eye size={14} aria-hidden="true" />{c('View details', 'Xem chi tiết')}
                      </Button>
                      <Button size="sm" variant="outline" disabled={suspension.isPending} onClick={() => confirm(workspace)}>
                        {workspace.status === 'SUSPENDED' ? c('Reactivate', 'Kích hoạt lại') : c('Suspend workspace', 'Tạm ngưng không gian')}
                      </Button>
                    </div>
                  </td>
                </tr>
              })}</tbody>
            </table>
          </div>}
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize}
            onPageChange={setPage} locale={language} itemLabel={c('organizations', 'tổ chức')} />
        </CardContent>
      </Card>}
    <Dialog open={details !== null} onOpenChange={open => { if (!open) setDetails(null) }} className="max-w-3xl"
      ariaLabel={c('Organization details', 'Chi tiết tổ chức')} closeLabel={c('Close dialog', 'Đóng hộp thoại')}>
      {details && <>
        <DialogHeader>
          <DialogTitle className="break-words">{details.name}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
            {accessBadge(details)}{setupBadge(details)}
            {details.workspaceSlug && <span className="break-all font-mono text-caption text-primary">{workspacePath(details.workspaceSlug)}</span>}
          </div>
        </DialogHeader>
        <DialogBody className="space-y-6 pr-1">
          <section aria-labelledby="org-profile-heading" className="space-y-3">
            <Heading level={3} size="card" id="org-profile-heading">{c('Organization profile', 'Hồ sơ tổ chức')}</Heading>
            <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
              <ProfileItem label={c('Organization ID', 'Mã tổ chức')}><span className="break-all font-mono text-caption">{details.organizationId}</span></ProfileItem>
              <ProfileItem label={c('Workspace URL', 'Đường dẫn không gian')}>
                {details.workspaceSlug ? <span className="break-all font-mono">{workspacePath(details.workspaceSlug)}</span> : notProvided}
              </ProfileItem>
              <ProfileItem label={c('Industry', 'Lĩnh vực')}>{details.industry ? industry(details.industry) : notProvided}</ProfileItem>
              <ProfileItem label={c('Company size', 'Quy mô')}>{details.headcount ? headcount(details.headcount) : notProvided}</ProfileItem>
              <ProfileItem label={c('Country', 'Quốc gia')}>{details.country ? country(details.country) : notProvided}</ProfileItem>
              <ProfileItem label={c('Created', 'Ngày tạo')}>
                {details.createdAt ? <time dateTime={details.createdAt}>{date(details.createdAt)}</time> : notProvided}
              </ProfileItem>
            </dl>
          </section>
          <section aria-labelledby="org-admins-heading" className="space-y-3">
            <Heading level={3} size="card" id="org-admins-heading">{c('Administrators', 'Quản trị viên')}</Heading>
            {details.administrators.length === 0 ? <Text variant="body-sm" className="text-muted-foreground">
              {c('No administrator assigned.', 'Chưa có quản trị viên được chỉ định.')}
            </Text> : <ul className="divide-y divide-border rounded-xl border border-border">
              {details.administrators.map(admin => <li key={admin.accountId} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Text variant="body-sm" className="break-words font-semibold">{admin.fullName ?? c('Name unavailable', 'Chưa có tên')}</Text>
                  <p className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                    <Mail size={13} aria-hidden="true" className="shrink-0" /><span className="break-all">{admin.email}</span>
                  </p>
                  {admin.systemAdministrator && phoneLine(admin)}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {admin.systemAdministrator && <Badge variant="primary">{c('System Administrator', 'Quản trị viên hệ thống')}</Badge>}
                  {adminState(admin)}
                </div>
              </li>)}
            </ul>}
          </section>
          <section aria-labelledby="org-subscription-heading" className="space-y-3">
            <Heading level={3} size="card" id="org-subscription-heading">{c('Subscription', 'Gói đăng ký')}</Heading>
            <div className="space-y-1.5 rounded-xl border border-border p-4">
              <Badge variant={details.subscription.status === 'ACTIVE' ? 'success' : 'outline'}><StateLabel value={details.subscription.status} /></Badge>
              {details.subscription.current ? <>
                <Text variant="body-sm" className="font-semibold">{details.subscription.current.name}</Text>
                <Text variant="caption" className="text-muted-foreground">{c('Current period (Vietnam time)', 'Kỳ hiện tại (giờ Việt Nam)')}</Text>
                <p className="text-caption">
                  <time dateTime={details.subscription.current.startsAt}>{date(details.subscription.current.startsAt)}</time>
                  {' – '}<time dateTime={details.subscription.current.endsAt}>{date(details.subscription.current.endsAt)}</time>
                </p>
              </> : <Text variant="body-sm" className="text-muted-foreground">{c('No current subscription period.', 'Không có kỳ đăng ký đang hiệu lực.')}</Text>}
            </div>
          </section>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetails(null)}>{c('Close', 'Đóng')}</Button>
          <Button variant={details.status === 'SUSPENDED' ? 'primary' : 'destructive'} disabled={suspension.isPending} onClick={() => confirm(details)}>
            {details.status === 'SUSPENDED' ? c('Reactivate', 'Kích hoạt lại') : c('Suspend workspace', 'Tạm ngưng không gian')}
          </Button>
        </DialogFooter>
      </>}
    </Dialog>
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
  const cache = useQueryClient()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const principal = identity.data?.accountId
  if (principal && identity.data?.stage === 'COMPLETE' && identity.data.roles.includes('PLATFORM_ADMINISTRATOR')) {
    return <WorkspaceLayout identity={{
      accountId: principal, fullName: identity.data.fullName, email: identity.data.email,
      organizationId: identity.data.organizationId, organizationName: null,
      workspaceSlug: identity.data.workspaceSlug, roles: identity.data.roles,
    }} onSignOut={async () => { await request('/api/v1/workspace-auth/sign-out', 'POST'); cache.clear() }}>
      <PlatformWorkspaceControls principal={principal} />
    </WorkspaceLayout>
  }
  return <SubscriptionShell title={c('Workspace administration', 'Quản trị không gian')} onSignOut={() => request('/api/v1/workspace-auth/sign-out', 'POST')}>
    {identity.isPending ? <Loading /> : identity.isError ? <Failure error={identity.error} /> :
        <Failure error={new Error(c('Platform Administrator authentication is required.', 'Cần xác thực Quản trị viên nền tảng.'))} />}
  </SubscriptionShell>
}
