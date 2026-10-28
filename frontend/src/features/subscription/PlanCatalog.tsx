import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Check, Users } from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Button } from '../../shared/components/ui/Button'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '../../shared/components/ui/Dialog'
import { createOrder, getPlans, type Plan, type Status } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'

export function PlanCatalog({ base, principal, replacesOrderId, onCreated, disabled = false }:
  { base: string; principal: string; replacesOrderId?: string; onCreated?: (status: Status) => void; disabled?: boolean }) {
  const c = useCopy()
  const navigate = useNavigate()
  const plans = useQuery({ queryKey: ['subscription-plans', principal, base], queryFn: () => getPlans(`${base}/plans`), staleTime: 0 })
  const [selection, setSelection] = useState<{ plan: Plan; key: string } | null>(null)
  const create = useMutation({
    mutationFn: async () => {
      if (!selection) throw new Error('Select a plan first.')
      const result = await createOrder(base, selection.plan, selection.key, replacesOrderId)
      if (!result.order) throw new Error(c('The service did not return a payment order. Refresh the status before retrying.', 'Dịch vụ chưa trả về đơn thanh toán. Kiểm tra trạng thái trước khi thử lại.'))
      return result
    },
    onSuccess: result => {
      setSelection(null)
      if (onCreated) onCreated(result)
      else if (result.order) navigate(`/guest/checkout?order=${result.order.orderId}`)
    },
  })
  if (plans.isPending) return <Loading />
  if (plans.isError) return <Failure error={plans.error} retry={() => void plans.refetch()} />
  return <section className="space-y-4" aria-label={c('Subscription plans', 'Các gói đăng ký')}>
    {plans.data.length === 0 && <p>{c('No plans are available. Contact the platform administrator.', 'Chưa có gói. Liên hệ quản trị viên nền tảng.')}</p>}
    <p className="max-w-3xl text-body-sm leading-relaxed text-muted-foreground">{c('Choose the capacity that fits your team. The displayed price covers the full purchased period. Your workspace is prepared after payment is verified.', 'Chọn quy mô phù hợp với đội ngũ. Giá hiển thị áp dụng cho toàn bộ kỳ đã mua. Không gian được chuẩn bị sau khi xác minh thanh toán.')}</p>
    <div className="grid gap-5 md:grid-cols-3">
      {plans.data.map(plan => <Card key={plan.planId} className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="border-b border-border bg-muted/20"><CardTitle>{plan.terms.name}</CardTitle>
          <Heading level={3} size="page" className="pt-2 tabular-nums">{plan.terms.priceVnd.toLocaleString('vi-VN')} <span className="text-sm font-medium text-muted-foreground">VND</span></Heading>
          <p className="text-caption text-muted-foreground">{c('Total for', 'Tổng cộng cho')} {plan.terms.durationMonths} {c('calendar month(s)', 'tháng theo lịch')}</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5 pt-5">
          <p className="text-body-sm leading-relaxed text-muted-foreground">{plan.terms.description}</p>
          <ul className="space-y-3 text-body-sm">
            <li className="flex items-center gap-2"><Users size={17} className="text-primary" aria-hidden="true" />{plan.terms.employeeSeats} {c('Employee seats', 'chỗ Nhân viên')}</li>
            <li className="flex items-center gap-2"><CalendarDays size={17} className="text-primary" aria-hidden="true" />{plan.terms.durationMonths} {c('calendar month(s)', 'tháng theo lịch')}</li>
            <li className="flex items-center gap-2"><Check size={17} className="text-success" aria-hidden="true" />{c('Organization workspace', 'Không gian cho tổ chức')}</li>
          </ul>
          <Button className="mt-auto w-full" disabled={disabled || create.isPending} onClick={() => {
            create.reset(); setSelection({ plan, key: crypto.randomUUID() })
          }}>{c('Select', 'Chọn')} {plan.terms.name}</Button>
        </CardContent>
      </Card>)}
    </div>
    <Dialog open={selection !== null} ariaLabel={c('Confirm purchase terms', 'Xác nhận điều khoản mua')} onOpenChange={open => { if (!open && !create.isPending) setSelection(null) }}>
        <DialogHeader><DialogTitle>{c('Confirm purchase terms', 'Xác nhận điều khoản mua')}</DialogTitle>
          <DialogDescription>{c('Review your plan and total. Next, you will receive a secure payOS checkout link. Creating an order does not charge your account.', 'Kiểm tra gói và tổng tiền. Tiếp theo, bạn sẽ nhận liên kết thanh toán payOS. Tạo đơn hàng chưa trừ tiền tài khoản.')}</DialogDescription>
        </DialogHeader>
        {selection && <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-subsection font-semibold">{selection.plan.terms.name}</p>
            <p className="text-body-sm text-muted-foreground">{selection.plan.terms.durationMonths} {c('month(s)', 'tháng')} · {selection.plan.terms.employeeSeats} {c('Employee seats', 'chỗ Nhân viên')}</p>
            <Heading level={3} size="section" className="border-t border-border pt-3">{selection.plan.terms.priceVnd.toLocaleString('vi-VN')} VND</Heading>
          </div>
          <p>{c('Checkout expires in 30 minutes. A bank transfer is required through payOS.', 'Đơn thanh toán hết hạn sau 30 phút. Cần chuyển khoản qua payOS.')}</p>
          {create.isError && <Failure error={create.error} retry={() => { setSelection(null); create.reset(); void plans.refetch() }} />}
          <Button className="w-full" isLoading={create.isPending} onClick={() => create.mutate()}>{c('Create payment order', 'Tạo đơn thanh toán')}</Button>
        </div>}
    </Dialog>
  </section>
}
