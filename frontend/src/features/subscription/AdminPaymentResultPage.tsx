import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminPageLayout } from '../administration/AdminPageLayout'
import { getIdentity, getStatus } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { PaymentStatusPanel } from './PaymentStatusPanel'
import { buttonVariants } from '../../shared/components/ui/Button'

export function AdminPaymentResultPage() {
  const c = useCopy()
  const [search] = useSearchParams()
  const orderId = search.get('order')
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const owner = identity.data
  const eligible = !!owner?.accountId && !!owner.organizationId && owner.stage === 'COMPLETE'
    && owner.roles.includes('ORGANIZATION_ADMINISTRATOR')
  const base = `/api/v1/organizations/${owner?.organizationId}/subscription`
  const status = useQuery({ queryKey: ['payment-result', owner?.accountId, owner?.organizationId, orderId],
    queryFn: () => getStatus(base, orderId ?? undefined), enabled: eligible && !!orderId, refetchInterval: 3000 })
  if (identity.isPending) return <Loading />
  if (identity.isError) return <Failure error={identity.error} />
  if (!eligible || !owner?.accountId) return <div className="mx-auto max-w-xl space-y-4 p-6">
    <Failure error={new Error(c('Sign in as the organization administrator to view this payment.', 'Đăng nhập bằng tài khoản quản trị tổ chức để xem thanh toán.'))} />
    <Link className={buttonVariants()} to="/login">{c('Sign in', 'Đăng nhập')}</Link>
  </div>
  return <AdminPageLayout identity={owner} title={c('Payment details', 'Chi tiết thanh toán')}
    description={c('Your order, verified payment and subscription activation.', 'Đơn hàng, thanh toán đã xác minh và trạng thái kích hoạt gói.')}
    actions={<Link className={buttonVariants({ variant: 'outline' })} to="/admin/subscription">{c('Back to subscription', 'Về gói đăng ký')}</Link>}>
    {!orderId ? <Failure error={new Error(c('This link is missing an order number.', 'Liên kết thiếu mã đơn hàng.'))} />
      : status.isPending ? <Loading /> : status.isError ? <Failure error={status.error} retry={() => void status.refetch()} />
        : <PaymentStatusPanel status={status.data} guest={false} principal={owner.accountId} base={base} refresh={() => void status.refetch()} />}
  </AdminPageLayout>
}
