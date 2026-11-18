import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarClock,
  CreditCard,
  MailWarning,
  Network,
  Target,
  UserPlus,
  Users,
} from 'lucide-react'
import { AdminPageLayout } from '../AdminPageLayout'
import { Badge } from '../../../shared/components/ui/Badge'
import { buttonVariants } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { fetchDepartments } from '../../../shared/api/departmentApi'
import { fetchJobPositions } from '../../../shared/api/jobPositionApi'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { cn } from '../../../shared/lib/utils'
import { getIdentity, getMembers, getPendingActivations, getSummary, type Identity } from '../../subscription/subscriptionApi'
import { Failure, Loading, StateLabel } from '../../subscription/SubscriptionFeedback'
import { useCopy } from '../../subscription/SubscriptionFeedback.helpers'
import {
  DASHBOARD_ROLES,
  actionItems,
  memberStats,
  membersByDepartment,
  publishedTargetRoleCount,
  seatStatus,
  subscriptionStatus,
  type AlertLevel,
} from './adminDashboardMetrics'

type Copy = ReturnType<typeof useCopy>

const ROLE_LABELS: Record<string, [string, string]> = {
  ORGANIZATION_ADMINISTRATOR: ['Administrators', 'Quản trị viên'],
  LD_MANAGER: ['L&D Managers', 'Quản lý L&D'],
  DOMAIN_EXPERT: ['Experts', 'Chuyên gia'],
  EMPLOYEE: ['Employees', 'Nhân viên'],
}

const LEVEL_TEXT: Record<AlertLevel, string> = { ok: 'text-foreground', warning: 'text-warning', critical: 'text-destructive' }

