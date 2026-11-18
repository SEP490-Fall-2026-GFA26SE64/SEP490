import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Info, Layers, Pencil, Users, Wallet } from 'lucide-react'
import { SubscriptionShell } from '../../shared/components/ui/SubscriptionShell'
import { Card, CardContent, CardFooter, CardHeader } from '../../shared/components/ui/Card'
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { Badge } from '../../shared/components/ui/Badge'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { FormField } from '../../shared/components/ui/FormField'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { StatCard } from '../../shared/components/ui/StatCard'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { getIdentity, getPlans, request, updatePlan, type Plan, type Terms } from './subscriptionApi'
import { Failure, Loading } from "./SubscriptionFeedback";
import { useCopy } from "./SubscriptionFeedback.helpers";

const signOut = () => request('/api/v1/workspace-auth/sign-out', 'POST')

function PlanDetail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 py-2">
    <dt className="flex items-center gap-2 text-body-sm text-muted-foreground">{icon}{label}</dt>
    <dd className="text-body-sm font-semibold text-foreground">{children}</dd>
  </div>
}

function PlanCatalogAdministration({ principal }: { principal: string }) {
  const c = useCopy()
  const cache = useQueryClient()
  const plans = useQuery({ queryKey: ['platform-plans', principal], queryFn: () => getPlans('/api/v1/platform/subscription-plans') })
  const [editing, setEditing] = useState<{ plan: Plan; terms: Terms } | null>(null)
  const update = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error(c('Select a plan.', 'Chọn một gói.'))
      return updatePlan(editing.plan, editing.terms)
    },
    onSuccess: async () => { setEditing(null); await cache.invalidateQueries({ queryKey: ['platform-plans'] }) },
  })
  const vnd = (value: number) => `${value.toLocaleString('vi-VN')} VND`
  const months = (value: number) => `${value} ${c(value === 1 ? 'month' : 'months', 'tháng')}`
  const setTerm = <K extends keyof Terms>(key: K, value: Terms[K]) => {
    if (editing) setEditing({ ...editing, terms: { ...editing.terms, [key]: value } })
  }
  const close = (open: boolean) => { if (!open && !update.isPending) { setEditing(null); update.reset() } }
  const rows = plans.data ?? []
  const prices = rows.map(plan => plan.terms.priceVnd)

  return <section className="min-w-0 space-y-6">
    <PageHeader title={c('Subscription plans', 'Gói đăng ký')}
      description={c('Configure the plans organizations can purchase: name, description, price, duration and Employee-seat limit.',
        'Cấu hình các gói mà tổ chức có thể mua: tên, mô tả, giá, thời hạn và giới hạn chỗ Nhân viên.')} />

    <div role="note" className="flex items-start gap-3 rounded-xl border border-primary/20 bg-secondary px-4 py-3">
      <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
      <Text className="text-body-sm text-foreground">
        {c('Saving creates a new plan version. Changes affect new orders only. Purchased terms remain unchanged.',
          'Lưu sẽ tạo phiên bản gói mới. Thay đổi chỉ áp dụng cho đơn mới. Điều khoản đã mua không đổi.')}
      </Text>
    </div>

    {plans.isSuccess && rows.length > 0 && <div role="region" aria-label={c('Plan overview', 'Tổng quan gói')}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title={c('Available plans', 'Gói đang cung cấp')} value={rows.length} icon={<Layers size={18} aria-hidden="true" />} />
      <StatCard title={c('Lowest price', 'Giá thấp nhất')} value={vnd(Math.min(...prices))} icon={<Wallet size={18} aria-hidden="true" />} />
      <StatCard title={c('Highest price', 'Giá cao nhất')} value={vnd(Math.max(...prices))} icon={<Wallet size={18} aria-hidden="true" />} />
      <StatCard title={c('Largest seat limit', 'Giới hạn chỗ lớn nhất')} value={Math.max(...rows.map(plan => plan.terms.employeeSeats))}
        icon={<Users size={18} aria-hidden="true" />} />
    </div>}

    {plans.isPending ? <Loading /> : plans.isError ? <Failure error={plans.error} retry={() => { void plans.refetch() }} /> :
      rows.length === 0 ? <EmptyState icon={<Layers size={24} aria-hidden="true" />}
        title={c('No subscription plans', 'Chưa có gói đăng ký')}
        description={c('No plans are configured on the platform yet.', 'Nền tảng chưa có gói đăng ký nào được cấu hình.')} /> :
      <div role="list" aria-label={c('Subscription plans', 'Gói đăng ký')} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(plan => <Card key={plan.planId} role="listitem" className="flex min-w-0 flex-col border-border bg-card shadow-xs transition-shadow hover:shadow-md">
          <CardHeader className="space-y-3 border-b border-border pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Heading level={2} size="card" className="break-words">{plan.terms.name}</Heading>
                <Text className="mt-0.5 font-mono text-caption text-muted-foreground">{plan.code}</Text>
              </div>
              <Badge variant="secondary" className="shrink-0">{c('Version', 'Phiên bản')} {plan.revision}</Badge>
            </div>
            <p className="text-[length:var(--text-section)] font-bold leading-tight text-foreground">
              {plan.terms.priceVnd.toLocaleString('vi-VN')} <span className="text-body-sm font-medium text-muted-foreground">{plan.terms.currency}</span>
            </p>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 pt-4">
            <Text className="text-body-sm text-muted-foreground">{plan.terms.description}</Text>
            <dl className="divide-y divide-border rounded-lg border border-border bg-muted/40 px-3">
              <PlanDetail icon={<CalendarClock size={15} aria-hidden="true" />} label={c('Duration', 'Thời hạn')}>{months(plan.terms.durationMonths)}</PlanDetail>
              <PlanDetail icon={<Users size={15} aria-hidden="true" />} label={c('Employee seats', 'Chỗ Nhân viên')}>{plan.terms.employeeSeats}</PlanDetail>
            </dl>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" className="w-full" aria-label={`${c('Edit', 'Sửa')} ${plan.terms.name}`}
              onClick={() => { update.reset(); setEditing({ plan, terms: { ...plan.terms } }) }}>
              <Pencil size={15} aria-hidden="true" />{c('Edit plan', 'Sửa gói')}
            </Button>
          </CardFooter>
        </Card>)}
      </div>}

    <Dialog open={editing !== null} onOpenChange={close} ariaLabel={c('Edit subscription plan', 'Sửa gói đăng ký')}>
      <DialogHeader>
        <DialogTitle>{c('Edit subscription plan', 'Sửa gói đăng ký')}</DialogTitle>
        {editing && <DialogDescription>
          {editing.plan.code} · {c('Current version', 'Phiên bản hiện tại')} {editing.plan.revision}
        </DialogDescription>}
      </DialogHeader>
      {editing && <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); update.mutate() }}>
        <DialogBody className="space-y-4 px-0.5 pb-1">
          <FormField label={c('Name', 'Tên')}>
            <Input required maxLength={120} value={editing.terms.name} disabled={update.isPending} onChange={event => setTerm('name', event.target.value)} />
          </FormField>
          <FormField label={c('Description', 'Mô tả')}>
            <Input required value={editing.terms.description} disabled={update.isPending} onChange={event => setTerm('description', event.target.value)} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={c('Price (VND)', 'Giá (VND)')}>
              <Input type="number" required min={1} step={1} value={editing.terms.priceVnd} disabled={update.isPending}
                onChange={event => setTerm('priceVnd', Number(event.target.value))} />
            </FormField>
            <FormField label={c('Currency', 'Tiền tệ')}>
              <Input value="VND" readOnly className="bg-muted text-muted-foreground" />
            </FormField>
            <FormField label={c('Duration (calendar months)', 'Thời hạn (tháng theo lịch)')}>
              <Input type="number" required min={1} step={1} value={editing.terms.durationMonths} disabled={update.isPending}
                onChange={event => setTerm('durationMonths', Number(event.target.value))} />
            </FormField>
            <FormField label={c('Employee seats', 'Chỗ Nhân viên')}>
              <Input type="number" required min={1} step={1} value={editing.terms.employeeSeats} disabled={update.isPending}
                onChange={event => setTerm('employeeSeats', Number(event.target.value))} />
            </FormField>
          </div>
          {update.isError && <Failure error={update.error} retry={() => { setEditing(null); update.reset(); void plans.refetch() }} />}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={update.isPending} onClick={() => close(false)}>{c('Cancel', 'Hủy')}</Button>
          <Button type="submit" isLoading={update.isPending}>{c('Save new version', 'Lưu phiên bản mới')}</Button>
        </DialogFooter>
      </form>}
    </Dialog>
  </section>
}

export function PlatformPlansPage() {
  const c = useCopy()
  const cache = useQueryClient()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const principal = identity.data?.accountId
  if (principal && identity.data?.stage === 'COMPLETE' && identity.data.roles.includes('PLATFORM_ADMINISTRATOR')) {
    return <WorkspaceLayout identity={{
      accountId: principal, fullName: identity.data.fullName, email: identity.data.email,
      organizationId: identity.data.organizationId, organizationName: null,
      workspaceSlug: identity.data.workspaceSlug, roles: identity.data.roles,
    }} onSignOut={async () => { await signOut(); cache.clear() }}>
      <PlanCatalogAdministration principal={principal} />
    </WorkspaceLayout>
  }
  return <SubscriptionShell title={c('Subscription plan configuration', 'Cấu hình gói đăng ký')} onSignOut={signOut}>
    {identity.isPending ? <Loading /> : identity.isError ? <Failure error={identity.error} /> :
      <Failure error={new Error(c('Sign in as a Platform Administrator with MFA.', 'Đăng nhập Quản trị viên nền tảng với MFA.'))} />}
  </SubscriptionShell>
}
