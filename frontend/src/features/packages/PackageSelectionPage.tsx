import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card } from '../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import {
  createCompanyFromPackagePurchase,
  type PackageTier,
} from '../../shared/stores/companyStore'

interface PackageOption {
  tier: PackageTier
  name: string
  price: string
  period: string
  userLimit: number
  badge?: string
  popular?: boolean
  description: string
  features: string[]
}

const COMMON_FEATURES: string[] = [
  'Free Role Allocation: Distribute L&D Manager, Expert, or Employee roles freely',
  'Full Competency Ontology & Micro-skills Graph',
  'Automated Diagnostic Assessment Quiz Engine',
  'Adaptive Learning Pathways & Skill Gap Analysis',
  'Interactive Knowledge Graph Visualization',
  'Team Competency Heatmaps & Analytics',
  'JSON / CSV Blueprint & Question Bank Import',
  'Isolated Multi-Tenant Security & Priority Support',
]

const PACKAGES: PackageOption[] = [
  {
    tier: 'Starter',
    name: 'Starter Team',
    price: '$199',
    period: '/ month',
    userLimit: 20,
    description: 'All platform features included for teams up to 20 users.',
    features: [
      'Up to 20 Company User Seats',
      ...COMMON_FEATURES,
    ],
  },
  {
    tier: 'Growth',
    name: 'Professional Growth',
    price: '$499',
    period: '/ month',
    userLimit: 50,
    popular: true,
    badge: 'Most Popular',
    description: 'All platform features included for organizations up to 50 users.',
    features: [
      'Up to 50 Company User Seats',
      ...COMMON_FEATURES,
    ],
  },
  {
    tier: 'Enterprise',
    name: 'Enterprise Scale',
    price: '$999',
    period: '/ month',
    userLimit: 200,
    badge: 'High Capacity',
    description: 'All platform features included for enterprise scale up to 200 users.',
    features: [
      'Up to 200 Company User Seats',
      ...COMMON_FEATURES,
    ],
  },
]