async function fetchTargetRoleStatuses(organization: string): Promise<string[]> {
  const response = await workspaceFetch(`/api/v1/organizations/${encodeURIComponent(organization)}/target-roles`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Failed to fetch target roles: ${response.status}`)
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('Invalid target role response.')
  return data.map(role => String((role as { status?: unknown })?.status ?? '').toUpperCase())
}

export function AdminDashboardPage() {
  const c = useCopy()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  if (identity.isPending) return <Loading fullscreen />
  if (identity.isError) return <Failure error={identity.error} />
  if (!identity.data?.accountId || !identity.data.organizationId || identity.data.stage !== 'COMPLETE' ||
    !identity.data.roles.includes('ORGANIZATION_ADMINISTRATOR')) {
    return <Failure error={new Error(c('System Administrator authentication is required.', 'Cần xác thực Quản trị hệ thống.'))} />
  }
  return <Dashboard identity={identity.data} organization={identity.data.organizationId} principal={identity.data.accountId} />
}

function Dashboard({ identity, organization, principal }: { identity: Identity; organization: string; principal: string }) {
  const c = useCopy()
  const summary = useQuery({ queryKey: ['subscription-summary', principal, organization], queryFn: () => getSummary(organization), refetchInterval: 30000 })
  const members = useQuery({ queryKey: ['subscription-members', principal, organization], queryFn: () => getMembers(organization) })
  const invitations = useQuery({ queryKey: ['member-activations', principal, organization], queryFn: () => getPendingActivations(organization) })
  const departments = useQuery({ queryKey: ['admin-dashboard-departments', organization], queryFn: () => fetchDepartments(organization) })
  const jobPositions = useQuery({ queryKey: ['admin-dashboard-job-positions', organization], queryFn: () => fetchJobPositions(organization) })
  const targetRoles = useQuery({ queryKey: ['admin-dashboard-target-roles', organization], queryFn: () => fetchTargetRoleStatuses(organization) })

  const stats = members.data ? memberStats(members.data) : null
  const seats = summary.data ? seatStatus(summary.data) : null
  const plan = summary.data ? subscriptionStatus(summary.data) : null
  const items = members.data && invitations.data ? actionItems(members.data, invitations.data) : null
  const publishedRoles = targetRoles.data ? publishedTargetRoleCount(targetRoles.data) : 0

  return (
    <AdminPageLayout
      identity={identity}
      organizationName={summary.data?.organizationName}
      title={c('Dashboard', 'Bảng điều khiển')}
      description={c('Health of your organization workspace: members, seats, subscription and pending work.',
        'Tình trạng không gian tổ chức: thành viên, số chỗ, gói đăng ký và việc cần xử lý.')}
      actions={
        <Link to="/admin/users" className={buttonVariants({ size: 'sm' })}>
          <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
          {c('Invite users', 'Mời người dùng')}
        </Link>
      }
    >
      <SubscriptionAlerts c={c} seatsLevel={seats?.level} planLevel={plan?.level} daysRemaining={plan?.daysRemaining ?? null}
        subscriptionState={summary.data?.subscriptionStatus} />

      <section aria-label={c('Key metrics', 'Chỉ số chính')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QueryStat query={members} c={c} testId="kpi-members" icon={<Users className="h-4 w-4" />} title={c('Active members', 'Thành viên hoạt động')}
          value={stats ? String(stats.active) : ''}
          description={stats ? c(`${stats.inactive} inactive · ${stats.total} total`, `${stats.inactive} vô hiệu hóa · tổng ${stats.total}`) : ''} />
        <QueryStat query={summary} c={c} testId="kpi-seats" icon={<Users className="h-4 w-4" />} title={c('Employee seats', 'Chỗ nhân viên')}
          value={seats ? `${seats.used} / ${seats.allocated}` : ''} valueClassName={seats ? LEVEL_TEXT[seats.level] : undefined}
          description={seats?.percent != null ? c(`${seats.percent}% of purchased seats in use`, `Đã dùng ${seats.percent}% số chỗ đã mua`)
            : c('No seats purchased', 'Chưa mua chỗ nào')} />
        <QueryStat query={summary} c={c} testId="kpi-subscription" icon={<CreditCard className="h-4 w-4" />} title={c('Subscription', 'Gói đăng ký')}
          value={plan?.planName ?? c('None', 'Không có')} valueClassName={plan ? LEVEL_TEXT[plan.level] : undefined}
          description={plan?.daysRemaining != null
            ? plan.daysRemaining > 0
              ? c(`${plan.daysRemaining} days remaining · ends ${formatDate(plan.endsAt)}`, `Còn ${plan.daysRemaining} ngày · kết thúc ${formatDate(plan.endsAt)}`)
              : c(`Ended ${formatDate(plan.endsAt)}`, `Đã kết thúc ${formatDate(plan.endsAt)}`)
            : summary.data ? <StateLabel value={summary.data.subscriptionStatus} /> : ''} />
        <QueryStat query={targetRoles} c={c} testId="kpi-target-roles" icon={<Target className="h-4 w-4" />} title={c('Published target roles', 'Target role đã publish')}
          value={String(publishedRoles)}
          description={c(`${targetRoles.data?.length ?? 0} target roles in total`, `Tổng ${targetRoles.data?.length ?? 0} target role`)} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card data-testid="dashboard-attention">
          <CardHeader className="pb-3">
            <CardTitle className="text-[length:var(--text-card)]">{c('Needs attention', 'Cần xử lý')}</CardTitle>
            <CardDescription>{c('Invitations and employee assignments to follow up.', 'Lời mời và phân công nhân viên cần theo dõi.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryBody queries={[members, invitations]} c={c}>
              {items && (
                <ul className="divide-y divide-border">
                  <AttentionRow to="/admin/users" icon={<MailWarning className="h-4 w-4" />} count={items.pendingInvitations}
                    label={c('Invitations awaiting activation', 'Lời mời chờ kích hoạt')} />
                  <AttentionRow to="/admin/users" icon={<AlertTriangle className="h-4 w-4" />} count={items.failedDeliveries} alert
                    label={c('Invitation emails failed', 'Gửi email mời thất bại')} />
                  <AttentionRow to="/admin/users" icon={<CalendarClock className="h-4 w-4" />} count={items.expiredInvitations} alert
                    label={c('Expired invitations to resend', 'Lời mời hết hạn cần gửi lại')} />
                  <AttentionRow to="/admin/users" icon={<Briefcase className="h-4 w-4" />} count={items.employeesMissingAssignment} alert
                    label={c('Employees missing department, job position or target role', 'Nhân viên thiếu phòng ban, vị trí hoặc target role')} />
                </ul>
              )}
            </QueryBody>
          </CardContent>
        </Card>

        <Card data-testid="dashboard-roles">
          <CardHeader className="pb-3">
            <CardTitle className="text-[length:var(--text-card)]">{c('Members by role', 'Thành viên theo vai trò')}</CardTitle>
            <CardDescription>{c('Active memberships only.', 'Chỉ tính thành viên đang hoạt động.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryBody queries={[members]} c={c}>
              {stats && (stats.active === 0
                ? <EmptyText>{c('No active members yet.', 'Chưa có thành viên hoạt động.')}</EmptyText>
                : <ul className="space-y-3">
                  {DASHBOARD_ROLES.map(role => (
                    <DistributionRow key={role} label={c(...ROLE_LABELS[role])} count={stats.byRole[role]} total={stats.active} />
                  ))}
                </ul>)}
            </QueryBody>
          </CardContent>
        </Card>

        <Card data-testid="dashboard-structure">
          <CardHeader className="pb-3">
            <CardTitle className="text-[length:var(--text-card)]">{c('Organization structure', 'Cơ cấu tổ chức')}</CardTitle>
            <CardDescription>{c('Departments, job positions and member distribution.', 'Phòng ban, vị trí công việc và phân bổ nhân sự.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric testId="structure-departments" query={departments} c={c} label={c('Departments', 'Phòng ban')} value={departments.data?.length} />
              <MiniMetric testId="structure-job-positions" query={jobPositions} c={c} label={c('Job positions', 'Vị trí công việc')} value={jobPositions.data?.length} />
            </div>
            <QueryBody queries={[members]} c={c}>
              {members.data && (() => {
                const rows = membersByDepartment(members.data)
                const total = rows.reduce((sum, row) => sum + row.count, 0)
                return rows.length === 0
                  ? <EmptyText>{c('No active members yet.', 'Chưa có thành viên hoạt động.')}</EmptyText>
                  : <ul className="space-y-3">
                    {rows.slice(0, 6).map(row => (
                      <DistributionRow key={row.name ?? '__none'} label={row.name ?? c('No department', 'Chưa có phòng ban')} count={row.count} total={total} />
                    ))}
                  </ul>
              })()}
            </QueryBody>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[length:var(--text-card)]">{c('Quick links', 'Lối tắt')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/admin/users" icon={<Users className="h-4 w-4" />} label={c('User accounts', 'Tài khoản người dùng')} />
          <QuickLink to="/admin/departments" icon={<Building2 className="h-4 w-4" />} label={c('Departments', 'Phòng ban')} />
          <QuickLink to="/admin/subscription" icon={<CreditCard className="h-4 w-4" />} label={c('Subscription', 'Gói đăng ký')} />
          <QuickLink to="/admin/knowledge-graph" icon={<Network className="h-4 w-4" />} label={c('Knowledge graph', 'Đồ thị tri thức')} />
        </CardContent>
      </Card>
    </AdminPageLayout>
  )
}

function SubscriptionAlerts({ c, seatsLevel, planLevel, daysRemaining, subscriptionState }: {
  c: Copy; seatsLevel?: AlertLevel; planLevel?: AlertLevel; daysRemaining: number | null; subscriptionState?: string
}) {
  const alerts: { level: AlertLevel; text: string }[] = []
  if (planLevel === 'critical') {
    alerts.push({ level: 'critical', text: subscriptionState === 'ACTIVE' && daysRemaining !== null
      ? c('The subscription period has ended. Renew to keep the workspace available.', 'Kỳ đăng ký đã kết thúc. Hãy gia hạn để tiếp tục sử dụng.')
      : c('The organization has no active subscription.', 'Tổ chức chưa có gói đăng ký đang hoạt động.') })
  } else if (planLevel === 'warning') {
    alerts.push({ level: 'warning', text: c(`The subscription ends in ${daysRemaining} days and no renewal is scheduled.`,
      `Gói đăng ký kết thúc sau ${daysRemaining} ngày và chưa có kỳ gia hạn.`) })
  }
  if (seatsLevel === 'critical') alerts.push({ level: 'critical', text: c('All employee seats are in use. New employees cannot be admitted.', 'Đã dùng hết chỗ nhân viên. Không thể thêm nhân viên mới.') })
  else if (seatsLevel === 'warning') alerts.push({ level: 'warning', text: c('Employee seats are at least 90% used.', 'Đã dùng từ 90% số chỗ nhân viên.') })
  if (alerts.length === 0) return null
  return (
    <div className="space-y-2" data-testid="dashboard-alerts">
      {alerts.map(alert => (
        <div key={alert.text} role="status" className={cn('flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-[length:var(--text-body-sm)]',
          alert.level === 'critical' ? 'border-destructive/40' : 'border-warning/50')}>
          <span className="flex items-center gap-2">
            <AlertTriangle className={cn('h-4 w-4 shrink-0', alert.level === 'critical' ? 'text-destructive' : 'text-warning')} aria-hidden />
            {alert.text}
          </span>
          <Link to="/admin/subscription" className={buttonVariants({ variant: 'outline', size: 'sm' })}>{c('Manage subscription', 'Quản lý gói')}</Link>
        </div>
      ))}
    </div>
  )
}

function QueryStat({ query, c, testId, ...props }: {
  query: UseQueryResult<unknown>; c: Copy; testId: string; icon: ReactNode; title: string; value: ReactNode; description: ReactNode; valueClassName?: string
}) {
  if (query.isPending) return <StatCard data-testid={testId} variant="gradient" icon={props.icon} title={props.title} value={<span className="text-muted-foreground">…</span>} />
  if (query.isError) {
    return <StatCard data-testid={testId} variant="gradient" icon={props.icon} title={props.title} value={<span className="text-destructive">—</span>}
      description={<button type="button" className="text-primary underline" onClick={() => void query.refetch()}>{c('Failed to load. Retry', 'Không tải được. Thử lại')}</button>} />
  }
  return <StatCard data-testid={testId} variant="gradient" {...props} />
}

function QueryBody({ queries, c, children }: { queries: UseQueryResult<unknown>[]; c: Copy; children: ReactNode }) {
  const failed = queries.find(query => query.isError)
  if (failed) return <Failure error={failed.error} retry={() => queries.forEach(query => void query.refetch())} />
  if (queries.some(query => query.isPending)) return <Loading label={c('Loading…', 'Đang tải…')} />
  return <>{children}</>
}

function MiniMetric({ query, c, label, value, testId }: { query: UseQueryResult<unknown>; c: Copy; label: string; value?: number; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="text-[length:var(--text-subsection)] font-semibold text-foreground">
        {query.isPending ? '…' : query.isError
          ? <button type="button" className="text-[length:var(--text-body-sm)] text-destructive underline" onClick={() => void query.refetch()}>{c('Retry', 'Thử lại')}</button>
          : value ?? 0}
      </p>
    </div>
  )
}

function AttentionRow({ to, icon, label, count, alert = false }: { to: string; icon: ReactNode; label: string; count: number; alert?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 py-2.5 text-[length:var(--text-body-sm)] text-foreground hover:text-primary">
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </span>
        <Badge variant={count === 0 ? 'outline' : alert ? 'warning' : 'secondary'}>{count}</Badge>
      </Link>
    </li>
  )
}

function DistributionRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-[length:var(--text-body-sm)]">
        <span className="truncate text-foreground">{label}</span>
        <span className="font-semibold text-foreground">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted" aria-hidden>
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </li>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[length:var(--text-body-sm)] font-medium text-foreground hover:border-primary hover:bg-secondary">
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  )
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-[length:var(--text-body-sm)] text-muted-foreground">{children}</p>
}

function formatDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}
