import * as React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Globe,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { useToast } from '../../shared/hooks/useToast'
import { GuestLayout } from './GuestLayout'

const DRAFT_STORAGE_KEY = 'adaptlearn_guest_registration_draft'

export interface RegistrationDraft {
  organizationName: string
  subdomain: string
  industry: string
  headcount: string
  adminName: string
  adminEmail: string
  isEmailVerified: boolean
}

export function GuestRegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm] = React.useState<RegistrationDraft>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // fallback
    }
    return {
      organizationName: '',
      subdomain: '',
      industry: 'Software Engineering & AI',
      headcount: '50 - 200 employees',
      adminName: '',
      adminEmail: '',
      isEmailVerified: false,
    }
  })

  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [hasDraft, setHasDraft] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Verification code modal state
  const [isVerifyOpen, setIsVerifyOpen] = React.useState(false)
  const [verificationCode, setVerificationCode] = React.useState('')
  const [simulatedCode, setSimulatedCode] = React.useState('849201')

  React.useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.organizationName || parsed.adminEmail) {
          setHasDraft(true)
        }
      } catch {
        // ignore
      }
    }
  }, [])

  // Auto-slugify organization name
  const handleOrgNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    setForm((prev) => ({
      ...prev,
      organizationName: val,
      subdomain: prev.subdomain && !prev.subdomain.startsWith(prev.organizationName.toLowerCase().slice(0, 3))
        ? prev.subdomain
        : slug,
    }))
  }

  const persistDraft = (updated: RegistrationDraft) => {
    setForm(updated)
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated))
  }

  const handleResetDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY)
    setForm({
      organizationName: '',
      subdomain: '',
      industry: 'Software Engineering & AI',
      headcount: '50 - 200 employees',
      adminName: '',
      adminEmail: '',
      isEmailVerified: false,
    })
    setPassword('')
    setConfirmPassword('')
    setHasDraft(false)
    toast({
      title: 'Draft Cleared',
      description: 'You can now start a fresh organization registration.',
      variant: 'info',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.organizationName.trim()) {
      toast({ title: 'Organization Name Required', description: 'Please enter your organization name.', variant: 'destructive' })
      return
    }
    if (!form.adminEmail.trim() || !form.adminEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid administrator work email.', variant: 'destructive' })
      return
    }
    if (!form.adminName.trim()) {
      toast({ title: 'Admin Name Required', description: 'Please specify the administrator full name.', variant: 'destructive' })
      return
    }
    if (password.length < 6) {
      toast({ title: 'Password Too Short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords Mismatch', description: 'The confirmation password does not match.', variant: 'destructive' })
      return
    }

    persistDraft(form)

    // Check if email verified
    if (!form.isEmailVerified) {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setSimulatedCode(code)
      setIsVerifyOpen(true)
      return
    }

    setIsSubmitting(true)
    // Otherwise navigate to plans
    navigate('/guest/plans')
  }

  const handleConfirmVerification = () => {
    if (verificationCode.trim() !== simulatedCode && verificationCode.trim() !== '123456') {
      toast({
        title: 'Invalid Verification Code',
        description: 'Please check your code or click "Auto-fill Demo Code" to continue.',
        variant: 'destructive',
      })
      return
    }

    const updated = { ...form, isEmailVerified: true }
    persistDraft(updated)
    setIsVerifyOpen(false)
    setIsSubmitting(true)
    toast({
      title: 'Email Verified Successfully',
      description: 'Account security check confirmed. Proceeding to subscription selection.',
      variant: 'success',
    })
    navigate('/guest/plans')
  }

  return (
    <GuestLayout currentStep={1}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Intro Banner */}
        <div className="text-center space-y-2">
          <Badge variant="primary" className="mx-auto mb-1">
            <Sparkles size={12} className="mr-1.5" /> Self-Service Workspace Onboarding
          </Badge>
          <Heading level={1} className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Register Your Organization Workspace
          </Heading>
          <Text className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Establish a private multi-tenant workspace with dedicated graph projections, competency models, and automated learning pathways.
          </Text>
        </div>

        {hasDraft && (
          <div className="p-3.5 rounded-xl border border-primary/20 bg-secondary/60 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <RotateCcw size={16} className="text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-foreground">
                Loaded saved registration draft for <strong>{form.organizationName || 'your organization'}</strong>.
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleResetDraft} className="text-xs h-7 text-muted-foreground hover:text-destructive">
              Clear Draft
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="border-b border-border/70 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                1. Organization Information
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Details about your company entity and tenant subdomain.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Organization Legal Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Cyberdyne Systems Labs"
                    value={form.organizationName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Workspace URL Slug <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                    <Globe size={14} className="text-muted-foreground mr-1.5 shrink-0" />
                    <input
                      type="text"
                      className="bg-transparent text-foreground font-mono focus:outline-none flex-1"
                      placeholder="workspace-slug"
                      value={form.subdomain}
                      onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                      required
                    />
                    <span className="text-muted-foreground font-mono">.adaptlearn.io</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Industry / Technology Domain
                  </label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  >
                    <option value="Software Engineering & AI">Software Engineering & AI</option>
                    <option value="Cloud Infrastructure & DevOps">Cloud Infrastructure & DevOps</option>
                    <option value="Data Engineering & Analytics">Data Engineering & Analytics</option>
                    <option value="Cybersecurity & Network Systems">Cybersecurity & Network Systems</option>
                    <option value="Enterprise Financial Technology">Enterprise Financial Technology</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Estimated Engineering Headcount
                  </label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={form.headcount}
                    onChange={(e) => setForm({ ...form, headcount: e.target.value })}
                  >
                    <option value="1 - 20 employees">1 - 20 employees (Starter)</option>
                    <option value="21 - 50 employees">21 - 50 employees (Growth)</option>
                    <option value="51 - 200 employees">51 - 200 employees (Enterprise)</option>
                    <option value="200+ employees">200+ enterprise seats</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Administrator Account */}
              <div className="pt-4 border-t border-border/70 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    2. Primary System Administrator Credentials
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This account will hold designated Organization Administrator and billing management authority.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      Administrator Full Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Elena Rostova"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        Work Email Address <span className="text-destructive">*</span>
                      </span>
                      {form.isEmailVerified && (
                        <Badge variant="success" className="text-[10px] py-0">
                          <CheckCircle2 size={10} className="mr-1" /> Verified
                        </Badge>
                      )}
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        type="email"
                        className="pl-9"
                        placeholder="elena@cyberdyne.io"
                        value={form.adminEmail}
                        onChange={(e) => setForm({ ...form, adminEmail: e.target.value, isEmailVerified: false })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        type="password"
                        className="pl-9"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      Confirm Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        type="password"
                        className="pl-9"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security callout */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-success mt-0.5 shrink-0" />
                <span>
                  All employee assessments, micro-skill competency profiles, and training ROI records are strictly isolated within your secure organization workspace.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground order-2 sm:order-1">
              ← Return to Login
            </Link>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isSubmitting ? 'Processing Workspace...' : 'Continue to Subscription Plans →'}
            </Button>
          </div>
        </form>

        {/* Verification Dialog */}
        <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen} className="max-w-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span>Verify Organization Work Email</span>
              </DialogTitle>
              <Badge variant="primary" className="text-[10px] font-bold">
                SECURITY CHECK
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter the 6-digit confirmation PIN sent to authorize workspace creation for <strong>{form.organizationName || 'your organization'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Top metadata panel */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Recipient Email</span>
                <strong className="font-mono text-foreground font-bold text-xs truncate block">{form.adminEmail}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Tenant Domain</span>
                <strong className="font-mono text-primary font-bold text-xs truncate block">{form.subdomain}.adaptlearn.io</strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px] font-medium">Organization Legal Name</span>
                <span className="text-foreground font-semibold text-xs">{form.organizationName}</span>
              </div>
            </div>

            {/* Demo code helper callout */}
            <div className="p-3 bg-secondary/80 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary shrink-0" />
                <span className="text-muted-foreground">Demo Verification PIN:</span>
              </div>
              <span className="font-mono font-bold tracking-widest text-primary text-sm bg-card px-2.5 py-0.5 rounded border border-primary/20 shadow-2xs">
                {simulatedCode}
              </span>
            </div>

            {/* Code input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Enter 6-Digit PIN
              </label>
              <Input
                className="text-center font-mono text-xl tracking-[0.3em] font-extrabold h-12 bg-background border-border"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-4 shrink-0">
            <button
              type="button"
              onClick={() => setVerificationCode(simulatedCode)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw size={12} />
              <span>Auto-fill Demo Code</span>
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsVerifyOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmVerification}>
                <CheckCircle2 size={13} className="mr-1.5" />
                Verify & Continue
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </GuestLayout>
  )
}
