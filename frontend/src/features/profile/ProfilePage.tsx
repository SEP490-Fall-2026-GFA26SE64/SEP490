import * as React from 'react'
import {
  Building,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import {
  getUserProfile,
  updateUserPassword,
  updateUserProfileName,
  type ActorRole,
} from '../../shared/stores/userProfileStore'

export function ProfilePage() {
  const { toast } = useToast()

  // Determine current active actor
  const getInitialActor = (): ActorRole => {
    const saved = localStorage.getItem('active_actor') as ActorRole | null
    if (saved === 'expert' || saved === 'ld-manager' || saved === 'admin') {
      return saved
    }
    return 'employee'
  }

  const [activeActor] = React.useState<ActorRole>(getInitialActor)
  const [profile, setProfile] = React.useState(() => getUserProfile(activeActor))

  // Editable Name State
  const [fullNameInput, setFullNameInput] = React.useState(profile.name)
  const [isSavingName, setIsSavingName] = React.useState(false)

  // Change Password Form State
  const [newPasswordInput, setNewPasswordInput] = React.useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('')

  const [showNewInput, setShowNewInput] = React.useState(false)
  const [showConfirmInput, setShowConfirmInput] = React.useState(false)

  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  // Listen to profile / password events across windows or tabs
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      const updated = getUserProfile(activeActor)
      setProfile(updated)
      setFullNameInput(updated.name)
    }

    window.addEventListener('user_profile_updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate)
    }
  }, [activeActor])

  // Save Full Name
  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = fullNameInput.trim()
    if (!trimmed) {
      toast({
        title: 'Full Name Required',
        description: 'Please provide a valid full name for your profile.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingName(true)
    setTimeout(() => {
      updateUserProfileName(activeActor, trimmed)
      setIsSavingName(false)
      toast({
        title: 'Profile Updated',
        description: `Full name updated to "${trimmed}".`,
        variant: 'success',
      })
    }, 300)
  }

  // Handle Change Password Form Submission
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPasswordInput || newPasswordInput.length < 6) {
      toast({
        title: 'Invalid New Password',
        description: 'New password must contain at least 6 characters.',
        variant: 'destructive',
      })
      return
    }

    if (newPasswordInput !== confirmPasswordInput) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'The new password and confirmation password must match exactly.',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)

    setTimeout(() => {
      updateUserPassword(profile.email, newPasswordInput)
      setNewPasswordInput('')
      setConfirmPasswordInput('')
      setIsChangingPassword(false)

      toast({
        title: 'Password Changed Successfully',
        description: 'Your account security credentials have been updated.',
        variant: 'success',
      })
    }, 600)
  }

  // Reset Change Password form
  const handleResetPasswordForm = () => {
    setNewPasswordInput('')
    setConfirmPasswordInput('')
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-semibold text-primary">
                <ShieldCheck size={13} className="mr-1.5 inline" /> {profile.portal}
              </Badge>
            </div>
          }
        />

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Identity & Details */}
          <div className="lg:col-span-5 space-y-6">
            {/* User Identity Card */}
            <Card className="border-border shadow-xs overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-primary/15 via-secondary to-primary/5 border-b border-border" />
              <CardContent className="pt-0 relative px-6 pb-6">
                {/* Avatar Badge */}
                <div className="-mt-12 mb-4 flex items-end justify-between">
                  <div className="h-20 w-20 rounded-2xl bg-card text-primary border-2 border-primary/20 flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-background">
                    {profile.initials}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs text-success border-success/30 bg-success/5">
                    <CheckCircle2 size={11} className="mr-1 text-success" /> Active Account
                  </Badge>
                </div>

                <div>
                  <Heading level={2} size="section" className="text-foreground">
                    {profile.name}
                  </Heading>
                  <p className="text-sm font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail size={13} /> {profile.email}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Building size={14} className="text-primary" /> Organization
                  </span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">
                    {profile.details[0]?.value}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Editable Profile Name Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck size={16} className="text-primary" /> Personal Information
                </CardTitle>
                <CardDescription>
                  Update your display name visible across team matrices and learning pathways.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="full-name-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Full Name
                    </label>
                    <Input
                      id="full-name-input"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="e.g. Alex Chen"
                      leftIcon={<User size={15} />}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="email-address-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Email Address (Sign In ID)
                    </label>
                    <Input
                      id="email-address-input"
                      value={profile.email}
                      readOnly
                      disabled
                      leftIcon={<Mail size={15} />}
                      className="bg-muted/40 font-mono text-xs cursor-not-allowed"
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Your enterprise email is anchored to your organization identity.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSavingName || fullNameInput.trim() === profile.name}
                    className="w-full"
                    leftIcon={<Check size={14} />}
                  >
                    {isSavingName ? 'Saving...' : 'Save Name Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Workspace & Role Metadata */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield size={16} className="text-primary" /> Role & Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {profile.details.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1.5 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <strong className="text-foreground text-right">{item.value}</strong>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Change Password & Security Standards */}
          <div className="lg:col-span-7 space-y-6">
            {/* Change Password Form Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" /> Change Password
                </CardTitle>
                <CardDescription>
                  Enter your desired new password below to update your security credentials. To protect your account, existing passwords cannot be viewed or retrieved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Field 1: New Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                    >
                      <span>New Password *</span>
                      <span className="text-[11px] font-normal normal-case text-muted-foreground">
                        Min. 6 characters
                      </span>
                    </label>
                    <div className="relative flex items-center w-full">
                      <Input
                        id="new-password-input"
                        type={showNewInput ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Create strong new password"
                        leftIcon={<KeyRound size={15} />}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewInput((prev) => !prev)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={showNewInput ? 'Hide' : 'Show'}
                      >
                        {showNewInput ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Confirm New Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm-password-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Confirm New Password *
                    </label>
                    <div className="relative flex items-center w-full">
                      <Input
                        id="confirm-password-input"
                        type={showConfirmInput ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Re-enter new password"
                        leftIcon={<KeyRound size={15} />}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmInput((prev) => !prev)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={showConfirmInput ? 'Hide' : 'Show'}
                      >
                        {showConfirmInput ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Quick validation preview */}
                    {newPasswordInput && confirmPasswordInput && (
                      <p
                        className={`text-xs mt-1 flex items-center gap-1 font-medium ${
                          newPasswordInput === confirmPasswordInput ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {newPasswordInput === confirmPasswordInput ? (
                          <>
                            <CheckCircle2 size={13} /> Passwords match
                          </>
                        ) : (
                          <>Passwords do not match</>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={
                        isChangingPassword ||
                        !newPasswordInput ||
                        !confirmPasswordInput ||
                        newPasswordInput !== confirmPasswordInput ||
                        newPasswordInput.length < 6
                      }
                      leftIcon={<Lock size={14} />}
                    >
                      {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetPasswordForm}
                      disabled={isChangingPassword || (!newPasswordInput && !confirmPasswordInput)}
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Credential Protection & Standards Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" /> Credential Protection & Standards
                </CardTitle>
                <CardDescription>
                  Enterprise authentication and data isolation standards applied to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                  <Lock size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Zero-Knowledge Credential Policy</strong>
                    Existing passwords are encrypted using one-way cryptographic hashing and cannot be viewed, revealed, or retrieved by any user or administrator.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                  <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Zero-Trust Credential & Session Sync</strong>
                    Updated credentials synchronize instantaneously across all portals (Employee, Expert, L&D Manager, Administrator) within your enterprise.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
