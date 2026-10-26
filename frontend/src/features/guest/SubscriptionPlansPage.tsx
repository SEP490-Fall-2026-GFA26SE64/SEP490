import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Crown,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { useToast } from '../../shared/hooks/useToast'
import { loadPlatformPlans, type PlatformSubscriptionPlan } from '../platform-admin/platformAdminStore'
import { GuestLayout } from './GuestLayout'

const CHECKOUT_SELECTION_KEY = 'adaptlearn_selected_plan_checkout'
const DRAFT_STORAGE_KEY = 'adaptlearn_guest_registration_draft'

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [currency, setCurrency] = React.useState<'USD' | 'VND'>('USD')
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('annual')
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>('plan-growth')
  const [plans] = React.useState<PlatformSubscriptionPlan[]>(loadPlatformPlans)

  const orgDraft = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const handleSelectPlan = (plan: PlatformSubscriptionPlan) => {
    setSelectedPlanId(plan.id)
    const checkoutData = {
      planId: plan.id,
      tier: plan.tier,
      planName: plan.name,
      currency,
      billingCycle,
      seatLimit: plan.seatLimit,
      priceMonthly: currency === 'USD' ? plan.priceUsdMonthly : plan.priceVndMonthly,
      priceAnnualPerMonth: currency === 'USD' ? plan.priceUsdAnnual : plan.priceVndAnnual,
      totalCharged:
        billingCycle === 'annual'
          ? (currency === 'USD' ? plan.priceUsdAnnual : plan.priceVndAnnual) * 12
          : currency === 'USD'
          ? plan.priceUsdMonthly
          : plan.priceVndMonthly,
      organizationName: orgDraft?.organizationName || 'New Organization',
      subdomain: orgDraft?.subdomain || 'org-workspace',
      adminEmail: orgDraft?.adminEmail || 'admin@organization.internal',
      adminName: orgDraft?.adminName || 'Organization Administrator',
    }

    localStorage.setItem(CHECKOUT_SELECTION_KEY, JSON.stringify(checkoutData))
    toast({
      title: `${plan.name} Selected`,
      description: `Proceeding to PayOS checkout for ${plan.seatLimit} employee seats.`,
      variant: 'success',
    })
    navigate('/guest/checkout')
  }

  const formatPrice = (amount: number) => {
    if (currency === 'VND') {
      return `${amount.toLocaleString('vi-VN')} ₫`
    }
    return `$${amount}`
  }

  return (
    <GuestLayout currentStep={2}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="primary" className="mx-auto mb-1">
            <Crown size={12} className="mr-1.5" /> Subscription Selection
          </Badge>
          <Heading level={1} className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Transparent Pricing for Engineering Upskilling
          </Heading>
          <Text className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Choose the subscription tier scaled for your software engineering team. Every plan includes our adaptive knowledge graph engine and personalized skill tracing.
          </Text>

          {/* Currency & Frequency Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {/* Currency Selector */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  currency === 'USD' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('VND')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  currency === 'VND' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                VND (₫)
              </button>
            </div>

            {/* Monthly vs Annual Toggle */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-success/15 text-success font-extrabold px-1.5 py-0.2 rounded-full border border-success/20">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id
            const price =
              billingCycle === 'annual'
                ? currency === 'USD'
                  ? plan.priceUsdAnnual
                  : plan.priceVndAnnual
                : currency === 'USD'
                ? plan.priceUsdMonthly
                : plan.priceVndMonthly

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col transition-all duration-200 border-2 ${
                  plan.popular
                    ? 'border-primary shadow-md bg-gradient-to-b from-card via-card to-primary/5'
                    : isSelected
                    ? 'border-primary/60 shadow-xs bg-card'
                    : 'border-border shadow-xs bg-card hover:border-border/80'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles size={11} /> Most Recommended
                    </span>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-extrabold text-foreground">{plan.name}</CardTitle>
                    <Badge variant={plan.tier === 'Enterprise' ? 'warning' : 'secondary'} className="text-[11px] font-bold">
                      {plan.seatLimit} Seats
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground min-h-[36px] mt-1.5">
                    {plan.description}
                  </CardDescription>

                  <div className="pt-4 pb-2 border-b border-border/70">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/ month</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {billingCycle === 'annual'
                        ? `Billed annually (${formatPrice(price * 12)} / year)`
                        : 'Billed on a monthly recurring basis'}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 pb-6 text-xs">
                  <p className="font-bold text-foreground text-[11px] uppercase tracking-wider text-muted-foreground">
                    Included Capabilities
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90">
                        <div className="h-4 w-4 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-0 border-t border-border/40 pt-4">
                  <Button
                    type="button"
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full font-bold shadow-xs cursor-pointer"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    Select {plan.tier} Plan
                    <ChevronRight size={15} className="ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Feature comparison guarantee note */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Need custom seats or on-premises SLA?</h4>
              <p className="text-xs text-muted-foreground">
                All subscriptions feature dedicated tenant isolation and secure workforce analytics. You can upgrade seat limits anytime.
              </p>
            </div>
          </div>
          <Link to="/guest/register">
            <Button variant="ghost" size="sm" className="text-xs shrink-0">
              ← Edit Organization Info
            </Button>
          </Link>
        </div>
      </div>
    </GuestLayout>
  )
}