export function PackageSelectionPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [companyName, setCompanyName] = React.useState('')
  const [selectedTier, setSelectedTier] = React.useState<PackageTier>('Growth')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Current logged in user info (guest)
  const userEmail = localStorage.getItem('auth_user') || 'guest.user@example.com'
  const userName = userEmail.includes('@')
    ? userEmail.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase())
    : 'Guest Administrator'

  const activePackage = PACKAGES.find((p) => p.tier === selectedTier) || PACKAGES[1]

  const handleOpenCheckout = (tier: PackageTier) => {
    setSelectedTier(tier)
    if (!companyName.trim()) {
      toast({
        title: 'Company Name Required',
        description: 'Please enter your organization or company name above before purchasing.',
        variant: 'destructive',
      })
      // Focus on input
      document.getElementById('company-name-input')?.focus()
      return
    }
    setIsConfirmModalOpen(true)
  }

  const handleConfirmPurchase = () => {
    setIsProcessing(true)

    setTimeout(() => {
      // 1. Create company in companyStore
      const createdCompany = createCompanyFromPackagePurchase(
        companyName,
        selectedTier,
        userEmail,
        userName
      )

      // 2. Upgrade role to L&D Manager
      localStorage.setItem('active_actor', 'ld-manager')
      localStorage.setItem('user_company_name', createdCompany.name)
      localStorage.setItem('user_company_id', createdCompany.id)

      setIsProcessing(false)
      setIsConfirmModalOpen(false)

      toast({
        title: 'Organization Provisioned Successfully!',
        description: `Welcome! Your role is now L&D Manager for "${createdCompany.name}". You can now add up to ${createdCompany.maxUsers} users.`,
        variant: 'success',
      })

      // 3. Navigate directly to L&D Manager User Directory
      navigate('/ld-manager/users')
    }, 900)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-8 pb-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="secondary" className="px-3 py-1 font-semibold text-primary">
            <Sparkles size={13} className="mr-1.5 inline" /> Select Your Organization Plan
          </Badge>
          <Heading level={1} size="display" className="tracking-tight text-foreground">
            Empower Your Workforce with Adaptive Competency Graphs
          </Heading>
          <Text variant="lead" className="text-muted-foreground max-w-2xl mx-auto">
            All plans include <strong className="text-foreground">identical, unrestricted platform capabilities</strong> with zero feature lockouts.
            Choose based solely on the number of user seats your organization requires.
          </Text>
        </div>

        {/* Company Name Input Section */}
        <Card className="max-w-xl mx-auto border-border p-5 rounded-2xl shadow-xs space-y-2">
          <label
            htmlFor="company-name-input"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Building size={14} className="text-primary" />
            Step 1: Enter Your Organization / Company Name *
          </label>
          <div className="flex gap-2">
            <Input
              id="company-name-input"
              type="text"
              placeholder="e.g. Acme Corporation, TechNova AI, or Global Robotics"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="text-sm h-11 bg-background"
              required
            />
          </div>
          <Text variant="caption" className="text-muted-foreground">
            This name will brand your company portal, ontology, learning modules, and user directory.
          </Text>
        </Card>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {PACKAGES.map((pkg) => {
            const isSelected = selectedTier === pkg.tier
            return (
              <div
                key={pkg.tier}
                onClick={() => setSelectedTier(pkg.tier)}
                className={`relative rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                  pkg.popular
                    ? 'border-primary shadow-md bg-card ring-2 ring-primary/20 scale-[1.02]'
                    : isSelected
                    ? 'border-primary/80 shadow-xs bg-card'
                    : 'border-border bg-card/60 hover:bg-card hover:border-border/80'
                }`}
              >
                {/* Header ribbon for popular */}
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary" className="font-bold text-[11px] px-3 shadow-xs">
                      {pkg.badge}
                    </Badge>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{pkg.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                    </div>
                  </div>

                  {/* Seat Limit Highlight Box */}
                  <div className="p-3 rounded-xl bg-secondary/60 border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">User Limit</span>
                    </div>
                    <span className="font-extrabold text-base text-primary font-mono">
                      {pkg.userLimit} Seats
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-black text-foreground">{pkg.price}</span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {pkg.period}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="pt-2 border-t border-border space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Included Capabilities
                    </span>
                    <ul className="space-y-2 text-xs">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="p-6 pt-0">
                  <Button
                    variant={pkg.popular ? 'primary' : 'outline'}
                    className="w-full font-bold h-10 flex items-center justify-center whitespace-nowrap text-xs sm:text-sm"
                    rightIcon={<ChevronRight size={15} className="shrink-0" />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenCheckout(pkg.tier)
                    }}
                  >
                    Select {pkg.name}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">100% Feature Parity</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Every tier gives you complete access to ontology modeling, diagnostic quizzes, knowledge graphs, and imports.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Instant Role Elevation</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your guest account immediately upgrades to Enterprise L&D Manager upon package
                selection.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">Flexible Seat Allocation</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Freely distribute your seats across L&D Managers, Subject Matter Experts, and Employees without restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Checkout Dialog */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                <DialogTitle>Confirm Package Subscription</DialogTitle>
                <DialogDescription>
                  Review your organization provisioning details before activating your workspace.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Organization Name:</span>
                <strong className="text-foreground text-sm">{companyName}</strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Subscription Tier:</span>
                <Badge variant="primary" className="font-semibold">
                  {activePackage.name}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Allocated Seat Limit:</span>
                <strong className="text-primary font-mono text-sm">
                  {activePackage.userLimit} Users
                </strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Billing Rate:</span>
                <strong className="text-foreground">
                  {activePackage.price} {activePackage.period}
                </strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Assigned Role:</span>
                <span className="font-bold text-success flex items-center gap-1">
                  <Check size={13} /> L&D Manager
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-secondary/50 border border-primary/20 text-[11px] text-muted-foreground flex items-center gap-2">
              <Lock size={14} className="text-primary shrink-0" />
              <span>
                Sandbox mode active: No credit card charge is incurred. Organization and seats are
                instantly provisioned.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles size={14} />}
              onClick={handleConfirmPurchase}
              disabled={isProcessing}
            >
              {isProcessing ? 'Provisioning Organization...' : 'Activate & Enter Workspace'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </WorkspaceLayout>
  )
}
