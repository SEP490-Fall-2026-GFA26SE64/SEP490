import * as React from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
  type CompanyRecord,
  type PackageTier,
} from '../../../shared/stores/companyStore'
import {
  loadPlatformPlans,
  logPlatformEvent,
  type PlatformSubscriptionPlan,
} from '../../platform-admin/platformAdminStore'

interface PaymentHistoryItem {
  id: string
  invoiceNumber: string
  date: string
  tier: PackageTier
  period: string
  amount: string
  method: string
  status: 'PAID' | 'PENDING' | 'REFUNDED'
}

export function OrganizationSubscriptionPage() {
  const { toast } = useToast()
  const [activeCompany, setActiveCompany] = React.useState<CompanyRecord>(getActiveCompany)
  const [plans] = React.useState<PlatformSubscriptionPlan[]>(loadPlatformPlans)

  // Renewal / Upgrade Modal state
  const [isRenewModalOpen, setIsRenewModalOpen] = React.useState(false)
  const [selectedPlanTier, setSelectedPlanTier] = React.useState<PackageTier>(activeCompany.packageTier || 'Growth')
  const [renewalBillingCycle, setRenewalBillingCycle] = React.useState<'monthly' | 'annual'>('annual')
  const [isProcessingRenewal, setIsProcessingRenewal] = React.useState(false)

  const reloadData = React.useCallback(() => {
    setActiveCompany(getActiveCompany())
  }, [])

  React.useEffect(() => {
    window.addEventListener('companies_updated', reloadData)
    window.addEventListener('active_company_changed', reloadData)
    return () => {
      window.removeEventListener('companies_updated', reloadData)
      window.removeEventListener('active_company_changed', reloadData)
    }
  }, [reloadData])

  // Initial payment records
  const [paymentHistory] = React.useState<PaymentHistoryItem[]>([
    {
      id: 'pay-01',
      invoiceNumber: 'INV-2026-9041',
      date: '2026-01-15',
      tier: activeCompany.packageTier || 'Growth',
      period: 'Annual Subscription (2026 - 2027)',
      amount: '$4,788 USD (117,300,000 ₫)',
      method: 'PayOS VietQR (MB Bank)',
      status: 'PAID',
    },
    {
      id: 'pay-02',
      invoiceNumber: 'INV-2025-4120',
      date: '2025-01-15',
      tier: 'Starter',
      period: 'Annual Subscription (2025 - 2026)',
      amount: '$1,908 USD (46,750,000 ₫)',
      method: 'PayOS VietQR (VietinBank)',
      status: 'PAID',
    },
  ])

  const usedSeats = activeCompany.users.length
  const maxSeats = activeCompany.maxUsers || 50
  const seatPercentage = Math.round((usedSeats / maxSeats) * 100)

  const handleOpenRenew = () => {
    setSelectedPlanTier(activeCompany.packageTier || 'Growth')
    setIsRenewModalOpen(true)
  }

  const handleExecuteRenewal = () => {
    setIsProcessingRenewal(true)
    setTimeout(() => {
      const selectedPlan = plans.find((p) => p.tier === selectedPlanTier)
      const newMaxUsers = selectedPlan?.seatLimit || (selectedPlanTier === 'Enterprise' ? 200 : selectedPlanTier === 'Growth' ? 50 : 20)

      updateActiveCompany((c) => ({
        ...c,
        packageTier: selectedPlanTier,
        maxUsers: newMaxUsers,
      }))

      logPlatformEvent({
        organizationId: activeCompany.id,
        organizationName: activeCompany.name,
        actor: activeCompany.ownerEmail,
        action: 'SUBSCRIPTION_RENEWED',
        details: `Organization renewed/upgraded to ${selectedPlanTier} Tier (${newMaxUsers} seats) via PayOS simulation.`,
        severity: 'success',
      })

      setIsProcessingRenewal(false)
      setIsRenewModalOpen(false)
      reloadData()

      toast({
        title: 'Subscription Successfully Renewed',
        description: `Your workspace is now on the ${selectedPlanTier} plan with ${newMaxUsers} employee seats.`,
        variant: 'success',
      })
    }, 1000)
  }

  const handleDownloadInvoice = (inv: PaymentHistoryItem) => {
    toast({
      title: 'Invoice Downloaded',
      description: `Tax Invoice ${inv.invoiceNumber} downloaded as PDF.`,
      variant: 'info',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Organization Subscription & Seat Entitlements"
          description="View active subscription period, monitor employee seat quotas, examine PayOS transaction invoices, and renew workspace licenses."
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenRenew} className="flex items-center gap-1.5 shadow-xs">
              <RotateCcw size={14} />
              <span>Renew or Upgrade Subscription</span>
            </Button>
          }
        />

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Current Subscription Tier"
            value={activeCompany.packageTier || 'Growth Tier'}
            icon={<CreditCard size={18} className="text-primary" />}
            description="Active billing cycle on PayOS"
          />
          <StatCard
            title="Valid Period"
            value="Valid thru Jan 2027"
            icon={<Calendar size={18} className="text-success" />}
            description="89 days remaining in current period"
          />
          <StatCard
            title="Employee Seat Quota"
            value={`${usedSeats} / ${maxSeats} Seats`}
            icon={<Users size={18} className="text-primary" />}
            description={`${maxSeats - usedSeats} seats available for assignment`}
          />
        </div>

        {/* Seat Utilization Bar */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Employee Seat Capacity
              </CardTitle>
              <Badge variant={seatPercentage >= 90 ? 'warning' : 'secondary'} className="font-mono text-xs font-bold">
                {seatPercentage}% Utilized
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Allocated seats govern the maximum concurrent employees, L&D managers, and experts in your workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground">{usedSeats} occupied seats</span>
              <span className="text-muted-foreground">{maxSeats} total quota</span>
            </div>
            <Progress value={seatPercentage} className="h-2.5" />
            {seatPercentage >= 90 && (
              <p className="text-warning text-[11px] font-medium flex items-center gap-1">
                <AlertCircle size={13} />
                You are approaching your employee seat quota. Upgrade to Enterprise to support up to 200 members.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment History & Invoice Table */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/70">
            <CardTitle className="text-base font-bold">Payment History & Tax Invoices</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Historical PayOS transactions with verified HMAC signatures.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Billing Date</th>
                    <th className="py-3 px-4">Subscription Period</th>
                    <th className="py-3 px-4">Amount Charged</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paymentHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">{item.invoiceNumber}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{item.date}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{item.period}</td>
                      <td className="py-3 px-4 font-mono font-bold text-primary">{item.amount}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.method}</td>
                      <td className="py-3 px-4">
                        <Badge variant="success" className="text-[10px] py-0 font-bold">
                          <CheckCircle2 size={10} className="mr-1" /> {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(item)}
                          className="h-7 text-xs flex items-center gap-1 text-primary hover:bg-primary/10"
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Renewal / Upgrade Modal */}
        <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen} className="max-w-xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <CreditCard className="h-5 w-5 text-primary shrink-0" />
                <span>Renew or Upgrade Workspace Subscription</span>
              </DialogTitle>
              <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
                PAYOS VIETQR
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select your target plan tier and billing duration. Changes take effect immediately via automated PayOS webhook settlement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Current Workspace Metadata Panel */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Current Tier</span>
                <strong className="font-bold text-foreground text-xs">{activeCompany.packageTier || 'Growth'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Allocated Seats</span>
                <strong className="font-mono text-foreground font-bold text-xs">
                  {activeCompany.users.length} / {activeCompany.maxUsers}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Billing Cycle</span>
                <strong className="text-foreground font-bold text-xs uppercase">{renewalBillingCycle}</strong>
              </div>
            </div>

            {/* Tier selection cards */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Select Subscription Plan Tier
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Starter', 'Growth', 'Enterprise'] as const).map((tier) => {
                  const plan = plans.find((p) => p.tier === tier)
                  const isSelected = selectedPlanTier === tier
                  return (
                    <div
                      key={tier}
                      onClick={() => setSelectedPlanTier(tier)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-secondary/60 text-foreground ring-2 ring-primary/20 shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs">{tier}</span>
                          {tier === 'Growth' && (
                            <Badge variant="primary" className="text-[9px] py-0 px-1">Popular</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {tier === 'Starter' ? '20 Seats' : tier === 'Growth' ? '50 Seats' : '200 Seats'}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/60">
                        <span className="text-sm font-bold text-foreground">
                          ${plan ? (renewalBillingCycle === 'annual' ? plan.priceUsdAnnual : plan.priceUsdMonthly) : tier === 'Enterprise' ? 799 : 399}
                        </span>
                        <span className="text-[10px] text-muted-foreground"> /mo</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Annual vs monthly toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="font-semibold text-foreground text-xs block">Billing Duration</span>
                <span className="text-[11px] text-muted-foreground">Annual billing saves 20% compared to monthly</span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background border border-border">
                <button
                  type="button"
                  onClick={() => setRenewalBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    renewalBillingCycle === 'monthly' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setRenewalBillingCycle('annual')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    renewalBillingCycle === 'annual' ? 'bg-primary text-primary-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annual (20% Off)
                </button>
              </div>
            </div>

            {/* Total summary */}
            <div className="p-3.5 rounded-xl bg-secondary/50 border border-primary/20 text-xs text-foreground flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">PayOS Total Settlement Amount</p>
                <p className="text-muted-foreground text-[11px]">Instant activation via automated PayOS VietQR hook</p>
              </div>
              <span className="text-base font-extrabold text-primary">
                {selectedPlanTier === 'Enterprise'
                  ? renewalBillingCycle === 'annual' ? '$9,588 USD' : '$999 USD'
                  : selectedPlanTier === 'Growth'
                  ? renewalBillingCycle === 'annual' ? '$4,788 USD' : '$499 USD'
                  : renewalBillingCycle === 'annual' ? '$1,908 USD' : '$199 USD'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsRenewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessingRenewal}
              onClick={handleExecuteRenewal}
              className="flex items-center gap-1.5"
            >
              {isProcessingRenewal ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Processing PayOS Webhook...</span>
                </>
              ) : (
                <>
                  <CreditCard size={13} />
                  <span>Confirm PayOS Renewal</span>
                </>
              )}
            </Button>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
