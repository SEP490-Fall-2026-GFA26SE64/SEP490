import { CreditCard, ReceiptText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Heading } from '../../shared/components/typography/Heading'
import { StateLabel, useCopy } from './SubscriptionFeedback'
import type { Order } from './subscriptionApi'

export function PaymentReceipt({ order }: { order: Order }) {
  const c = useCopy()
  const money = (value: number) => `${value.toLocaleString('vi-VN')} VND`
  const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  const paid = order.paymentStatus === 'PAID'
  const details = [
    [c('payOS order number', 'Mã đơn payOS'), String(order.providerOrderCode)],
    [c('Payment method', 'Phương thức'), c('Bank transfer via payOS', 'Chuyển khoản qua payOS')],
    [c('Order created', 'Ngày tạo đơn'), date(order.createdAt)],
    [c('Checkout deadline', 'Hạn thanh toán'), date(order.expiresAt)],
    [c('System confirmation time', 'Thời điểm hệ thống xác nhận'), order.confirmedAt ? date(order.confirmedAt) : c('Not confirmed yet', 'Chưa xác nhận')],
    [c('Amount received', 'Số tiền đã nhận'), order.observedPaidAmount === null ? c('Not yet known', 'Chưa xác định') : money(order.observedPaidAmount)],
  ]
  return <Card className="min-w-0 overflow-hidden">
    <CardHeader className="border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2"><ReceiptText size={19} className="text-primary" aria-hidden="true" />{c('Payment details', 'Chi tiết thanh toán')}</CardTitle>
        <Badge variant={paid ? 'success' : order.paymentStatus === 'EXCEPTION' ? 'destructive' : 'warning'}><StateLabel value={order.paymentStatus} /></Badge>
      </div>
      <p className="break-all text-caption text-muted-foreground">{c('Order ID', 'Mã đơn hàng')}: {order.orderId}</p>
    </CardHeader>
    <CardContent className="space-y-5 pt-5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <span className="rounded-lg bg-secondary p-2.5 text-primary"><CreditCard size={22} aria-hidden="true" /></span>
        <div className="min-w-0 space-y-1"><Heading level={2} size="subsection">{order.terms.name}</Heading>
          <p className="text-body-sm text-muted-foreground">{order.terms.durationMonths} {c('calendar month(s)', 'tháng theo lịch')} · {order.terms.employeeSeats} {c('Employee seats', 'chỗ Nhân viên')}</p>
          <p className="text-body-sm text-muted-foreground">{order.terms.description}</p>
        </div>
      </div>
      <dl className="divide-y divide-border">
        {details.map(([label, value]) => <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 py-3 text-body-sm">
          <dt className="text-muted-foreground">{label}</dt><dd className="break-all font-medium">{value}</dd>
        </div>)}
      </dl>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-4">
        <span className="font-semibold">{c('Order total', 'Tổng thanh toán')}</span>
        <strong className="text-[length:var(--text-page)] leading-tight">{money(order.terms.priceVnd)}</strong>
      </div>
      <p className="text-caption leading-relaxed text-muted-foreground">{c('Times are shown in Vietnam time (UTC+7). This order confirmation is not a tax invoice.', 'Thời gian theo giờ Việt Nam (UTC+7). Xác nhận đơn hàng này không phải hóa đơn thuế.')}</p>
    </CardContent>
  </Card>
}
