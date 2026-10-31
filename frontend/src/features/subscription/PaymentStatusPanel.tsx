import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { Button, buttonVariants } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { enterWorkspace, reconcileOrder, type Status } from './subscriptionApi'
import { Failure, StateLabel, useCopy } from './SubscriptionFeedback'
import { PlanCatalog } from './PlanCatalog'
import { PaymentReceipt } from './PaymentReceipt'

export function PaymentStatusPanel({ status, guest, principal, base, refresh }:
  { status: Status; guest: boolean; principal: string; base: string; refresh: () => void }) {
  const c = useCopy()
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const reconcile = useMutation({ mutationFn: () => {
    if (!status.order) throw new Error('No order to reconcile.')
    return reconcileOrder(guest, status.order.orderId)
  }, onSuccess: refresh })
  const enter = useMutation({ mutationFn: enterWorkspace, onSuccess: () => { cache.clear(); navigate('/admin/subscription') } })
  if (!status.order) return <p>{c('No payment order has been created.', 'Chưa tạo đơn thanh toán.')}</p>
  const order = status.order
  const paid = order.paymentStatus === 'PAID'
  const bypassed = order.paymentStatus === 'DEV_BYPASSED'
  const settled = paid || bypassed
  const expired = Date.parse(order.expiresAt) <= now
  const ready = (!guest || status.workspace?.state === 'READY') && status.applicationState === 'APPLIED'
  const canPay = order.checkoutUrl && !expired && ['PENDING', 'PARTIAL'].includes(order.paymentStatus)
  return <div className="space-y-5">
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <PaymentReceipt order={order} />
      <div className="space-y-4">
        <Card className={paid ? 'border-success/30' : ''}>
          <CardHeader><CardTitle className="flex items-center gap-2">
            {paid ? <CheckCircle2 size={20} className="text-success" aria-hidden="true" /> : <Clock3 size={20} className="text-primary" aria-hidden="true" />}
            {bypassed ? c('Development payment bypass', 'Bỏ qua thanh toán ở môi trường phát triển')
              : paid ? c('Thank you for your payment', 'Cảm ơn bạn đã thanh toán') : c('Complete your payment', 'Hoàn tất thanh toán')}
          </CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p role={bypassed ? 'status' : undefined} className="text-body-sm leading-relaxed text-muted-foreground">{bypassed
              ? c('PayOS is disabled for local development. No payment was made or verified. This subscription uses an explicit development bypass.', 'PayOS đang tắt ở môi trường phát triển. Không có khoản thanh toán nào được thực hiện hoặc xác minh. Gói này được cấp bằng cơ chế bỏ qua dành riêng cho phát triển.')
              : paid
              ? c('Your payment has been verified. Keep this order number for your records. Check the setup status below before entering your workspace.', 'Thanh toán đã được xác minh. Lưu mã đơn hàng để tra cứu. Kiểm tra trạng thái thiết lập bên dưới trước khi vào không gian làm việc.')
              : c('Open payOS to scan the bank QR code or follow its transfer instructions. Keep the exact amount and transfer content shown there. This page updates automatically.', 'Mở payOS để quét mã QR ngân hàng hoặc làm theo hướng dẫn chuyển khoản. Giữ đúng số tiền và nội dung hiển thị tại đó. Trang này tự cập nhật trạng thái.')}</p>
            {canPay && order.checkoutUrl && <a href={order.checkoutUrl} className={buttonVariants({ className: 'w-full gap-2 text-primary-foreground!' })}>
              {c('Open payOS checkout', 'Mở thanh toán payOS')}<ArrowUpRight size={17} aria-hidden="true" />
            </a>}
            {!settled && expired && <p role="status" className="rounded-lg bg-muted p-3 text-body-sm">{c('The checkout deadline has passed. Check payment status before trying again; a delayed transfer may still be processing.', 'Đã quá hạn thanh toán. Kiểm tra trạng thái trước khi thử lại; giao dịch chậm có thể vẫn đang được xử lý.')}</p>}
            {order.paymentStatus === 'PARTIAL' && <p role="status" className="rounded-lg border border-warning/40 p-3 text-body-sm">{c('The full amount has not been verified. Do not create another order; check this payment first.', 'Chưa xác minh đủ số tiền. Không tạo đơn mới; hãy kiểm tra giao dịch này trước.')}</p>}
            {!settled && <Button variant="outline" className="w-full" isLoading={reconcile.isPending} onClick={() => reconcile.mutate()}>{c('Reconcile payment', 'Kiểm tra thanh toán')}</Button>}
            {!bypassed && <p className="flex items-center gap-2 text-caption text-muted-foreground"><ShieldCheck size={15} aria-hidden="true" />{c('Only verified payment records activate your subscription.', 'Gói chỉ được kích hoạt sau khi xác minh thanh toán.')}</p>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>{c('What happens next', 'Bước tiếp theo')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-semibold text-primary">1</span>
              <div><p className="text-body-sm font-semibold">{c('Subscription activation', 'Kích hoạt gói')}</p><p className="mt-1 text-body-sm text-muted-foreground"><StateLabel value={status.applicationState} /></p></div></div>
            {status.workspace && <div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-semibold text-primary">2</span>
              <div><p className="text-body-sm font-semibold">{c('Workspace readiness', 'Thiết lập không gian')}</p><p className="mt-1 text-body-sm text-muted-foreground"><StateLabel value={status.workspace.state} /></p></div></div>}
            {!status.workspace && <p className="text-caption text-muted-foreground">{c('Your existing workspace and any suspension restrictions remain unchanged.', 'Không gian hiện có và các giới hạn tạm ngưng được giữ nguyên.')}</p>}
            {guest && ready && <Button className="w-full" isLoading={enter.isPending} onClick={() => enter.mutate()}>{c('Enter workspace', 'Vào không gian làm việc')}</Button>}
            {settled && !ready && <Button variant="outline" className="w-full" isLoading={reconcile.isPending} onClick={() => reconcile.mutate()}>{c('Refresh setup status', 'Cập nhật trạng thái thiết lập')}</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
    {(order.failureCode || status.workspace?.failureCode) && <div role="status" className="rounded-lg border border-warning/40 bg-card p-4 text-body-sm">
      {bypassed
        ? c('Development setup needs attention. Refresh the status or contact your platform administrator with the order number.', 'Thiết lập phát triển cần kiểm tra. Cập nhật trạng thái hoặc cung cấp mã đơn cho quản trị viên nền tảng.')
        : c('Processing needs attention. Your recorded payment is preserved. Refresh the status or contact your platform administrator with the order number.', 'Quá trình xử lý cần kiểm tra. Thanh toán đã ghi nhận được giữ nguyên. Cập nhật trạng thái hoặc cung cấp mã đơn cho quản trị viên nền tảng.')}
      <p className="mt-2 text-caption text-muted-foreground">{order.failureCode ?? status.workspace?.failureCode}</p>
    </div>}
    {reconcile.isError && <Failure error={reconcile.error} />}
    {enter.isError && <Failure error={enter.error} />}
    {order.paymentStatus === 'UNPAID_TERMINAL' && <Card><CardHeader><CardTitle>{c('Choose a plan to try again', 'Chọn gói để thử lại')}</CardTitle></CardHeader><CardContent>
      <PlanCatalog base={base} principal={principal} replacesOrderId={order.orderId} onCreated={result => {
        if (guest && result.order) navigate(`/guest/checkout?order=${result.order.orderId}`)
        else refresh()
      }} />
    </CardContent></Card>}
  </div>
}
