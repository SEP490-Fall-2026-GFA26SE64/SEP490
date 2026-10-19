import * as React from 'react'
import {
  Check,
  CreditCard,
  Edit2,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { StatCard } from '../../shared/components/ui/StatCard'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import {
  loadPlatformPlans,
  logPlatformEvent,
  savePlatformPlans,
  type PlatformSubscriptionPlan,
} from './platformAdminStore'

export function PlatformSubscriptionsConfigPage() {
  const { toast } = useToast()
  const [plans, setPlans] = React.useState<PlatformSubscriptionPlan[]>(loadPlatformPlans)

  // Edit Plan modal state
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editForm, setEditForm] = React.useState<PlatformSubscriptionPlan | null>(null)

  const reloadPlans = React.useCallback(() => {
    setPlans(loadPlatformPlans())
  }, [])

  React.useEffect(() => {
    window.addEventListener('platform_plans_updated', reloadPlans)
    return () => window.removeEventListener('platform_plans_updated', reloadPlans)
  }, [reloadPlans])

  const handleOpenEdit = (plan: PlatformSubscriptionPlan) => {
    setEditForm({ ...plan })
    setIsEditModalOpen(true)
  }

  const handleSavePlan = () => {
    if (!editForm) return
    const updated = plans.map((p) => (p.id === editForm.id ? editForm : p))
    savePlatformPlans(updated)
    setPlans(updated)

    logPlatformEvent({
      organizationId: 'platform-catalog',
      organizationName: 'Platform Subscriptions',
      actor: 'Platform Administrator',
      action: 'SUBSCRIPTION_TIER_CONFIGURED',
      details: `Updated plan "${editForm.name}" (Seats: ${editForm.seatLimit}, Price: $${editForm.priceUsdMonthly}/mo).`,
      severity: 'info',
    })

    setIsEditModalOpen(false)
    toast({
      title: 'Plan Configuration Saved',
      description: `Updates for ${editForm.name} have been published to the guest catalog.`,
      variant: 'success',
    })
  }

  const handleToggleActive = (plan: PlatformSubscriptionPlan) => {
    const updated = plans.map((p) => (p.id === plan.id ? { ...p, isActive: !p.isActive } : p))
    savePlatformPlans(updated)
    setPlans(updated)
    toast({
      title: plan.isActive ? 'Plan Deactivated' : 'Plan Activated',
      description: `${plan.name} visibility updated.`,
      variant: 'info',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Platform Subscriptions Configuration"
          description="Manage public and enterprise subscription tiers, seat quota limits, multi-currency pricing (USD & VND), and feature entitlements."
        />

        {/* Global Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Configured Subscription Tiers"
            value={plans.length}
            icon={<CreditCard size={18} className="text-primary" />}
            description="Active tiers available on PayOS"
          />
          <StatCard
            title="Max Seat Entitlement"
            value="200 Seats"
            icon={<Users size={18} className="text-success" />}
            description="Enterprise tier upper limit"
          />
          <StatCard
            title="Currency Support"
            value="USD & VND"
            icon={<Sparkles size={18} className="text-primary" />}
            description="VietQR PayOS + Global checkout"
          />
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col border-2 transition-all shadow-xs bg-card ${
                plan.popular ? 'border-primary' : 'border-border'
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/70">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-foreground">{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-[10px]">
                    {plan.isActive ? 'Active' : 'Draft'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground min-h-[36px] mt-1">
                  {plan.description}
                </CardDescription>

                <div className="pt-3 space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-foreground">${plan.priceUsdMonthly}</span>
                    <span className="text-xs text-muted-foreground">USD / mo</span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {plan.priceVndMonthly.toLocaleString('vi-VN')} ₫ / mo (VND)
                  </p>
                  <p className="text-[11px] font-bold text-primary mt-1">
                    {plan.seatLimit} Employee Seats Limit
                  </p>
                </div>
              </CardHeader>

              <CardContent className="flex-1 pt-4 pb-4 text-xs space-y-2">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                  Features ({plan.features.length})
                </p>
                <ul className="space-y-1.5">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-foreground/90">
                      <Check size={13} className="text-success shrink-0 mt-0.5" />
                      <span className="truncate">{f}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-[11px] text-muted-foreground italic pl-4">
                      + {plan.features.length - 4} more capabilities
                    </li>
                  )}
                </ul>
              </CardContent>

              <CardFooter className="border-t border-border/70 pt-3 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(plan)}
                  className="text-xs h-8 text-muted-foreground"
                >
                  {plan.isActive ? <ToggleRight size={16} className="text-success mr-1" /> : <ToggleLeft size={16} className="mr-1" />}
                  <span>{plan.isActive ? 'Active' : 'Disabled'}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenEdit(plan)}
                  className="text-xs h-8 flex items-center gap-1.5"
                >
                  <Edit2 size={12} />
                  <span>Configure Plan</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Plan Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} className="max-w-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <CreditCard className="h-5 w-5 text-primary shrink-0" />
                <span>Configure Subscription Tier: {editForm?.name}</span>
              </DialogTitle>
              <Badge variant="primary" className="text-[10px] font-bold uppercase">
                {editForm?.tier} TIER
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Set employee seat quotas, multi-currency billing pricing, and tier capabilities.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4 py-2 text-xs">
              {/* Top metadata panel */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Plan Tier</span>
                  <strong className="text-foreground font-bold text-xs">{editForm.tier}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Employee Seat Quota</span>
                  <strong className="font-mono text-primary font-bold text-xs">{editForm.seatLimit} Seats</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px] font-medium">Tier Description</span>
                  <span className="text-foreground font-semibold text-xs">{editForm.description}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Plan Display Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Marketing Description</label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div className="p-3 rounded-xl border border-border bg-background space-y-3">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground block">
                    Pricing Configuration (USD & VND)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">Price USD (Monthly)</label>
                      <Input
                        type="number"
                        value={editForm.priceUsdMonthly}
                        onChange={(e) => setEditForm({ ...editForm, priceUsdMonthly: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">Price USD (Annual / mo)</label>
                      <Input
                        type="number"
                        value={editForm.priceUsdAnnual}
                        onChange={(e) => setEditForm({ ...editForm, priceUsdAnnual: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">Price VND (Monthly)</label>
                      <Input
                        type="number"
                        value={editForm.priceVndMonthly}
                        onChange={(e) => setEditForm({ ...editForm, priceVndMonthly: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground block">Price VND (Annual / mo)</label>
                      <Input
                        type="number"
                        value={editForm.priceVndAnnual}
                        onChange={(e) => setEditForm({ ...editForm, priceVndAnnual: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Employee Seat Limit Quota</label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={editForm.seatLimit}
                    onChange={(e) => setEditForm({ ...editForm, seatLimit: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSavePlan}>
              <Save size={13} className="mr-1.5" />
              Save Configuration
            </Button>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
