import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Building2, Check, CreditCard, KeyRound, Layers3, Mail, Network, ShieldCheck, UserRound } from 'lucide-react'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher'
import { Button } from '../../shared/components/ui/Button'
import { useTranslation } from '../../shared/i18n/LanguageContext'

export function GuestLayout({ children, currentStep = 1, onSignOut, showProgress = true }: {
  children: ReactNode; currentStep?: number; onSignOut?: () => Promise<unknown>; showProgress?: boolean
}) {
  const { language } = useTranslation()
  const c = (en: string, vi: string) => language === 'vi' ? vi : en
  const steps = [
    { label: c('Your business', 'Doanh nghiệp'), detail: c('Introduce your organization', 'Thông tin doanh nghiệp'), icon: Building2 },
    { label: c('Administrator', 'Quản trị viên'), detail: c('Create your sign-in account', 'Tạo tài khoản đăng nhập'), icon: UserRound },
    { label: c('Verify email', 'Xác thực email'), detail: c('Confirm your email address', 'Xác nhận địa chỉ email'), icon: Mail },
    { label: c('Account security', 'Bảo mật tài khoản'), detail: c('Protect administrator access', 'Bảo vệ quyền quản trị'), icon: KeyRound },
    { label: c('Choose a plan', 'Chọn gói dịch vụ'), detail: c('Find the right fit for your team', 'Chọn gói phù hợp với đội ngũ'), icon: Layers3 },
    { label: c('Payment', 'Thanh toán'), detail: c('Review your order and payment', 'Kiểm tra đơn và thanh toán'), icon: CreditCard },
    { label: c('Your workspace', 'Không gian làm việc'), detail: c('Get ready to welcome your team', 'Sẵn sàng chào đón đội ngũ'), icon: Network },
  ]
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const cache = useQueryClient()
  async function signOut() {
    if (!onSignOut) return
    setBusy(true)
    setError(null)
    try {
      await onSignOut()
      cache.clear()
      navigate('/guest/resume')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : c('Sign out failed.', 'Đăng xuất thất bại.'))
    } finally { setBusy(false) }
  }
  return <div className="flex min-h-screen flex-col bg-background text-foreground">
    <a href="#onboarding-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
      {c('Skip to content', 'Đến nội dung')}
    </a>
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Adapt-Learn-Graph" className="flex min-h-11 items-center gap-2.5 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-secondary text-primary"><Network size={21} aria-hidden="true" /></span>
          <span className="text-[length:var(--text-card)] text-foreground">Adapt-Learn-Graph</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {onSignOut ? <Button variant="ghost" size="sm" isLoading={busy} onClick={() => void signOut()}>{c('Sign out', 'Đăng xuất')}</Button>
            : <Link to={showProgress ? '/guest/resume' : '/login'} className="rounded-md px-2 py-2 text-body-sm font-semibold text-primary hover:bg-secondary">{showProgress ? c('Resume registration', 'Tiếp tục đăng ký') : c('Back to sign in', 'Về đăng nhập')}</Link>}
        </div>
      </div>
    </header>
    <div className={`mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:gap-10 lg:px-8 lg:py-10 ${showProgress ? 'lg:grid-cols-[244px_minmax(0,1fr)]' : ''}`}>
      {showProgress && <aside>
        <nav aria-label={c('Onboarding progress', 'Tiến trình đăng ký')} className="lg:sticky lg:top-8">
          <div className="mb-5 flex items-center justify-between gap-3 lg:block">
            <p className="text-eyebrow font-bold uppercase tracking-wider text-secondary-foreground">{c('Get started', 'Bắt đầu cùng chúng tôi')}</p>
            <p className="text-caption text-muted-foreground lg:mt-2">{c('Step', 'Bước')} {currentStep} / {steps.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm lg:hidden">
            <p className="flex items-center justify-between gap-3 text-body-sm font-semibold">
              <span>{steps[currentStep - 1]?.label}</span><ArrowRight size={16} className="text-primary" aria-hidden="true" />
            </p>
            <div role="progressbar" aria-label={c('Onboarding progress', 'Tiến trình đăng ký')}
              aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep} className="mt-3 flex gap-1">
              {steps.map((step, index) => <span key={step.label} className={`h-1.5 flex-1 rounded-full ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />)}
            </div>
          </div>
          <ol className="hidden space-y-1.5 lg:block">
            {steps.map(({ label, detail, icon: Icon }, index) => {
              const active = currentStep === index + 1
              const complete = index + 1 < currentStep
              return <li key={label} aria-current={active ? 'step' : undefined}
                className={`relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${active ? 'border-primary/20 bg-secondary' : 'border-transparent'}`}>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : complete ? 'border-primary/15 bg-card text-primary' : 'border-border bg-card text-muted-foreground'}`}>
                  {complete ? <Check size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className={`text-body-sm font-semibold ${active ? 'text-secondary-foreground' : complete ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                  <p className="mt-0.5 text-caption leading-snug text-muted-foreground">{detail}</p>
                </div>
              </li>
            })}
          </ol>
          <div className="mt-6 hidden border-t border-border pt-5 lg:block">
            <p className="flex items-center gap-2 text-body-sm font-semibold"><ShieldCheck size={17} className="text-primary" aria-hidden="true" />{c('Pick up where you left off', 'Tiếp tục khi bạn sẵn sàng')}</p>
            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">{c('Once your account is created, sign in anytime to continue your setup.', 'Sau khi tạo tài khoản, bạn có thể đăng nhập để tiếp tục thiết lập bất cứ lúc nào.')}</p>
          </div>
        </nav>
      </aside>}
      <main id="onboarding-content" className="min-w-0 space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-card p-4 text-destructive">{error}</p>}
        {children}
      </main>
    </div>
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-caption text-muted-foreground sm:px-6">
        <span className="flex items-center gap-2"><ShieldCheck size={16} aria-hidden="true" />{c('Your team’s learning journey starts here', 'Bắt đầu hành trình phát triển đội ngũ')}</span>
        <span>© {new Date().getFullYear()} Adapt-Learn-Graph</span>
      </div>
    </footer>
  </div>
}
