import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { GuestLayout } from '../guest/GuestLayout'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { getRegistration } from '../guest/registrationApi'
import { getStatus, request } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { PlanCatalog } from './PlanCatalog'
import { PaymentStatusPanel } from './PaymentStatusPanel'

export function GuestSubscriptionPage({ mode }: { mode: 'plans' | 'status' | 'result' }) {
  const c = useCopy()
  const [search] = useSearchParams()
  const registration = useQuery({ queryKey: ['registration-subscription-owner'], queryFn: () => getRegistration(), staleTime: 0 })
  const principal = registration.data?.registrationId
  const base = '/api/v1/registration/subscription'
  const order = useQuery({ queryKey: ['purchase-status', principal, search.get('order')],
    queryFn: () => getStatus(base, search.get('order') ?? undefined), enabled: !!principal && registration.data?.stage === 'COMPLETE' && (mode !== 'result' || !!search.get('order')), refetchInterval: 3000 })
  return <GuestLayout currentStep={order.data?.order ? order.data.order.paymentStatus === 'PAID' ? 7 : 6 : 5}
    onSignOut={principal ? () => request('/api/v1/registration/sign-out', 'POST') : undefined}>
    <PageHeader title={mode === 'result' ? c('Your payment summary', 'Kết quả thanh toán') : order.data?.order ? c('Payment and workspace status', 'Thanh toán và thiết lập không gian') : c('Choose a subscription', 'Chọn gói đăng ký')}
      description={c('A clear path from your selected plan to your organization’s workspace.', 'Từ gói đã chọn đến không gian làm việc của tổ chức.')} />
    {mode === 'result' && !search.get('order') ? <Failure error={new Error(c('This link is missing an order number.', 'Liên kết thiếu mã đơn hàng.'))} /> :
    registration.isPending ? <Loading /> : registration.isError ? <Failure error={registration.error} /> :
      !principal || registration.data?.stage !== 'COMPLETE' ? <div className="space-y-3 rounded-xl border border-border bg-card p-5"><p>{c('Sign in to view your saved registration and payment.', 'Đăng nhập để xem đăng ký và thanh toán đã lưu.')} <Link className="text-primary underline" to="/guest/resume">{c('Resume registration', 'Tiếp tục đăng ký')}</Link></p>
        {search.get('order') && <Link className="inline-block text-body-sm text-primary underline" to={`/admin/subscription/payment-result?order=${encodeURIComponent(search.get('order')!)}`}>{c('Already using your workspace? View this order there.', 'Đã vào không gian làm việc? Xem đơn hàng tại đây.')}</Link>}
      </div> :
        <>
          {order.isPending && <Loading />}
          {order.isError && <Failure error={order.error} retry={() => void order.refetch()} />}
          {order.data?.order ? <PaymentStatusPanel status={order.data} guest principal={principal} base={base} refresh={() => void order.refetch()} /> :
            order.isSuccess && <PlanCatalog base={base} principal={principal} />}
        </>}
  </GuestLayout>
}
