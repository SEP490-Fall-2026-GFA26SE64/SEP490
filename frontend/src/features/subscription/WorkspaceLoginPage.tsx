import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2 } from 'lucide-react'
import { WorkspaceAuthLayout } from '../../shared/layouts/WorkspaceAuthLayout'
import { Input } from '../../shared/components/ui/Input'
import { Button } from '../../shared/components/ui/Button'
import { authenticate, completeTotp, getIdentity, setupTotp, request, type Identity } from './subscriptionApi'
import { Failure, Loading, useCopy } from './SubscriptionFeedback'
import { ROLE_HOME, singleWorkspaceRole } from '../../shared/auth/workspaceRole'
import { setActiveCompanyId } from '../../shared/stores/companyStore'

export function WorkspaceLoginPage() {
  const c = useCopy()
  const navigate = useNavigate()
  const cache = useQueryClient()
  const current = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [secret, setSecret] = useState<{ manualSecret: string; email: string } | null>(null)
  const session = identity ?? current.data
  const finish = (value: Identity) => {
    setIdentity(value); setCode(''); setPassword(''); cache.clear(); cache.setQueryData(['workspace-identity'], value); if (value.organizationId) { setActiveCompanyId(value.organizationId); }
  }
  const signIn = useMutation({ mutationFn: () => authenticate('sign-in', { email, password }), onSuccess: finish })
  const restart = useMutation({ mutationFn: () => request('/api/v1/workspace-auth/sign-out', 'POST'), onSuccess: () => {
    setIdentity(null); cache.clear(); void current.refetch()
  } })
  const verify = useMutation({ mutationFn: () => authenticate(recovery ? 'recovery' : 'totp/verify', { code }),
    onSuccess: value => { setRecovery(false); finish(value) } })
  const setup = useMutation({ mutationFn: setupTotp, onSuccess: setSecret })
  const confirm = useMutation({ mutationFn: () => completeTotp(code), onSuccess: result => { finish(result.identity); setSecret(null); setCodes(result.recoveryCodes) } })
  const ready = session?.stage === 'COMPLETE'
  const role = singleWorkspaceRole(session?.roles ?? [])
  const destination = role ? ROLE_HOME[role] : null
  const enrolling = session?.stage === 'SETUP_MFA' || session?.stage === 'SETUP_MFA_RECOVERY'
  const errors = [current.error, signIn.error, verify.error, setup.error, confirm.error, restart.error].filter(Boolean)
  return <WorkspaceAuthLayout title={c('Enterprise Sign In', 'Đăng nhập doanh nghiệp')}
    description={c('Enter your work credentials to access the adaptive learning platform.',
      'Nhập thông tin tài khoản công việc để truy cập nền tảng học tập thích ứng.')}>
      {current.isPending ? <Loading /> : ready ? <>
        <p role="status">{c('Authentication complete.', 'Xác thực hoàn tất.')}</p>
        {codes.length > 0 && <div className="space-y-3" data-sensitive>
          <p>{c('Save these single-use recovery codes privately. They are shown only once.', 'Lưu riêng các mã khôi phục dùng một lần. Chỉ hiển thị lần này.')}</p>
          <pre className="overflow-x-auto rounded border border-border bg-muted p-3 text-caption">{codes.join('\n')}</pre>
          <Button onClick={() => setCodes([])}>{c('I saved the recovery codes', 'Tôi đã lưu mã khôi phục')}</Button>
        </div>}
        {!destination && <Failure error={new Error(c('Your account must have exactly one recognized role. Contact your administrator.', 'Tài khoản phải có đúng một vai trò hợp lệ. Liên hệ quản trị viên.'))} />}
        <Button className="razor-submit-btn" disabled={codes.length > 0 || !destination} onClick={() => { if (destination) navigate(destination) }}>
          {c('Continue to workspace', 'Tiếp tục vào không gian')}
        </Button>
      </> : !session ? <form className="razor-form" onSubmit={event => { event.preventDefault(); signIn.mutate() }}>
        <label className="sr-only" htmlFor="workspace-email">{c('Email', 'Email')}</label>
        <div className="razor-input-wrapper">
          <Input id="workspace-email" className="razor-input" autoComplete="username" type="email" required
            placeholder={c('Enter your email', 'Nhập email của bạn')} value={email} onChange={event => setEmail(event.target.value)} />
          <span className="razor-input-circle-icon" aria-hidden="true" />
        </div>
        <label className="sr-only" htmlFor="workspace-password">{c('Password', 'Mật khẩu')}</label>
        <div className="razor-input-wrapper">
          <Input id="workspace-password" className="razor-input" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required
            placeholder={c('Password', 'Mật khẩu')} value={password} onChange={event => setPassword(event.target.value)} />
          <Button variant="ghost" className="razor-hide-btn" aria-controls="workspace-password"
            aria-label={showPassword ? c('Hide password', 'Ẩn mật khẩu') : c('Show password', 'Hiện mật khẩu')}
            onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? c('Hide', 'Ẩn') : c('Show', 'Hiện')}
          </Button>
        </div>
        <Button type="submit" className="razor-submit-btn" isLoading={signIn.isPending}>{c('Sign in', 'Đăng nhập')}</Button>
      </form> : session.stage === 'SIGN_IN_REQUIRED' ? <div className="space-y-3">
        <p>{c('Your administrator role requires a fresh sign-in and MFA.', 'Vai trò quản trị yêu cầu đăng nhập lại và MFA.')}</p>
        <Button className="razor-submit-btn" isLoading={restart.isPending} onClick={() => restart.mutate()}>{c('Sign in again', 'Đăng nhập lại')}</Button>
      </div> : enrolling ? <div className="space-y-4">
        <p>{c('Administrator access requires an authenticator.', 'Quyền quản trị yêu cầu ứng dụng xác thực.')}</p>
        {!secret ? <Button className="razor-submit-btn" isLoading={setup.isPending} onClick={() => setup.mutate()}>{c('Set up authenticator', 'Thiết lập ứng dụng xác thực')}</Button> :
          <form className="razor-form" onSubmit={event => { event.preventDefault(); confirm.mutate() }}>
            <div data-sensitive className="space-y-3">
              <QRCodeSVG className="mx-auto" value={`otpauth://totp/Adapt-Learn-Graph:${encodeURIComponent(secret.email)}?secret=${secret.manualSecret}&issuer=Adapt-Learn-Graph`} title={c('Authenticator QR code', 'Mã QR xác thực')} />
              <p className="break-all">{secret.manualSecret}</p>
            </div>
            <label className="block">{c('Authenticator code', 'Mã xác thực')}
              <span className="razor-input-wrapper"><Input className="razor-input" autoComplete="one-time-code" inputMode="numeric" required value={code} onChange={event => setCode(event.target.value)} /></span>
            </label>
            <Button type="submit" className="razor-submit-btn" isLoading={confirm.isPending}>{c('Confirm authenticator', 'Xác nhận ứng dụng')}</Button>
          </form>}
      </div> : <form className="razor-form" onSubmit={event => { event.preventDefault(); verify.mutate() }}>
        <label className="block">{recovery ? c('Recovery code', 'Mã khôi phục') : c('Authenticator code', 'Mã xác thực')}
          <span className="razor-input-wrapper"><Input className="razor-input" autoComplete="one-time-code" required value={code} onChange={event => setCode(event.target.value)} /></span>
        </label>
        <Button type="submit" className="razor-submit-btn" isLoading={verify.isPending}>{c('Verify', 'Xác minh')}</Button>
        <Button variant="link" onClick={() => { setRecovery(!recovery); setCode('') }}>{recovery ? c('Use authenticator', 'Dùng ứng dụng xác thực') : c('Use recovery code', 'Dùng mã khôi phục')}</Button>
      </form>}
      {errors.map((error, index) => <Failure key={index} error={error} />)}
  </WorkspaceAuthLayout>
}

