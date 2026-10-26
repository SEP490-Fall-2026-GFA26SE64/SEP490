import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Progress } from '../../shared/components/ui/Progress'
import { useToast } from '../../shared/hooks/useToast'
import { createCompanyFromPackagePurchase, setActiveCompanyId, type PackageTier } from '../../shared/stores/companyStore'
import { logPlatformEvent } from '../platform-admin/platformAdminStore'
import { GuestLayout } from './GuestLayout'

const CHECKOUT_SELECTION_KEY = 'adaptlearn_selected_plan_checkout'

interface ProvisionStep {
  id: string
  label: string
  detail: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface CheckoutPlanData {
  tier: PackageTier
  organizationName: string
  adminEmail: string
  adminName: string
  seatLimit: number
  subdomain: string
}

export function WorkspaceProvisioningPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [checkoutData] = React.useState<CheckoutPlanData>(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_SELECTION_KEY)
      if (raw) return JSON.parse(raw) as CheckoutPlanData
    } catch {
      // fallback
    }
    return {
      tier: 'Growth',
      organizationName: 'TechNova Cognitive Labs',
      adminEmail: 'admin@technova.io',
      adminName: 'Elena Rostova',
      seatLimit: 50,
      subdomain: 'technova',
    }
  })

  const [steps, setSteps] = React.useState<ProvisionStep[]>([
    {
      id: 'step-1',
      label: 'PayOS Payment Webhook Validation',
      detail: 'Cryptographic HMAC-SHA256 signature verified against platform secret.',
      status: 'completed',
    },
    {
      id: 'step-2',
      label: 'Tenant Workspace Isolation & Storage',
      detail: 'Configured secure organization database space, department structures, and seat quotas.',
      status: 'in_progress',
    },
    {
      id: 'step-3',
      label: 'Knowledge & Competency Graph Engine',
      detail: 'Initialized organizational competency taxonomy and learning path structures.',
      status: 'pending',
    },
    {
      id: 'step-4',
      label: 'System Administrator & Access Entitlements',
      detail: 'Activated administrative credentials with designated organization authority.',
      status: 'pending',
    },
  ])

  const [createdCompanyId, setCreatedCompanyId] = React.useState<string>('')
  const [isAllComplete, setIsAllComplete] = React.useState(false)

  // Automatic step-by-step progression simulation
  React.useEffect(() => {
    const timer1 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 'step-2' ? { ...s, status: 'completed' } : s.id === 'step-3' ? { ...s, status: 'in_progress' } : s
        )
      )
    }, 1200)

    const timer2 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 'step-3' ? { ...s, status: 'completed' } : s.id === 'step-4' ? { ...s, status: 'in_progress' } : s
        )
      )
    }, 2400)

    const timer3 = setTimeout(() => {
      // Actually create the company in companyStore!
      const newComp = createCompanyFromPackagePurchase(
        checkoutData.organizationName || 'New Organization',
        checkoutData.tier || 'Growth',
        checkoutData.adminEmail || 'admin@org.internal',
        checkoutData.adminName || 'System Administrator'
      )
      setCreatedCompanyId(newComp.id)

      logPlatformEvent({
        organizationId: newComp.id,
        organizationName: newComp.name,
        actor: 'Workspace Provisioner',
        action: 'TENANT_PROVISIONED',
        details: `Workspace "${newComp.name}" successfully provisioned with ${newComp.maxUsers} seats (${newComp.packageTier} Tier).`,
        severity: 'success',
      })

      setSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })))
      setIsAllComplete(true)

      toast({
        title: 'Workspace Provisioned!',
        description: `Welcome to ${newComp.name}. Your workspace is ready.`,
        variant: 'success',
      })
    }, 3600)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [checkoutData, toast])

  const handleLaunchWorkspace = (targetPortal: 'admin' | 'ld-manager') => {
    if (createdCompanyId) {
      setActiveCompanyId(createdCompanyId)
    }
    if (targetPortal === 'admin') {
      localStorage.setItem('active_actor', 'admin')
      navigate('/admin/dashboard')
    } else {
      localStorage.setItem('active_actor', 'ld-manager')
      navigate('/ld-manager/occupations')
    }
  }

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  return (
    <GuestLayout currentStep={4}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant={isAllComplete ? 'success' : 'primary'} className="mx-auto mb-1">
            {isAllComplete ? (
              <CheckCircle2 size={12} className="mr-1.5" />
            ) : (
              <RefreshCw size={12} className="animate-spin mr-1.5" />
            )}
            {isAllComplete ? 'Provisioning Completed' : 'Automated Workspace Provisioning'}
          </Badge>

          <Heading level={1} className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAllComplete ? 'Your Workspace is Ready!' : 'Setting Up Your Organization'}
          </Heading>
          <Text className="text-muted-foreground text-sm max-w-lg mx-auto">
            {isAllComplete
              ? `Workspace credentials and learning systems have been initialized for ${checkoutData.organizationName}.`
              : 'Configuring secure organization database, competency graph models, and administrative entitlements...'}
          </Text>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Setup Progress</span>
            <span className="font-mono text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Stepper Cards */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Automated Tenant Provisioning Sequence</span>
              <span className="text-xs font-mono text-muted-foreground">Tenant: {checkoutData.subdomain || 'org'}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                  step.status === 'completed'
                    ? 'border-success/30 bg-success/5 text-foreground'
                    : step.status === 'in_progress'
                    ? 'border-primary/40 bg-secondary/60 text-foreground ring-2 ring-primary/10'
                    : 'border-border bg-muted/20 text-muted-foreground'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {step.status === 'completed' ? (
                    <div className="h-6 w-6 rounded-full bg-success text-white flex items-center justify-center">
                      <CheckCircle2 size={15} />
                    </div>
                  ) : step.status === 'in_progress' ? (
                    <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
                      <RefreshCw size={13} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-xs font-bold font-mono">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">{step.label}</h4>
                    <span className="text-[11px] font-mono font-semibold capitalize">
                      {step.status === 'completed' ? (
                        <span className="text-success">Done</span>
                      ) : step.status === 'in_progress' ? (
                        <span className="text-primary font-bold">In progress...</span>
                      ) : (
                        <span className="text-muted-foreground">Queued</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>

          {isAllComplete && (
            <CardFooter className="border-t border-border/70 pt-5 pb-5 bg-gradient-to-r from-card via-secondary/30 to-card flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                <ShieldCheck size={18} className="text-success shrink-0" />
                <span>
                  Admin Account: <strong>{checkoutData.adminEmail}</strong> ({checkoutData.tier} Tier)
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => handleLaunchWorkspace('ld-manager')}
                  className="w-full sm:w-auto text-xs"
                >
                  Enter as L&D Manager
                </Button>
                <Button
                  variant="primary"
                  size="default"
                  onClick={() => handleLaunchWorkspace('admin')}
                  className="w-full sm:w-auto font-bold shadow-xs flex items-center gap-1.5"
                >
                  <span>Launch Admin Console</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </GuestLayout>
  )
}
