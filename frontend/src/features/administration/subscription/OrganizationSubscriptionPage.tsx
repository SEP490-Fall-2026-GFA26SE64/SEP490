import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CreditCard, Users } from 'lucide-react'
import { AdminPageLayout } from '../AdminPageLayout'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/Card'
import { Button, buttonVariants } from '../../../shared/components/ui/Button'
import { Badge } from '../../../shared/components/ui/Badge'
import { Heading } from '../../../shared/components/typography/Heading'
import { getIdentity, getStatus, getSummary, type Identity } from '../../subscription/subscriptionApi'
import { Failure, Loading, StateLabel, useCopy } from '../../subscription/SubscriptionFeedback'
import { PlanCatalog } from '../../subscription/PlanCatalog'
import { PaymentStatusPanel } from '../../subscription/PaymentStatusPanel'

const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

export function OrganizationSubscriptionPage() {
  const c = useCopy()
  const [search] = useSearchParams()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const returnedOrder = search.get('order')
  if (returnedOrder) return <Navigate to={`/admin/subscription/payment-result?order=${encodeURIComponent(returnedOrder)}`} replace />
  if (identity.isPending) return <Loading />
  if (identity.isError) return <Failure error={identity.error} />
  if (!identity.data?.accountId || !identity.data.organizationId || identity.data.stage !== 'COMPLETE' ||
    !identity.data.roles.includes('ORGANIZATION_ADMINISTRATOR')) {
    return <Failure error={new Error(c('System Administrator authentication is required.', 'Cần xác thực Quản trị hệ thống.'))} />
  }
  return <SubscriptionContent identity={identity.data} organization={identity.data.organizationId} principal={identity.data.accountId} />
}