export function MemberActivationPage() {
  const c = useCopy()
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const activation = useMutation({ mutationFn: async () => {
    if (password !== confirmation) throw new Error(c('Passwords do not match.', 'Mật khẩu không khớp.'))
    await request('/api/v1/workspace-auth/activate', 'POST', { token, password })
    window.history.replaceState(null, '', '/activate')
    setPassword(''); setConfirmation('')
  } })
  const invalid = Object.keys(fieldErrors).length > 0
  useEffect(() => {
    if (invalid || activation.isError) errorRef.current?.focus()
  }, [invalid, fieldErrors, activation.isError])
  return <WorkspaceAuthLayout title={c('Activate your account', 'Kích hoạt tài khoản')}
    description={c('Your organization invited you. Set your password to get started.', 'Bạn đã được tổ chức mời. Đặt mật khẩu để bắt đầu.')}>
      <p className="text-sm text-muted-foreground">{c('Your role is assigned by your administrator, not selected during activation.', 'Vai trò được quản trị viên chỉ định, không chọn lại khi kích hoạt.')}</p>
      {activation.isSuccess ? <div className="space-y-4">
        <p role="status" className="flex items-center gap-2 text-success"><CheckCircle2 size={20} aria-hidden="true" />{c('Account activated.', 'Đã kích hoạt tài khoản.')}</p>
        <p className="text-body-sm text-muted-foreground">{c('Sign in to enter the workspace for your assigned role.', 'Đăng nhập để vào không gian làm việc đúng vai trò của bạn.')}</p>
        <Link className="razor-submit-btn inline-flex items-center justify-center text-primary-foreground!" to="/login">{c('Sign in', 'Đăng nhập')}</Link>
      </div> :
        <form noValidate className="razor-form" onSubmit={event => {
          event.preventDefault()
          const errors: typeof fieldErrors = {}
          if ([...password].length < 12 || [...password].length > 128) errors.password = c('Use 12–128 characters.', 'Sử dụng từ 12–128 ký tự.')
          if (!confirmation || password !== confirmation) errors.confirmation = c('Passwords do not match.', 'Mật khẩu không khớp.')
          setFieldErrors(errors)
          if (Object.keys(errors).length === 0) activation.mutate()
        }}>
          {(invalid || activation.isError) && <div ref={errorRef} tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 outline-none focus:ring-2 focus:ring-ring">
            {invalid && <div role="alert" className="space-y-1 text-body-sm text-destructive">
              <p className="font-semibold">{c('Check your password fields', 'Kiểm tra các trường mật khẩu')}</p>
              {Object.entries(fieldErrors).map(([field, message]) => <p key={field}><a href={`#activation-${field}`} className="underline">{message}</a></p>)}
            </div>}
            {activation.isError && <Failure error={activation.error} />}
          </div>}
          <label className="block space-y-2 text-body-sm font-semibold">{c('Password', 'Mật khẩu')}<span className="razor-input-wrapper"><Input id="activation-password" className="razor-input" type="password" autoComplete="new-password" maxLength={256} required value={password}
            aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'activation-password-error' : 'activation-password-hint'} onChange={event => setPassword(event.target.value)} /></span></label>
          <p id="activation-password-hint" className="text-caption">{c('Use 12–128 characters. Password managers and paste are supported.', 'Dùng 12–128 ký tự. Hỗ trợ trình quản lý mật khẩu và thao tác dán.')}</p>
          {fieldErrors.password && <p id="activation-password-error" className="text-sm text-destructive">{fieldErrors.password}</p>}
          <label className="block space-y-2 text-body-sm font-semibold">{c('Confirm password', 'Xác nhận mật khẩu')}<span className="razor-input-wrapper"><Input id="activation-confirmation" className="razor-input" type="password" autoComplete="new-password" maxLength={256} required value={confirmation}
            aria-invalid={!!fieldErrors.confirmation} aria-describedby={fieldErrors.confirmation ? 'activation-confirmation-error' : undefined} onChange={event => setConfirmation(event.target.value)} /></span></label>
          {fieldErrors.confirmation && <p id="activation-confirmation-error" className="text-sm text-destructive">{fieldErrors.confirmation}</p>}
          <Button type="submit" className="razor-submit-btn" disabled={!token} isLoading={activation.isPending}>{c('Activate account', 'Kích hoạt tài khoản')}</Button>
          {!token && <p role="alert">{c('Open the activation link from your email.', 'Mở liên kết kích hoạt trong email.')}</p>}
          <p className="text-caption">{c('Employee, Expert and L&D Manager accounts sign in with a password, without MFA.', 'Nhân viên, Chuyên gia và Quản lý L&D đăng nhập bằng mật khẩu, không cần MFA.')}</p>
        </form>}
  </WorkspaceAuthLayout>
}
