import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Dialog, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { getIdentity, getPlans, request, updatePlan, type Plan, type Terms } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { PlatformWorkspaceControls } from './PlatformWorkspaceControls'

export function PlatformPlansPage() {
  const c = useCopy()
  const cache = useQueryClient()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const principal = identity.data?.accountId
  const eligible = identity.data?.stage === 'COMPLETE' && identity.data.roles.includes('PLATFORM_ADMINISTRATOR')
  const plans = useQuery({ queryKey: ['platform-plans', principal], queryFn: () => getPlans('/api/v1/platform/subscription-plans'), enabled: eligible })
  const [editing, setEditing] = useState<{ plan: Plan; terms: Terms } | null>(null)
  const update = useMutation({ mutationFn: () => {
    if (!editing) throw new Error('Select a plan.')
    return updatePlan(editing.plan, editing.terms)
  }, onSuccess: async () => { setEditing(null); await cache.invalidateQueries({ queryKey: ['platform-plans'] }) } })
  return <SubscriptionShell title={c('Subscription plan configuration', 'Cấu hình gói đăng ký')} onSignOut={() => request('/api/v1/workspace-auth/sign-out', 'POST')}>
    {identity.isPending ? <Loading /> : identity.isError ? <Failure error={identity.error} /> : !eligible ?
      <Failure error={new Error(c('Sign in as a Platform Administrator with MFA.', 'Đăng nhập Quản trị viên nền tảng với MFA.'))} /> : <>
        <p className="text-muted-foreground">{c('Changes affect new orders only. Purchased terms remain unchanged.', 'Thay đổi chỉ áp dụng đơn mới. Điều khoản đã mua không đổi.')}</p>
        {plans.isPending ? <Loading /> : plans.isError ? <Failure error={plans.error} retry={() => void plans.refetch()} /> :
          <div className="grid gap-4 md:grid-cols-3">{plans.data.map(plan => <Card key={plan.planId}>
            <CardHeader><CardTitle>{plan.terms.name}</CardTitle></CardHeader><CardContent className="space-y-3">
              <p>{plan.terms.description}</p><p>{plan.terms.priceVnd.toLocaleString('vi-VN')} VND</p>
              <p>{plan.terms.durationMonths} {c('month(s)', 'tháng')} · {plan.terms.employeeSeats} {c('Employee seats', 'chỗ Nhân viên')}</p>
              <Button variant="outline" onClick={() => { update.reset(); setEditing({ plan, terms: { ...plan.terms } }) }}>{c('Edit', 'Sửa')} {plan.terms.name}</Button>
            </CardContent>
          </Card>)}</div>}
        {principal && <PlatformWorkspaceControls principal={principal} />}
      </>}
    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !update.isPending) setEditing(null) }} ariaLabel={c('Edit subscription plan', 'Sửa gói đăng ký')}>
      <DialogHeader><DialogTitle>{c('Edit subscription plan', 'Sửa gói đăng ký')}</DialogTitle></DialogHeader>
      {editing && <form className="space-y-3 overflow-y-auto" onSubmit={event => { event.preventDefault(); update.mutate() }}>
        <label className="block">{c('Name', 'Tên')}<Input required value={editing.terms.name} onChange={event => setEditing({ ...editing, terms: { ...editing.terms, name: event.target.value } })} /></label>
        <label className="block">{c('Description', 'Mô tả')}<Input required value={editing.terms.description} onChange={event => setEditing({ ...editing, terms: { ...editing.terms, description: event.target.value } })} /></label>
        <label className="block">{c('Price (VND)', 'Giá (VND)')}<Input type="number" required min={1} step={1} value={editing.terms.priceVnd} onChange={event => setEditing({ ...editing, terms: { ...editing.terms, priceVnd: Number(event.target.value) } })} /></label>
        <label className="block">{c('Currency', 'Tiền tệ')}<Input value="VND" readOnly /></label>
        <label className="block">{c('Duration (calendar months)', 'Thời hạn (tháng theo lịch)')}<Input type="number" required min={1} step={1} value={editing.terms.durationMonths} onChange={event => setEditing({ ...editing, terms: { ...editing.terms, durationMonths: Number(event.target.value) } })} /></label>
        <label className="block">{c('Employee seats', 'Chỗ Nhân viên')}<Input type="number" required min={1} step={1} value={editing.terms.employeeSeats} onChange={event => setEditing({ ...editing, terms: { ...editing.terms, employeeSeats: Number(event.target.value) } })} /></label>
        {update.isError && <Failure error={update.error} retry={() => { setEditing(null); void plans.refetch() }} />}
        <Button type="submit" isLoading={update.isPending}>{c('Save new version', 'Lưu phiên bản mới')}</Button>
      </form>}
    </Dialog>
  </SubscriptionShell>
}
