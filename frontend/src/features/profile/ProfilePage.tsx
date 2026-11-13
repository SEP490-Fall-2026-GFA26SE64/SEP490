import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import {
  Award,
  Briefcase,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { Heading } from '../../shared/components/typography/Heading'
import { Badge } from '../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import { WorkspaceSessionContext } from '../../shared/auth/workspaceSession'
import { decodeJobPositionWithTargetRole, changePassword } from '../subscription/subscriptionApi'
import {
  getUserProfile,
  type ActorRole,
} from '../../shared/stores/userProfileStore'
import { workspaceFetch } from '../../shared/api/workspaceFetch'
import { resolveWorkspaceOrgId } from '../../shared/stores/companyStore'

interface EmployeeAssignmentData {
  jobPositionCode?: string | null
  jobPositionName?: string | null
  departmentId?: string | null
  departmentName?: string | null
  roleId?: string | null
  roleCode?: string | null
  roleTitle?: string | null
  level?: string | null
}

export function ProfilePage() {
  const { language } = useTranslation()
  const { toast } = useToast()
  const navigate = useNavigate()
  const session = React.useContext(WorkspaceSessionContext)
  const sessionIdentity = session?.identity

  // Determine current active actor
  const getInitialActor = (): ActorRole => {
    const saved = localStorage.getItem('active_actor') as ActorRole | null
    if (saved === 'expert' || saved === 'ld-manager' || saved === 'admin') {
      return saved
    }
    return 'employee'
  }

  const [activeActor] = React.useState<ActorRole>(getInitialActor)
  const [profile, setProfile] = React.useState(() => {
    const base = getUserProfile(activeActor)
    if (sessionIdentity) {
      const email = sessionIdentity.email || base.email
      const name = sessionIdentity.fullName || base.name
      const initials = name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'U'
      const orgName = sessionIdentity.organizationName || base.details[0]?.value || 'Enterprise Workspace'
      return {
        ...base,
        name,
        email,
        initials,
        details: [
          { label: 'Department / Org', value: orgName },
          ...base.details.slice(1),
        ],
      }
    }
    return base
  })

  // Sync profile when sessionIdentity updates
  React.useEffect(() => {
    if (sessionIdentity) {
      const email = sessionIdentity.email || profile.email
      const name = sessionIdentity.fullName || profile.name
      const initials = name.split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'U'
      const orgName = sessionIdentity.organizationName || profile.details[0]?.value || 'Enterprise Workspace'
      setProfile(prev => ({
        ...prev,
        name,
        email,
        initials,
        details: [
          { label: 'Department / Org', value: orgName },
          ...prev.details.slice(1),
        ],
      }))
    }
  }, [sessionIdentity])

  // Assigned Job Position & Placement State
  const [assignment, setAssignment] = React.useState<EmployeeAssignmentData | null>(() => {
    if (typeof localStorage === 'undefined') return null
    try {
      const email = (sessionIdentity?.email || '').toLowerCase().trim()
      if (email) {
        const raw = localStorage.getItem(`alg_employee_assignment_${email}`)
        if (raw) return JSON.parse(raw) as EmployeeAssignmentData
      }
    } catch {}
    return null
  })

  React.useEffect(() => {
    let cancelled = false
    async function loadBackendAssignment() {
      try {
        let userEmail = (sessionIdentity?.email || '').toLowerCase().trim()
        let orgId = sessionIdentity?.organizationId || ''

        if (!userEmail || !orgId) {
          const authRes = await workspaceFetch('/api/v1/workspace-auth/current')
          if (authRes.ok) {
            const authData = await authRes.json()
            if (authData.email) userEmail = authData.email.toLowerCase().trim()
            if (authData.organizationId) orgId = authData.organizationId
            if (authData.fullName) {
              setProfile(prev => ({
                ...prev,
                name: authData.fullName,
                email: userEmail,
                initials: authData.fullName.split(' ').filter(Boolean).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() || 'U',
              }))
            }
          }
        }

        if (!orgId) {
          orgId = resolveWorkspaceOrgId()
        }

        // 1. Fetch self assignment from backend (accessible to employee, expert, ld, admin)
        if (orgId) {
          try {
            const myRes = await workspaceFetch(
              `/api/v1/organizations/${encodeURIComponent(orgId)}/subscription/my-assignment`,
            )
            if (myRes.ok) {
              const myData = await myRes.json()
              if (myData && !cancelled) {
                const decoded = decodeJobPositionWithTargetRole(myData.jobPositionName)
                const resolvedAssignment: EmployeeAssignmentData = {
                  departmentId: myData.departmentId || null,
                  departmentName: myData.departmentName || null,
                  jobPositionCode: myData.jobPositionReferenceId || null,
                  jobPositionName: decoded.cleanJobPositionName || myData.jobPositionName || null,
                  roleId: myData.targetRoleId || decoded.targetRoleId || null,
                  roleCode: myData.targetRoleCode || decoded.targetRoleCode || null,
                  roleTitle: myData.targetRoleName || decoded.targetRoleName || null,
                  level: myData.targetRoleLevel || decoded.targetRoleLevel || null,
                }
                setAssignment(resolvedAssignment)
                if (userEmail) {
                  try {
                    localStorage.setItem(`alg_employee_assignment_${userEmail}`, JSON.stringify(resolvedAssignment))
                  } catch {}
                }
                return
              }
            }
          } catch {}
        }

        // 2. Query workspace subscription members if accessible (for manager/admin)
        if (orgId) {
          try {
            const memRes = await workspaceFetch(
              `/api/v1/organizations/${encodeURIComponent(orgId)}/subscription/members`,
            )
            if (memRes.ok) {
              const members = await memRes.json()
              if (Array.isArray(members)) {
                const matched = members.find(
                  (m: any) => m.email && m.email.toLowerCase().trim() === userEmail,
                )
                if (matched && !cancelled) {
                  const decoded = decodeJobPositionWithTargetRole(matched.jobPositionName)
                  const resolvedAssignment: EmployeeAssignmentData = {
                    departmentId: matched.departmentId || null,
                    departmentName: matched.departmentName || null,
                    jobPositionCode: matched.jobPositionReferenceId || null,
                    jobPositionName: decoded.cleanJobPositionName || matched.jobPositionName || null,
                    roleId: matched.targetRoleId || decoded.targetRoleId || null,
                    roleCode: matched.targetRoleCode || decoded.targetRoleCode || null,
                    roleTitle: matched.targetRoleName || decoded.targetRoleName || null,
                    level: matched.targetRoleLevel || decoded.targetRoleLevel || null,
                  }
                  setAssignment(resolvedAssignment)
                  if (userEmail) {
                    try {
                      localStorage.setItem(`alg_employee_assignment_${userEmail}`, JSON.stringify(resolvedAssignment))
                    } catch {}
                  }
                  return
                }
              }
            }
          } catch {}
        }

        // 3. Fallback to user-specific localStorage only if matching userEmail
        if (userEmail) {
          const localRaw = localStorage.getItem(`alg_employee_assignment_${userEmail}`)
          if (localRaw) {
            const parsed = JSON.parse(localRaw) as EmployeeAssignmentData
            if (!cancelled && parsed) {
              setAssignment(parsed)
            }
          }
        }
      } catch {}
    }

    loadBackendAssignment()
    return () => {
      cancelled = true
    }
  }, [sessionIdentity?.email, sessionIdentity?.organizationId, profile.email, activeActor])

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState('')
  const [newPasswordInput, setNewPasswordInput] = React.useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('')

  const [showCurrentInput, setShowCurrentInput] = React.useState(false)
  const [showNewInput, setShowNewInput] = React.useState(false)
  const [showConfirmInput, setShowConfirmInput] = React.useState(false)

  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  // Listen to profile updates across windows or tabs
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      const updated = getUserProfile(activeActor)
      setProfile(updated)
    }

    window.addEventListener('user_profile_updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('user_profile_updated', handleProfileUpdate)
    }
  }, [activeActor])

  // Handle Change Password Form Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPasswordInput) {
      toast({
        title: language === 'vi' ? 'Thiếu mật khẩu hiện tại' : 'Current Password Required',
        description: language === 'vi' ? 'Vui lòng nhập mật khẩu hiện tại của bạn.' : 'Please enter your current password.',
        variant: 'destructive',
      })
      return
    }

    if (!newPasswordInput || newPasswordInput.length < 12 || newPasswordInput.length > 128) {
      toast({
        title: language === 'vi' ? 'Mật khẩu mới không hợp lệ' : 'Invalid New Password',
        description: language === 'vi' ? 'Mật khẩu mới phải có từ 12 đến 128 ký tự.' : 'New password must contain between 12 and 128 characters.',
        variant: 'destructive',
      })
      return
    }

    if (newPasswordInput === currentPasswordInput) {
      toast({
        title: language === 'vi' ? 'Mật khẩu trùng lặp' : 'Password Unchanged',
        description: language === 'vi' ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : 'New password must be different from your current password.',
        variant: 'destructive',
      })
      return
    }

    if (newPasswordInput !== confirmPasswordInput) {
      toast({
        title: language === 'vi' ? 'Mật khẩu không khớp' : 'Passwords Do Not Match',
        description: language === 'vi' ? 'Mật khẩu mới và xác nhận mật khẩu phải trùng khớp.' : 'The new password and confirmation password must match exactly.',
        variant: 'destructive',
      })
      return
    }

    setIsChangingPassword(true)

    try {
      await changePassword(currentPasswordInput, newPasswordInput)
      setCurrentPasswordInput('')
      setNewPasswordInput('')
      setConfirmPasswordInput('')
      setIsChangingPassword(false)

      toast({
        title: language === 'vi' ? 'Đổi mật khẩu thành công' : 'Password Changed Successfully',
        description: language === 'vi'
          ? 'Tất cả các phiên đăng nhập đã được chấm dứt để bảo mật. Đang chuyển về trang đăng nhập...'
          : 'All active sessions have been terminated for security. Redirecting to sign in...',
        variant: 'success',
      })

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err: unknown) {
      setIsChangingPassword(false)
      const message = err instanceof Error ? err.message : (language === 'vi' ? 'Không thể cập nhật mật khẩu.' : 'Unable to update password.')
      toast({
        title: language === 'vi' ? 'Đổi mật khẩu thất bại' : 'Password Change Failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Reset Change Password form
  const handleResetPasswordForm = () => {
    setCurrentPasswordInput('')
    setNewPasswordInput('')
    setConfirmPasswordInput('')
    setShowCurrentInput(false)
    setShowNewInput(false)
    setShowConfirmInput(false)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Header */}
        <PageHeader
          title={language === 'vi' ? 'Hồ sơ cá nhân' : 'My Profile'}
          description={
            language === 'vi'
              ? 'Xem thông tin định danh không gian làm việc, phân công chuyên môn và quản lý bảo mật tài khoản.'
              : 'View your workspace identity, organizational placement, and manage account security credentials.'
          }
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-semibold text-primary">
                <ShieldCheck size={13} className="mr-1.5 inline" /> {profile.portal}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs text-success border-success/30 bg-success/5">
                <CheckCircle2 size={11} className="mr-1 text-success inline" /> {language === 'vi' ? 'Tài khoản hoạt động' : 'Active Account'}
              </Badge>
            </div>
          }
        />

        {/* Balanced 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Identity & Security Standards (5 cols) */}
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
                  <Badge variant="outline" className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                    <Lock size={11} className="text-primary" />
                    <span>{language === 'vi' ? 'Quản lý bởi Admin' : 'Admin Governed'}</span>
                  </Badge>
                </div>

                <div>
                  <Heading level={2} size="section" className="text-foreground font-bold">
                    {profile.name}
                  </Heading>
                  <p className="text-sm font-mono text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail size={13} className="text-primary/70 shrink-0" /> {profile.email}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building size={14} className="text-primary" /> {language === 'vi' ? 'Tổ chức' : 'Organization'}
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {profile.details[0]?.value}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Briefcase size={14} className="text-primary" /> {language === 'vi' ? 'Vị trí công việc' : 'Assigned Job Position'}
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]" title={assignment?.jobPositionName || 'Unassigned'}>
                      {assignment?.jobPositionName || (language === 'vi' ? 'Chưa phân công' : 'Unassigned')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Shield size={14} className="text-primary" /> {language === 'vi' ? 'Cổng truy cập' : 'Portal Access'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {profile.portal}
                    </span>
                  </div>
                </div>

                {sessionIdentity?.roles?.includes('EMPLOYEE') && (
                  <Link
                    to="/employee/my-mastery"
                    className={buttonVariants({ variant: 'outline', className: 'mt-4 w-full gap-2 text-primary' })}
                  >
                    <Award size={16} />
                    {language === 'vi' ? 'Xem hồ sơ kiến thức & năng lực' : 'View knowledge profile'}
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Credential Protection & Standards Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" /> {language === 'vi' ? 'Bảo mật & Quyền riêng tư tài khoản' : 'Password Security & Privacy'}
                </CardTitle>
                <CardDescription>
                  {language === 'vi'
                    ? 'Các tiêu chuẩn bảo vệ dữ liệu và bảo mật đăng nhập áp dụng cho tài khoản của bạn.'
                    : 'Enterprise security and data protection standards applied to your account.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                  <Lock size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">
                      {language === 'vi' ? 'Bảo mật thông tin đăng nhập tuyệt đối' : 'Strict Credential Privacy'}
                    </strong>
                    {language === 'vi'
                      ? 'Mật khẩu được lưu trữ an toàn một chiều và không ai có thể xem hay khôi phục, kể cả quản trị viên hệ thống.'
                      : 'Passwords are securely stored with one-way encryption and cannot be viewed or retrieved by anyone, including administrators.'}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                  <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">
                      {language === 'vi' ? 'Hủy phiên đăng nhập tức thì' : 'Immediate Session Revocation'}
                    </strong>
                    {language === 'vi'
                      ? 'Khi đổi mật khẩu, toàn bộ phiên đăng nhập đang hoạt động trên các thiết bị sẽ được tự động đăng xuất để bảo vệ an toàn cho tài khoản.'
                      : 'When your password is updated, all active sign-in sessions across devices are immediately terminated to protect your account.'}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/30 border border-primary/20 text-xs">
                  <UserCheck size={15} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">
                      {language === 'vi' ? 'Chính sách quản lý định danh người dùng' : 'Institutional Identity Governance'}
                    </strong>
                    {language === 'vi'
                      ? 'Để đảm bảo tính xác thực của chứng chỉ đào tạo và hồ sơ kiểm toán tổ chức, họ tên và email đăng nhập của bạn được quản lý trực tiếp bởi Quản trị viên tổ chức (Admin).'
                      : 'To guarantee verified records across pathways and audit reports, member names and registered emails are maintained exclusively by your Workspace Administrator.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Organizational Placement & Password Management (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Assigned Job Position & Career Placement Card */}
            <Card className="border-border shadow-xs" data-testid="profile-assigned-position-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase size={16} className="text-primary" /> {language === 'vi' ? 'Vị trí công việc & Phân công lộ trình' : 'Assigned Job Position & Placement'}
                  </CardTitle>
                  <Badge variant="outline" className="text-primary border-primary/30 text-[10px] font-bold">
                    ADMIN ASSIGNED
                  </Badge>
                </div>
                <CardDescription>
                  {language === 'vi'
                    ? 'Thông tin phân công vị trí ngành, phòng ban và cấp bậc khởi điểm được thiết lập bởi Quản trị viên.'
                    : 'Enterprise role governance, industry classification, and starting career placement assigned by your workspace administrator.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Official Member Name & Sign-in Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {language === 'vi' ? 'Họ và tên thành viên' : 'Official Full Name'}
                    </span>
                    <span className="text-sm font-semibold text-foreground block mt-1 break-words">
                      {profile.name}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {language === 'vi' ? 'Email tài khoản (Tên đăng nhập)' : 'Sign-in Account Email'}
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground block mt-1 break-all">
                      {profile.email}
                    </span>
                  </div>
                </div>

                {/* Industry Job Position and Department Placement */}
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      {language === 'vi' ? 'Vị trí công việc ngành (O*NET)' : 'Industry Job Position'}
                    </span>
                    <strong className="text-sm font-semibold text-foreground block mt-0.5" data-testid="profile-job-position-name">
                      {assignment?.jobPositionName || assignment?.jobPositionCode || (language === 'vi' ? 'Chưa phân công' : 'Unassigned')}
                    </strong>
                  </div>

                  <div className="pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        {language === 'vi' ? 'Phòng ban trực thuộc' : 'Assigned Department'}
                      </span>
                      <span className="text-xs font-medium text-foreground block mt-0.5" data-testid="profile-department-name">
                        {assignment?.departmentName || (language === 'vi' ? 'Chưa phân công' : 'Unassigned')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        {language === 'vi' ? 'Cấp bậc phân công khởi điểm' : 'Starting Career Placement'}
                      </span>
                      <span className="text-xs font-medium text-primary flex items-center gap-1.5 mt-0.5" data-testid="profile-role-level">
                        <Award size={13} className="shrink-0" />
                        <span>
                          {assignment?.roleTitle
                            ? `${assignment.roleTitle}${assignment.level ? ` · ${assignment.level}` : ''}`
                            : (language === 'vi' ? 'Chưa phân công' : 'Unassigned')}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Form Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" /> {language === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {language === 'vi'
                    ? 'Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật thông tin bảo mật cho tài khoản của bạn.'
                    : 'Enter your current password and a new password to update your account security credentials.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Field 0: Current Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="current-password-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                    >
                      <span>{language === 'vi' ? 'Mật khẩu hiện tại *' : 'Current Password *'}</span>
                    </label>
                    <div className="relative flex items-center w-full">
                      <Input
                        id="current-password-input"
                        type={showCurrentInput ? 'text' : 'password'}
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        placeholder={language === 'vi' ? 'Nhập mật khẩu hiện tại' : 'Enter your current password'}
                        leftIcon={<KeyRound size={15} />}
                        className="pr-10"
                        disabled={isChangingPassword}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentInput((prev) => !prev)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={showCurrentInput ? 'Hide' : 'Show'}
                      >
                        {showCurrentInput ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Field 1: New Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-password-input"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                    >
                      <span>{language === 'vi' ? 'Mật khẩu mới *' : 'New Password *'}</span>
                      <span className="text-[11px] font-normal normal-case text-muted-foreground">
                        {language === 'vi' ? 'Từ 12–128 ký tự' : '12–128 characters'}
                      </span>
                    </label>
                    <div className="relative flex items-center w-full">
                      <Input
                        id="new-password-input"
                        type={showNewInput ? 'text' : 'password'}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder={language === 'vi' ? 'Tạo mật khẩu mới mạnh mẽ' : 'Create strong new password'}
                        leftIcon={<KeyRound size={15} />}
                        className="pr-10"
                        disabled={isChangingPassword}
                        required
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
                      {language === 'vi' ? 'Xác nhận mật khẩu mới *' : 'Confirm New Password *'}
                    </label>
                    <div className="relative flex items-center w-full">
                      <Input
                        id="confirm-password-input"
                        type={showConfirmInput ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder={language === 'vi' ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                        leftIcon={<KeyRound size={15} />}
                        className="pr-10"
                        disabled={isChangingPassword}
                        required
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
                            <CheckCircle2 size={13} /> {language === 'vi' ? 'Mật khẩu khớp' : 'Passwords match'}
                          </>
                        ) : (
                          <>{language === 'vi' ? 'Mật khẩu không khớp' : 'Passwords do not match'}</>
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
                        !currentPasswordInput ||
                        !newPasswordInput ||
                        !confirmPasswordInput ||
                        newPasswordInput !== confirmPasswordInput ||
                        newPasswordInput.length < 12 ||
                        newPasswordInput === currentPasswordInput
                      }
                      leftIcon={<Lock size={14} />}
                    >
                      {isChangingPassword
                        ? (language === 'vi' ? 'Đang cập nhật mật khẩu...' : 'Updating Password...')
                        : (language === 'vi' ? 'Đổi mật khẩu' : 'Change Password')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetPasswordForm}
                      disabled={isChangingPassword || (!currentPasswordInput && !newPasswordInput && !confirmPasswordInput)}
                    >
                      {language === 'vi' ? 'Đặt lại biểu mẫu' : 'Reset Form'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
