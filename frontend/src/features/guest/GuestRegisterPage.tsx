import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Text } from '../../shared/components/typography/Text'
import { Badge } from '../../shared/components/ui/Badge'
import { Button, buttonVariants } from '../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { GuestLayout } from './GuestLayout'
import { useCopy } from '../subscription/SubscriptionFeedback'
import {
  confirmRegistrationTotp, getRegistration, HEADCOUNTS, INDUSTRIES, recoverRegistrationTotp,
  registerOrganization, RegistrationApiError, resendRegistrationEmail, setupRegistrationTotp,
  signInRegistration, signOutRegistration, verifyRegistrationEmail, verifyRegistrationTotp,
  type Enrollment, type RegistrationFields, type RegistrationView,
} from './registrationApi'

const SESSION_QUERY = ['registration-session'] as const
const SELECT_CLASS = 'h-10 w-full rounded-md border border-input bg-card px-3 text-body-sm text-foreground shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring'
const EMPTY_FORM: RegistrationFields = {
  organizationName: '', subdomain: null, industry: null, headcount: null, adminName: '', adminEmail: '',
}
const FieldErrors = React.createContext<Record<string, string>>({})

export function GuestRegisterPage({ mode = 'register' }: { mode?: 'register' | 'resume' }) {
  const c = useCopy()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [form, setForm] = React.useState<RegistrationFields>(EMPTY_FORM)
  const [password, setPassword] = React.useState('')
  const [confirmation, setConfirmation] = React.useState('')
  const [signInEmail, setSignInEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [recovering, setRecovering] = React.useState(false)
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null)
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null)
  const [failure, setFailure] = React.useState<RegistrationApiError | null>(null)
  const [entryStep, setEntryStep] = React.useState<1 | 2>(1)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [now, setNow] = React.useState(Date.now)
  const errorRef = React.useRef<HTMLDivElement>(null)
  const headingRef = React.useRef<HTMLDivElement>(null)
  const channelRef = React.useRef<BroadcastChannel | null>(null)

  const session = useQuery({
    queryKey: SESSION_QUERY,
    queryFn: ({ signal }) => getRegistration(signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: 'always',
    refetchInterval: query => query.state.data?.stage === 'VERIFY_EMAIL'
      && query.state.data.deliveryStatus === 'PENDING' ? 3000 : false,
  })
  const view = session.data

  const clearSecrets = React.useCallback(() => {
    setPassword('')
    setConfirmation('')
    setCode('')
    setEnrollment(null)
    setRecoveryCodes(null)
    setRecovering(false)
  }, [])

  React.useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('registration-session')
    channelRef.current = channel
    channel.onmessage = () => {
      clearSecrets()
      setForm(EMPTY_FORM)
      setSignInEmail('')
      setFailure(null)
      void client.cancelQueries({ queryKey: SESSION_QUERY }).then(() => {
        client.setQueryData(SESSION_QUERY, null)
        return client.invalidateQueries({ queryKey: SESSION_QUERY })
      })
    }
    return () => {
      channelRef.current = null
      channel.close()
    }
  }, [client, clearSecrets])

  React.useEffect(() => {
    if (failure) errorRef.current?.focus()
  }, [failure])

  React.useEffect(() => {
    if (view?.stage !== 'VERIFY_EMAIL') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [view?.stage])

  const command = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
    gcTime: 0,
    onMutate: () => setFailure(null),
    onError: (error: Error) => {
      const failure = error instanceof RegistrationApiError ? error
        : new RegistrationApiError(0, 'NETWORK_ERROR', 'Cannot reach the registration service. Check your connection and retry.')
      setFailure(failure)
      if (failure.field && ['organizationName', 'subdomain', 'industry', 'headcount'].includes(failure.field)) setEntryStep(1)
      if (failure.status === 401) {
        clearSecrets()
        client.setQueryData(SESSION_QUERY, null)
        navigate('/guest/resume', { replace: true })
      }
    },
    onSettled: (): void => { command.reset() },
  })

  async function accept(next: RegistrationView | null) {
    await client.cancelQueries({ queryKey: SESSION_QUERY })
    client.setQueryData(SESSION_QUERY, next)
    clearSecrets()
    setForm(EMPTY_FORM)
    setFailure(null)
    setFieldErrors({})
    setEntryStep(1)
    channelRef.current?.postMessage('changed')
  }

  function validateFields(event: React.FormEvent) {
    const errors: Record<string, string> = {}
    if (event.currentTarget instanceof HTMLFormElement) {
      for (const field of Array.from(event.currentTarget.elements)) {
        if ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement) &&
          (!field.validity.valid || (['registration-organizationName', 'registration-adminName'].includes(field.id) && !field.value.trim()))) {
          const message = field.validity.valueMissing || !field.value.trim() ? c('Please complete this field.', 'Vui lòng nhập thông tin này.')
            : field.validity.typeMismatch ? c('Enter a valid email address.', 'Nhập địa chỉ email hợp lệ.')
              : c('Check the format and length of this value.', 'Kiểm tra định dạng và độ dài của giá trị.')
          errors[field.id] = `${field.labels?.[0]?.textContent?.replace('*', '').trim() ?? ''}: ${message}`
        }
      }
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setFailure(new RegistrationApiError(400, 'INVALID_INPUT', c('Review the highlighted fields to continue.', 'Kiểm tra các trường được đánh dấu để tiếp tục.')))
      return false
    }
    return true
  }

  function submitRegistration(event: React.FormEvent) {
    event.preventDefault()
    if (!validateFields(event)) return
    if (entryStep === 1) {
      setFailure(null)
      setEntryStep(2)
      headingRef.current?.focus()
      return
    }
    if (password !== confirmation) {
      setFailure(new RegistrationApiError(400, 'INVALID_INPUT', c('Passwords do not match.', 'Mật khẩu xác nhận chưa khớp.'), 'confirmation'))
      return
    }
    if ([...password].length < 12 || [...password].length > 128) {
      setFailure(new RegistrationApiError(400, 'INVALID_INPUT', c('Use a password with 12-128 characters.', 'Sử dụng mật khẩu từ 12 đến 128 ký tự.'), 'password'))
      return
    }
    command.mutate(async () => accept(await registerOrganization({ ...form, password })))
  }

  function submitProof(event: React.FormEvent) {
    event.preventDefault()
    if (!validateFields(event)) return
    command.mutate(async () => {
      if (view?.stage === 'VERIFY_EMAIL') {
        await accept(await verifyRegistrationEmail(code))
      } else if (view?.stage === 'SETUP_MFA' || view?.stage === 'SETUP_MFA_RECOVERY') {
        const completion = await confirmRegistrationTotp(code)
        await accept(completion.registration)
        setRecoveryCodes(completion.recoveryCodes)
      } else if (recovering || view?.stage === 'RECOVERY_REQUIRED') {
        await accept(await recoverRegistrationTotp(code))
      } else {
        await accept(await verifyRegistrationTotp(code))
      }
    })
  }

  function fieldError(field: string) {
    return failure?.field === field || fieldErrors[`registration-${field}`]
      || (field === 'proof' && ['INVALID_PROOF', 'EXPIRED_PROOF'].includes(failure?.code ?? ''))
      ? { 'aria-invalid': true as const, 'aria-describedby': `registration-${field}-error` }
      : {}
  }

  function update(field: 'subdomain' | 'industry' | 'headcount', value: string) {
    setForm(previous => ({ ...previous, [field]: value || null }))
  }

  const isSetup = view?.stage === 'SETUP_MFA' || view?.stage === 'SETUP_MFA_RECOVERY'
  const isRecovery = recovering || view?.stage === 'RECOVERY_REQUIRED'
  const resendWait = view?.resendAvailableAt
    ? Math.max(0, Math.ceil((Date.parse(view.resendAvailableAt) - now) / 1000)) : 0
  const step = !view ? entryStep : view.stage === 'VERIFY_EMAIL' ? 3 : 4
  const title = !view ? mode === 'resume' ? c('Resume your registration', 'Tiếp tục đăng ký') : entryStep === 1
    ? c('Register your organization', 'Đăng ký tổ chức') : c('Create your administrator account', 'Tạo tài khoản quản trị viên')
    : view.stage === 'VERIFY_EMAIL' ? c('Verify your email', 'Xác thực email')
      : view.stage === 'COMPLETE' ? recoveryCodes ? c('Save your recovery codes', 'Lưu mã khôi phục') : c('Registration complete', 'Đăng ký hoàn tất')
        : isSetup ? c('Set up your authenticator', 'Thiết lập ứng dụng xác thực') : isRecovery ? c('Recover your authenticator', 'Khôi phục ứng dụng xác thực') : c('Verify your authenticator', 'Xác thực tài khoản')

  React.useEffect(() => {
    if (!failure) {
      headingRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [title, view?.stage, failure])

  return (
    <GuestLayout currentStep={step}>
      <FieldErrors.Provider value={{ ...fieldErrors, ...(failure?.field ? { [`registration-${failure.field}`]: failure.message } : {}),
        ...(failure && ['INVALID_PROOF', 'EXPIRED_PROOF'].includes(failure.code) ? { 'registration-proof': failure.message } : {}) }}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <PageHeader title={title} icon={<ShieldCheck aria-hidden="true" size={24} />}
            description={entryStep === 1 && !view ? c('Tell us about your organization. Next, create the account that will manage your workspace.', 'Nhập thông tin tổ chức. Tiếp theo, tạo tài khoản quản lý không gian làm việc.')
              : view?.stage === 'COMPLETE' && !recoveryCodes ? c('Your registration is saved. Continue to choose a plan for your organization.', 'Đăng ký đã được lưu. Tiếp tục chọn gói phù hợp cho tổ chức.')
                : c('Your progress is saved after account creation. Complete any required verification steps to continue.', 'Tiến trình được lưu sau khi tạo tài khoản. Hoàn thành các bước xác thực được yêu cầu để tiếp tục.')} />
        </div>

        {failure && (
          <div ref={errorRef} id="registration-error" role="alert" tabIndex={-1}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-body-sm text-destructive focus:outline-none focus:ring-2 focus:ring-ring">
            <p className="font-semibold">{c('Unable to continue', 'Chưa thể tiếp tục')}</p>
            <p>{failure.message}</p>
            {failure.field && <a className="underline" href={`#registration-${failure.field}`}>{c('Review this field', 'Kiểm tra trường này')}</a>}
            {Object.entries(fieldErrors).map(([id, message]) => <p key={id}><a className="underline" href={`#${id}`}>{message}</a></p>)}
            {failure.retryAfterSeconds > 0 && <p>{c('Try again after', 'Thử lại sau')} {failure.retryAfterSeconds} {c('seconds.', 'giây.')}</p>}
          </div>
        )}

        {session.isPending ? (
          <Card><CardContent className="py-8"><p role="status">{c('Checking your saved registration...', 'Đang kiểm tra đăng ký đã lưu...')}</p></CardContent></Card>
        ) : session.isError ? (
          <Card><CardContent className="space-y-4 py-6">
            <p role="alert">{c('Registration is currently unavailable.', 'Hiện chưa thể kết nối dịch vụ đăng ký.')} {session.error.message}</p>
            <Button onClick={() => { void session.refetch() }} isLoading={session.isFetching}>{c('Retry connection', 'Kết nối lại')}</Button>
          </CardContent></Card>
        ) : !view ? (
          mode === 'register' ? (
            <form noValidate onSubmit={submitRegistration} className="space-y-4">
              <Card>
                {entryStep === 1 && <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 size={18} aria-hidden="true" />{c('Organization details', 'Thông tin tổ chức')}</CardTitle>
                  <CardDescription>{c('Use your organization’s details. You may leave optional fields blank.', 'Sử dụng thông tin tổ chức. Có thể để trống các trường không bắt buộc.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Organization Legal Name" id="registration-organizationName" required>
                      <Input id="registration-organizationName" value={form.organizationName} maxLength={200}
                        autoComplete="organization" required {...fieldError('organizationName')}
                        onChange={event => setForm(previous => ({ ...previous, organizationName: event.target.value }))} />
                    </Field>
                    <Field label="Workspace URL Slug" id="registration-subdomain" hint="Optional. Leave empty for an automatically generated, reserved identifier.">
                      <Input id="registration-subdomain" value={form.subdomain ?? ''} maxLength={63}
                        placeholder="e.g. acme-learning" autoCapitalize="none" spellCheck={false} {...fieldError('subdomain')}
                        onChange={event => update('subdomain', event.target.value)} />
                    </Field>
                    <Field label="Industry / Technology Domain" id="registration-industry">
                      <select id="registration-industry" value={form.industry ?? ''} className={SELECT_CLASS}
                        {...fieldError('industry')} onChange={event => update('industry', event.target.value)}>
                        <option value="">{c('Not specified (optional)', 'Chưa chọn (không bắt buộc)')}</option>
                        {INDUSTRIES.map(choice => <option key={choice}>{choice}</option>)}
                      </select>
                    </Field>
                    <Field label="Estimated Engineering Headcount" id="registration-headcount" hint="Informational only; this does not allocate subscription seats.">
                      <select id="registration-headcount" value={form.headcount ?? ''} className={SELECT_CLASS}
                        {...fieldError('headcount')} onChange={event => update('headcount', event.target.value)}>
                        <option value="">{c('Not specified (optional)', 'Chưa chọn (không bắt buộc)')}</option>
                        {HEADCOUNTS.map(choice => <option key={choice}>{choice}</option>)}
                      </select>
                    </Field>
                  </div>
                </CardContent>
                </>}
                {entryStep === 2 && <>
                  <CardHeader>
                    <CardTitle>{c('Administrator account', 'Tài khoản quản trị viên')}</CardTitle>
                    <CardDescription>{c('Manage your workspace with this account. Use an email address you can access.', 'Quản lý không gian làm việc bằng tài khoản này. Sử dụng email bạn có thể truy cập.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                      <span className="min-w-0 break-words text-body-sm font-medium">{form.organizationName}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEntryStep(1); setFailure(null); setFieldErrors({}) }}>{c('Edit', 'Sửa')}</Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Administrator Full Name" id="registration-adminName" required>
                        <Input id="registration-adminName" value={form.adminName} autoComplete="name" maxLength={120}
                          required {...fieldError('adminName')}
                          onChange={event => setForm(previous => ({ ...previous, adminName: event.target.value }))} />
                      </Field>
                      <Field label="Work Email Address" id="registration-adminEmail" required>
                        <Input id="registration-adminEmail" type="email" value={form.adminEmail} autoComplete="email"
                          maxLength={254} required {...fieldError('adminEmail')}
                          onChange={event => setForm(previous => ({ ...previous, adminEmail: event.target.value }))} />
                      </Field>
                      <Field label="Password" id="registration-password" required hint="12-128 characters. Password managers and paste are supported.">
                        <Input id="registration-password" type="password" value={password} autoComplete="new-password"
                          maxLength={256} required {...fieldError('password')} onChange={event => setPassword(event.target.value)} />
                      </Field>
                      <Field label="Confirm Password" id="registration-confirmation" required>
                        <Input id="registration-confirmation" type="password" value={confirmation} autoComplete="new-password"
                          maxLength={256} required {...fieldError('confirmation')} onChange={event => setConfirmation(event.target.value)} />
                      </Field>
                    </div>
                  </CardContent>
                </>}
              </Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {entryStep === 1 ? <Link to="/guest/resume" className="text-body-sm text-primary underline underline-offset-4">{c('Resume a saved registration', 'Tiếp tục đăng ký đã lưu')}</Link>
                  : <Button type="button" variant="outline" onClick={() => { setEntryStep(1); setFailure(null); setFieldErrors({}) }}>{c('Back', 'Quay lại')}</Button>}
                <Button type="submit" isLoading={command.isPending}>{entryStep === 1 ? c('Continue to account', 'Tiếp tục tạo tài khoản') : c('Save and continue', 'Lưu và tiếp tục')}</Button>
              </div>
            </form>
          ) : (
            <form noValidate onSubmit={event => {
              event.preventDefault()
              if (!validateFields(event)) return
              command.mutate(async () => accept(await signInRegistration(signInEmail, password)))
            }}>
              <Card>
                <CardHeader>
                  <CardTitle>{c('Sign in to registration', 'Đăng nhập để tiếp tục')}</CardTitle>
                  <CardDescription>{c('Sign in to resume your saved progress and complete any required verification.', 'Đăng nhập để tiếp tục tiến trình đã lưu và hoàn thành bước xác thực được yêu cầu.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Work Email Address" id="registration-adminEmail" required>
                    <Input id="registration-adminEmail" type="email" autoComplete="username" value={signInEmail}
                      maxLength={254} required onChange={event => setSignInEmail(event.target.value)} />
                  </Field>
                  <Field label="Password" id="registration-password" required>
                    <Input id="registration-password" type="password" autoComplete="current-password"
                      value={password} maxLength={256} required onChange={event => setPassword(event.target.value)} />
                  </Field>
                  <Button type="submit" isLoading={command.isPending}>{c('Continue securely', 'Tiếp tục an toàn')}</Button>
                  <p><Link to="/guest/register" className="text-body-sm text-primary underline">{c('Start a new registration', 'Đăng ký tổ chức mới')}</Link></p>
                </CardContent>
              </Card>
            </form>
          )
        ) : recoveryCodes ? (
          <Card>
            <CardHeader>
              <CardTitle>{c('Keep these codes somewhere safe', 'Lưu mã khôi phục ở nơi an toàn')}</CardTitle>
              <CardDescription>{c('Shown once. Each code can be used once with your password to replace a lost authenticator.', 'Chỉ hiển thị một lần. Mỗi mã dùng một lần cùng mật khẩu để thay thế ứng dụng xác thực bị mất.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p role="status" className="text-body-sm text-muted-foreground">{c('Reloading or leaving this page hides these codes. Do not share them or include them in screenshots.', 'Tải lại hoặc rời trang sẽ ẩn các mã này. Không chia sẻ hoặc chụp màn hình chứa mã.')}</p>
              <ol data-sensitive className="grid gap-2 rounded-lg border border-border bg-muted p-4 font-mono text-caption">
                {recoveryCodes.map(value => <li key={value} className="break-all select-all">{value}</li>)}
              </ol>
              <Button onClick={() => setRecoveryCodes(null)}>{c('I have saved my recovery codes', 'Tôi đã lưu mã khôi phục')}</Button>
            </CardContent>
          </Card>
        ) : view.stage === 'COMPLETE' && view.fields ? (
          <Card>
            <CardHeader>
              <Badge variant="success" className="w-fit"><CheckCircle2 size={14} aria-hidden="true" />{c('Registration saved', 'Đăng ký đã được lưu')}</Badge>
              <CardTitle>{c('Your registration is saved', 'Đăng ký đã được lưu')}</CardTitle>
              <CardDescription>{c('Your account is ready. Choose a subscription next, then complete payment to prepare your workspace.', 'Tài khoản đã sẵn sàng. Tiếp theo, chọn gói và thanh toán để chuẩn bị không gian làm việc.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label={c('Organization', 'Tổ chức')} value={view.fields.organizationName} />
                <Detail label={c('Reserved workspace slug', 'Định danh không gian đã giữ chỗ')} value={view.fields.subdomain ?? ''} />
                <Detail label={c('Administrator', 'Quản trị viên')} value={view.fields.adminName} />
                <Detail label={c('Work email', 'Email')} value={view.fields.adminEmail} />
                <Detail label={c('Industry', 'Lĩnh vực')} value={view.fields.industry ?? c('Not specified', 'Chưa cung cấp')} />
                <Detail label={c('Headcount', 'Quy mô')} value={view.fields.headcount ?? c('Not specified', 'Chưa cung cấp')} />
              </dl>
              <Text variant="body-sm" className="mt-5">{c('These committed details are read-only. Sign in and complete any required verification to view them again.', 'Thông tin đã lưu chỉ được xem. Đăng nhập và hoàn thành bước xác thực được yêu cầu để xem lại.')}</Text>
              <Link className={buttonVariants({ className: 'mt-4 text-primary-foreground!' })} to="/guest/plans">
                {c('Continue to subscription plans', 'Tiếp tục chọn gói')}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {view.stage === 'VERIFY_EMAIL' ? <Mail size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
                {view.stage === 'VERIFY_EMAIL' ? c('Email verification', 'Xác thực email') : isSetup ? c('Authenticator enrollment', 'Thiết lập xác thực') : isRecovery ? c('Use a recovery code', 'Sử dụng mã khôi phục') : c('Two-factor authentication', 'Xác thực hai yếu tố')}
              </CardTitle>
              <CardDescription><span className="break-all">{view.email}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {view.stage === 'VERIFY_EMAIL' && <>
                <p role="status" className="text-body-sm">
                  {view.deliveryStatus === 'PENDING' ? c('Your verification email is queued for delivery.', 'Email xác thực đang chờ gửi.')
                    : view.deliveryStatus === 'SENT' ? c('Email accepted by the mail server. Check your inbox and spam folder.', 'Máy chủ thư đã tiếp nhận email. Kiểm tra hộp thư đến và thư rác.')
                      : view.deliveryStatus === 'FAILED' ? c('The email could not be delivered. Request a new code when available.', 'Chưa gửi được email. Yêu cầu mã mới khi có thể.')
                        : c('Request an email code to continue.', 'Yêu cầu mã email để tiếp tục.')}
                </p>
                <Text variant="body-sm">{c('Use the latest six-digit code. It expires 10 minutes after it was requested. A new sign-in during unfinished MFA setup requires fresh email proof.', 'Sử dụng mã 6 chữ số mới nhất, có hiệu lực 10 phút. Nếu đăng nhập lại khi chưa thiết lập MFA xong, bạn cần mã email mới.')}</Text>
              </>}
              {isSetup && <>
                {view.stage === 'SETUP_MFA_RECOVERY' && <p role="status" className="rounded-md bg-secondary p-3 text-body-sm">Previous sessions are revoked. Set up a new authenticator to restore access.</p>}
                {!enrollment ? (
                  <Button isLoading={command.isPending} onClick={() => command.mutate(async () => setEnrollment(await setupRegistrationTotp()))}>
                    {c('Set up authenticator', 'Thiết lập ứng dụng xác thực')}
                  </Button>
                ) : (
                  <div data-sensitive className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                    <Text variant="body-sm">{c('Scan this QR code with your authenticator, or enter the setup key manually.', 'Quét QR bằng ứng dụng xác thực hoặc nhập khóa thiết lập thủ công.')}</Text>
                    <QRCodeSVG size={192} marginSize={4} title="Authenticator enrollment QR code"
                      fgColor="hsl(var(--foreground))" bgColor="hsl(var(--card))"
                      value={`otpauth://totp/${encodeURIComponent(`Adapt-Learn-Graph:${enrollment.email}`)}?secret=${enrollment.manualSecret}&issuer=Adapt-Learn-Graph&algorithm=SHA1&digits=6&period=30`} />
                    <p className="text-caption font-semibold">{c('Manual setup key', 'Khóa thiết lập thủ công')}</p>
                    <code className="block break-all select-all font-mono text-body-sm">{enrollment.manualSecret}</code>
                  </div>
                )}
              </>}
              {(!isSetup || enrollment) && (
                <form noValidate onSubmit={submitProof} className="space-y-4">
                  <Field label={isRecovery && !isSetup ? 'Recovery code' : view.stage === 'VERIFY_EMAIL' ? 'Email verification code' : 'Authenticator code'}
                    id="registration-proof" required>
                    <Input id="registration-proof" value={code} required
                      inputMode={isRecovery && !isSetup ? 'text' : 'numeric'}
                      autoComplete={isRecovery && !isSetup ? 'off' : 'one-time-code'}
                      spellCheck={false} autoCapitalize="none" maxLength={isRecovery && !isSetup ? 32 : 6}
                      pattern={isRecovery && !isSetup ? '[a-fA-F0-9]{32}' : '[0-9]{6}'}
                      aria-invalid={failure?.code === 'INVALID_PROOF' || failure?.code === 'EXPIRED_PROOF'}
                      aria-describedby={failure ? 'registration-error' : undefined}
                      onChange={event => setCode(event.target.value.trim())} className="h-12 max-w-sm font-mono text-subsection tracking-[0.3em]" {...fieldError('proof')} />
                  </Field>
                  <Button type="submit" isLoading={command.isPending}>
                    {view.stage === 'VERIFY_EMAIL' ? c('Verify email', 'Xác thực email') : isSetup ? c('Confirm authenticator', 'Xác nhận ứng dụng xác thực') : isRecovery ? c('Recover and replace authenticator', 'Khôi phục và thay ứng dụng xác thực') : c('Verify and resume', 'Xác thực và tiếp tục')}
                  </Button>
                </form>
              )}
              {view.stage === 'VERIFY_EMAIL' && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" disabled={resendWait > 0} isLoading={command.isPending}
                    onClick={() => command.mutate(async () => accept(await resendRegistrationEmail()))}>{c('Send new email code', 'Gửi mã email mới')}</Button>
                  {resendWait > 0 && <Text variant="caption">{c('Available in', 'Có thể gửi sau')} {resendWait} {c('seconds', 'giây')}</Text>}
                </div>
              )}
              {(view.stage === 'CHALLENGE_MFA' || view.stage === 'RECOVERY_REQUIRED') && <>
                <Text variant="body-sm">{isRecovery
                  ? 'Recovery revokes existing sessions and requires a new authenticator. There is no email-only reset.'
                  : 'Enter a current six-digit code. Previously accepted codes cannot be reused.'}</Text>
                {view.stage === 'CHALLENGE_MFA' && <Button variant="link" onClick={() => {
                  setRecovering(previous => !previous)
                  setCode('')
                  setFailure(null)
                }}>{recovering ? c('Use my authenticator instead', 'Dùng ứng dụng xác thực') : c('Use a recovery code', 'Sử dụng mã khôi phục')}</Button>}
              </>}
            </CardContent>
          </Card>
        )}
        {view && !session.isError && (
          <Button variant="ghost" isLoading={command.isPending} onClick={() => command.mutate(async () => {
            await signOutRegistration()
            await accept(null)
            navigate('/guest/resume')
          })}>{c('Sign out of registration', 'Đăng xuất đăng ký')}</Button>
        )}
      </div>
      </FieldErrors.Provider>
    </GuestLayout>
  )
}

function Field({ label, id, required, hint, children }: {
  label: string; id: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  const errors = React.useContext(FieldErrors)
  const c = useCopy()
  const labels: Record<string, string> = {
    'Organization Legal Name': 'Tên pháp lý tổ chức', 'Workspace URL Slug': 'Định danh không gian',
    'Industry / Technology Domain': 'Lĩnh vực hoạt động', 'Estimated Engineering Headcount': 'Quy mô đội ngũ dự kiến',
    'Administrator Full Name': 'Họ tên quản trị viên', 'Work Email Address': 'Địa chỉ email',
    'Password': 'Mật khẩu', 'Confirm Password': 'Xác nhận mật khẩu', 'Email verification code': 'Mã xác thực email',
    'Authenticator code': 'Mã từ ứng dụng xác thực', 'Recovery code': 'Mã khôi phục',
  }
  const hints: Record<string, string> = {
    'Optional. Leave empty for an automatically generated, reserved identifier.': 'Không bắt buộc. Để trống để hệ thống tạo và giữ chỗ định danh.',
    'Informational only; this does not allocate subscription seats.': 'Chỉ mang tính thông tin; không quyết định số chỗ của gói.',
    '12-128 characters. Password managers and paste are supported.': 'Từ 12 đến 128 ký tự. Hỗ trợ trình quản lý mật khẩu và thao tác dán.',
  }
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-body-sm font-semibold">
        {c(label, labels[label] ?? label)}{required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {errors[id] && <p id={`${id}-error`} className="text-caption text-destructive">{errors[id]}</p>}
      {hint && <Text variant="caption" className="block leading-relaxed">{c(hint, hints[hint] ?? hint)}</Text>}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-caption text-muted-foreground">{label}</dt>
    <dd className="break-words text-body-sm font-medium">{value}</dd></div>
}
