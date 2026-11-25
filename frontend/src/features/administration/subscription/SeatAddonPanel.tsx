import { useMutation } from '@tanstack/react-query'
import { Minus,Plus,Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '../../../shared/components/ui/Card'
import { Dialog,DialogDescription,DialogHeader,DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Failure } from '../../subscription/SubscriptionFeedback'
import { useCopy } from '../../subscription/SubscriptionFeedback.helpers'
import { changeAddonSeats,createSeatAddonOrder,getSeatAddonQuote,type SeatAddonQuote,type SeatAddonTarget,type Summary } from '../../subscription/subscriptionApi'

const MAX_SEATS_PER_PURCHASE = 50
const vnd = (value: number) => `${value.toLocaleString('vi-VN')} VND`
const date = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
const whole = (value: string) => /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN

type Purchase = { target: SeatAddonTarget; fixedSeats?: number }

export function SeatAddonPanel({ summary, organization, refresh }: { summary: Summary; organization: string; refresh: () => void }) {
  const c = useCopy()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [reduce, setReduce] = useState(false)
  const current = summary.current
  const active = !!current && summary.subscriptionStatus === 'ACTIVE' && summary.workspaceStatus !== 'SUSPENDED'
  const blocked = summary.seatChangeBlocked
  const canBuy = active && !blocked
  const shortfall = summary.scheduled ? summary.scheduledShortfall : 0
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
      <div className="space-y-1">
        <CardTitle className="flex items-center gap-2"><Users size={18} className="text-primary" aria-hidden="true" />{c('Employee seats', 'Chỗ Nhân viên')}</CardTitle>
        <CardDescription>{c('Buy a few extra Employee seats without changing your plan.', 'Mua thêm vài chỗ Nhân viên mà không cần đổi gói.')}</CardDescription>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!canBuy || summary.desiredAddonSeats === 0} onClick={() => setReduce(true)}>
          <Minus size={16} className="mr-2" aria-hidden="true" />{c('Reduce at renewal', 'Giảm khi gia hạn')}
        </Button>
        <Button disabled={!canBuy} onClick={() => setPurchase({ target: 'CURRENT' })}>
          <Plus size={16} className="mr-2" aria-hidden="true" />{c('Buy extra seats', 'Mua thêm chỗ')}
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {current ? <dl className="grid gap-3 sm:grid-cols-3" aria-label={c('Current period seats', 'Chỗ của kỳ hiện tại')}>
        <SeatFigure label={c('Included in plan', 'Có trong gói')} value={current.terms.employeeSeats} />
        <SeatFigure label={c('Additional seats', 'Chỗ mua thêm')} value={current.addonSeats} />
        <SeatFigure label={c('Total this period', 'Tổng kỳ này')} value={current.totalSeats} emphasis />
      </dl> : <p className="text-body-sm text-muted-foreground">{c('Additional seats can be bought while a subscription period is active.', 'Chỉ có thể mua thêm chỗ khi có kỳ đăng ký đang hoạt động.')}</p>}
      <p className="text-body-sm text-muted-foreground" data-testid="desired-addon-seats">
        {c('Additional seats kept at the next same-plan renewal:', 'Số chỗ mua thêm giữ lại khi gia hạn cùng gói:')} <span className="font-semibold text-foreground">{summary.desiredAddonSeats}</span>
      </p>
      {shortfall > 0 && summary.scheduled && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
        <p className="text-body-sm">
          <Badge variant="warning" className="mr-2">{c('Action needed', 'Cần xử lý')}</Badge>
          {c(`The scheduled period is missing ${shortfall} additional seat(s). Until they are paid, the lower limit applies.`,
            `Kỳ tiếp theo còn thiếu ${shortfall} chỗ mua thêm. Trước khi thanh toán, giới hạn thấp hơn sẽ được áp dụng.`)}
        </p>
        <Button disabled={!canBuy} onClick={() => setPurchase({ target: 'SCHEDULED', fixedSeats: shortfall })}>
          {c('Pay for the scheduled period', 'Thanh toán cho kỳ tiếp theo')}
        </Button>
      </div>}
      {blocked && <p role="status" className="text-caption text-muted-foreground">{c('Seat changes are unavailable while a renewal or seat payment is unresolved.', 'Không thể thay đổi chỗ khi còn thanh toán gia hạn hoặc mua chỗ chưa hoàn tất.')}</p>}
      {!blocked && !active && current && <p className="text-caption text-muted-foreground">{c('Seat changes are unavailable while the workspace is suspended.', 'Không thể thay đổi chỗ khi không gian đang bị tạm ngưng.')}</p>}
    </CardContent>
    {purchase && <PurchaseDialog key={`${purchase.target}-${purchase.fixedSeats ?? ''}`} purchase={purchase} summary={summary} organization={organization}
      onClose={() => setPurchase(null)} onDone={() => { setPurchase(null); refresh() }} />}
    {reduce && <ReduceDialog summary={summary} organization={organization} onClose={() => setReduce(false)} onDone={() => { setReduce(false); refresh() }} />}
  </Card>
}