function SubscriptionContent({ identity, organization, principal }: { identity: Identity; organization: string; principal: string }) {
  const c = useCopy()
  const base = `/api/v1/organizations/${organization}/subscription`
  const summary = useQuery({ queryKey: ['subscription-summary', principal, organization], queryFn: () => getSummary(organization), refetchInterval: 3000 })
  const order = useQuery({ queryKey: ['renewal-order', principal, organization], queryFn: () => getStatus(base), refetchInterval: 3000 })
  const [renew, setRenew] = useState(false)
  const value = summary.data
  const unresolved = !!order.data?.order && order.data.applicationState !== 'APPLIED'
  const canRenew = !!value && value.workspaceStatus !== 'SUSPENDED' && !value.scheduled && !unresolved && order.isSuccess
  const refresh = () => { void order.refetch(); void summary.refetch() }
  return <AdminPageLayout identity={identity} organizationName={value?.organizationName}
    title={c('Organization subscription', 'Gói đăng ký tổ chức')}
    description={c('Review your selected plan, subscription periods and billing history.', 'Xem gói đã chọn, kỳ đăng ký và lịch sử thanh toán.')}
    actions={<Link className={buttonVariants({ variant: 'outline' })} to="/admin/users">
      <Users size={16} className="mr-2" aria-hidden="true" />{c('Manage users', 'Quản lý người dùng')}
    </Link>}>
    {summary.isPending ? <Loading /> : summary.isError ? <Failure error={summary.error} retry={() => void summary.refetch()} /> : value && <>
      {value.workspaceStatus === 'SUSPENDED' && <div role="status" className="rounded-lg border border-destructive/30 bg-card p-4">
        <Badge variant="destructive" className="mb-2"><StateLabel value="SUSPENDED" /></Badge>
        <br />
        {c('Workspace suspended. Billing is available, but renewal and workspace access remain blocked.', 'Không gian bị tạm ngưng. Có thể xem thanh toán nhưng không thể gia hạn hoặc truy cập chức năng làm việc.')}
      </div>}
      {value.subscriptionStatus === 'EXPIRED' && <div role="status" className="rounded-lg border border-warning/40 bg-card p-4">
        {c('Your subscription period has ended. Renew to restore eligible access; manage seat reductions in User Accounts.', 'Kỳ đăng ký đã kết thúc. Gia hạn để khôi phục truy cập; giảm số ghế tại trang Người dùng.')}
      </div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="border-b border-border bg-secondary/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardDescription className="flex items-center gap-2"><CreditCard size={16} aria-hidden="true" />{c('Current plan', 'Gói hiện tại')}</CardDescription>
                <Heading level={2} size="section">{value.current?.terms.name ?? c('No active subscription period', 'Chưa có kỳ đăng ký đang hoạt động')}</Heading>
              </div>
              <Badge variant={value.subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'}><StateLabel value={value.subscriptionStatus} /></Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {value.current && <>
              <p className="text-muted-foreground">{value.current.terms.description}</p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Heading level={3} size="page">{value.current.terms.priceVnd.toLocaleString('vi-VN')} VND</Heading>
                <span className="text-body-sm text-muted-foreground">/ {value.current.terms.durationMonths} {c('calendar month(s)', 'tháng theo lịch')}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <h2 className="mb-2 flex items-center gap-2 font-semibold"><CalendarDays size={16} aria-hidden="true" />{c('Current subscription period', 'Kỳ đăng ký hiện tại')}</h2>
                <p className="text-body-sm">{date(value.current.startsAt)} → {date(value.current.endsAt)}</p>
                <p className="mt-2 text-caption text-muted-foreground">Asia/Ho_Chi_Minh · {c('Access ends at the exact end time. No grace period.', 'Truy cập kết thúc đúng hạn. Không có thời gian gia hạn miễn phí.')}</p>
              </div>
            </>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-caption text-muted-foreground">{c('Keep your team’s workspace available.', 'Duy trì không gian làm việc cho đội ngũ.')}</p>
              <Button disabled={!canRenew} onClick={() => setRenew(!renew)}>{c('Renew subscription', 'Gia hạn gói')}</Button>
            </div>
            {!canRenew && <p className="text-caption text-muted-foreground">{c('Renewal is unavailable while suspended, a future period is scheduled, or a payment is unresolved.', 'Không thể gia hạn khi tạm ngưng, đã có kỳ tiếp theo hoặc thanh toán chưa hoàn tất.')}</p>}
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard title={c('Used / allocated Employee seats', 'Chỗ Nhân viên đang dùng / được cấp')} value={`${value.usedSeats} / ${value.allocatedSeats}`}
            icon={<Users size={16} aria-hidden="true" />} description={c('Only active Employee accounts and memberships count. Manage people in User Accounts.', 'Chỉ tính tài khoản và membership Nhân viên đang hoạt động. Quản lý người dùng tại trang riêng.')} />
          <StatCard title={c('Admission limit', 'Giới hạn tiếp nhận')} value={value.admissionLimit}
            description={c('Includes pending and scheduled lower-seat commitments; it does not remove existing users.', 'Bao gồm cam kết giảm chỗ đang chờ hoặc đã đặt lịch; không tự xóa người dùng.')} />
        </div>
      </div>
      {value.scheduled && <Card><CardHeader><CardTitle>{c('Scheduled subscription period', 'Kỳ đăng ký tiếp theo')}</CardTitle></CardHeader>
        <CardContent><p className="font-semibold">{value.scheduled.terms.name} · {value.scheduled.terms.employeeSeats} {c('Employee seats', 'chỗ Nhân viên')}</p>
          <p className="mt-2 text-body-sm">{date(value.scheduled.startsAt)} → {date(value.scheduled.endsAt)} (Asia/Ho_Chi_Minh)</p></CardContent></Card>}
      {renew && canRenew && <PlanCatalog base={base} principal={principal} onCreated={() => { setRenew(false); refresh() }} />}
      {order.isError && <Failure error={order.error} retry={() => void order.refetch()} />}
      {order.data?.order && <section aria-label={c('Latest payment', 'Thanh toán mới nhất')} className="space-y-3">
        <h2 className="text-section font-semibold">{c('Latest payment', 'Thanh toán mới nhất')}</h2>
        <PaymentStatusPanel status={order.data} guest={false} principal={principal} base={base} refresh={refresh} />
      </section>}
      <Card>
        <CardHeader><CardTitle>{c('Payment history', 'Lịch sử thanh toán')}</CardTitle>
          <CardDescription>{c('Recorded orders, including pending and unsuccessful outcomes. Order totals are not proof of received funds.', 'Các đơn đã ghi nhận, gồm đang chờ và chưa thành công. Tổng đơn không phải bằng chứng đã nhận tiền.')}</CardDescription></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" role="region" aria-label={c('Payment history', 'Lịch sử thanh toán')} tabIndex={0}>
            <table className="w-full min-w-[640px] text-left text-body-sm">
              <thead className="border-y border-border bg-muted/50 text-muted-foreground"><tr>
                <th className="p-4">{c('Plan / order', 'Gói / đơn')}</th><th className="p-4">{c('Created', 'Đã tạo')}</th>
                <th className="p-4">{c('Order total', 'Tổng đơn')}</th><th className="p-4">{c('Verified received', 'Đã nhận xác minh')}</th><th className="p-4">{c('Status', 'Trạng thái')}</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {value.paymentHistory.map(item => <tr key={item.orderId} className="transition-colors hover:bg-muted/30">
                  <td className="p-4"><Link to={`/admin/subscription/payment-result?order=${item.orderId}`} className="font-semibold text-primary underline-offset-4 hover:underline">{item.terms.name}</Link><p className="mt-1 font-mono text-caption text-muted-foreground">#{item.providerOrderCode}</p></td>
                  <td className="p-4">{date(item.createdAt)}</td><td className="p-4 whitespace-nowrap">{item.terms.priceVnd.toLocaleString('vi-VN')} VND</td>
                  <td className="p-4 whitespace-nowrap">{item.observedPaidAmount === null ? c('Not yet known', 'Chưa xác định') : `${item.observedPaidAmount.toLocaleString('vi-VN')} VND`}</td>
                  <td className="p-4"><Badge variant={item.paymentStatus === 'PAID' ? 'success' : item.paymentStatus === 'EXCEPTION' ? 'destructive' : 'warning'}><StateLabel value={item.paymentStatus} /></Badge></td>
                </tr>)}
                {value.paymentHistory.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{c('No payment records.', 'Chưa có thanh toán.')}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>}
  </AdminPageLayout>
}