function SeatFigure({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return <div className={emphasis ? 'rounded-lg border border-primary/30 bg-secondary/40 p-3' : 'rounded-lg border border-border bg-muted/40 p-3'}>
    <dt className="text-caption text-muted-foreground">{label}</dt>
    <dd className="text-subsection font-semibold tabular-nums">{value}</dd>
  </div>
}

function PurchaseDialog({ purchase, summary, organization, onClose, onDone }:
  { purchase: Purchase; summary: Summary; organization: string; onClose: () => void; onDone: () => void }) {
  const c = useCopy()
  const navigate = useNavigate()
  const [input, setInput] = useState(String(purchase.fixedSeats ?? 1))
  const [key] = useState(() => crypto.randomUUID())
  const seats = whole(input)
  const valid = Number.isInteger(seats) && seats >= 1 && seats <= MAX_SEATS_PER_PURCHASE
  const quote = useMutation({ mutationFn: () => getSeatAddonQuote(organization, purchase.target, seats) })
  const order = useMutation({
    mutationFn: (value: SeatAddonQuote) => createSeatAddonOrder(organization, value, key),
    onSuccess: status => {
      // Checkout links are attached asynchronously; only a dev-bypassed order is already applied here.
      if (status.order && status.applicationState !== 'APPLIED') navigate(`/admin/subscription/payment-result?order=${encodeURIComponent(status.order.orderId)}`)
      else onDone()
    },
  })
  const busy = quote.isPending || order.isPending
  const scheduledTarget = purchase.target === 'SCHEDULED'
  const title = scheduledTarget ? c('Pay for scheduled-period seats', 'Thanh toán chỗ cho kỳ tiếp theo') : c('Buy extra Employee seats', 'Mua thêm chỗ Nhân viên')
  return <Dialog open ariaLabel={title} onOpenChange={open => { if (!open && !busy) onClose() }}>
    <DialogHeader><DialogTitle>{title}</DialogTitle>
      <DialogDescription>{scheduledTarget
        ? c('Keep your additional seats available in the scheduled period. The full-period seat price applies.', 'Giữ số chỗ mua thêm cho kỳ tiếp theo. Áp dụng giá chỗ cho toàn kỳ.')
        : c('The price is prorated for the time left in the current period. Seats are added once payment is confirmed.', 'Giá được tính theo thời gian còn lại của kỳ hiện tại. Chỗ được cộng sau khi xác nhận thanh toán.')}</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-body-sm font-semibold">{c('Number of seats', 'Số chỗ')} (1–{MAX_SEATS_PER_PURCHASE})</span>
        <Input type="number" inputMode="numeric" min={1} max={MAX_SEATS_PER_PURCHASE} step={1} value={input} disabled={busy || purchase.fixedSeats !== undefined}
          aria-invalid={!valid} onChange={event => { setInput(event.target.value); quote.reset(); order.reset() }} />
      </label>
      {!valid && <p role="alert" className="text-caption text-destructive">{c(`Enter a whole number from 1 to ${MAX_SEATS_PER_PURCHASE}.`, `Nhập số nguyên từ 1 đến ${MAX_SEATS_PER_PURCHASE}.`)}</p>}
      {!scheduledTarget && summary.scheduled && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-caption">
        {c('A next period is already scheduled. These seats cover the current period only; you will then be asked to pay the same seats for the scheduled period. Until then the lower limit applies.',
          'Đã có kỳ tiếp theo. Số chỗ này chỉ áp dụng cho kỳ hiện tại; sau đó bạn cần thanh toán thêm cho kỳ tiếp theo. Trước khi thanh toán, giới hạn thấp hơn được áp dụng.')}
      </p>}
      {quote.data && <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4" data-testid="seat-addon-quote">
        <p className="font-semibold">{quote.data.planName} · +{quote.data.seats} {c('seat(s)', 'chỗ')}</p>
        <p className="text-caption text-muted-foreground">{date(quote.data.startsAt)} → {date(quote.data.endsAt)} (Asia/Ho_Chi_Minh)</p>
        <p className="text-body-sm text-muted-foreground">{c('Full-period price per seat', 'Giá mỗi chỗ cho toàn kỳ')}: {vnd(quote.data.perSeatVnd)}</p>
        <Heading level={3} size="section" className="border-t border-border pt-3 tabular-nums">{vnd(quote.data.amountVnd)}</Heading>
      </div>}
      {quote.isError && <Failure error={quote.error} retry={() => quote.mutate()} />}
      {order.isError && <Failure error={order.error} retry={() => { order.reset(); quote.mutate() }} />}
      {quote.data
        ? <Button className="w-full" isLoading={order.isPending} disabled={!valid || busy} onClick={() => order.mutate(quote.data)}>{c('Create payment order', 'Tạo đơn thanh toán')}</Button>
        : <Button className="w-full" isLoading={quote.isPending} disabled={!valid || busy} onClick={() => quote.mutate()}>{c('Calculate price', 'Tính giá')}</Button>}
    </div>
  </Dialog>
}

function ReduceDialog({ summary, organization, onClose, onDone }: { summary: Summary; organization: string; onClose: () => void; onDone: () => void }) {
  const c = useCopy()
  const [input, setInput] = useState(String(Math.max(0, summary.desiredAddonSeats - 1)))
  const value = whole(input)
  const valid = Number.isInteger(value) && value >= 0 && value < summary.desiredAddonSeats
  const change = useMutation({ mutationFn: () => changeAddonSeats(organization, value, summary.desiredAddonSeats), onSuccess: onDone })
  const title = c('Reduce additional seats at renewal', 'Giảm chỗ mua thêm khi gia hạn')
  return <Dialog open ariaLabel={title} onOpenChange={open => { if (!open && !change.isPending) onClose() }}>
    <DialogHeader><DialogTitle>{title}</DialogTitle>
      <DialogDescription>{c('The new number applies from the next same-plan renewal. Seats already paid stay available until the period ends; there is no refund.', 'Số mới áp dụng từ lần gia hạn cùng gói tiếp theo. Chỗ đã trả vẫn dùng được đến hết kỳ; không hoàn tiền.')}</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-body-sm font-semibold">{c('Additional seats to keep', 'Số chỗ mua thêm giữ lại')} (0–{summary.desiredAddonSeats - 1})</span>
        <Input type="number" inputMode="numeric" min={0} max={summary.desiredAddonSeats - 1} step={1} value={input} disabled={change.isPending}
          aria-invalid={!valid} onChange={event => { setInput(event.target.value); change.reset() }} />
      </label>
      {!valid && <p role="alert" className="text-caption text-destructive">{c(`Enter a whole number from 0 to ${summary.desiredAddonSeats - 1}.`, `Nhập số nguyên từ 0 đến ${summary.desiredAddonSeats - 1}.`)}</p>}
      {change.isError && <Failure error={change.error} />}
      <Button className="w-full" isLoading={change.isPending} disabled={!valid} onClick={() => change.mutate()}>{c('Save reduction', 'Lưu thay đổi')}</Button>
    </div>
  </Dialog>
}
