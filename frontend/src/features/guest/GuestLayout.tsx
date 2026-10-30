import { Fragment, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Network, ShieldCheck } from 'lucide-react'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher'
import { Button } from '../../shared/components/ui/Button'
import { useTranslation } from '../../shared/i18n/LanguageContext'

export function GuestLayout({ children, currentStep = 1, onSignOut, showProgress = true }: {
  children: ReactNode; currentStep?: number; onSignOut?: () => Promise<unknown>; showProgress?: boolean
}) {
  const { language } = useTranslation()
  const c = (en: string, vi: string) => language === 'vi' ? vi : en
  const steps = [
    c('Organization', 'Tổ chức'), c('Account', 'Tài khoản'), c('Email', 'Email'),
    c('Security', 'Bảo mật'), c('Plan', 'Chọn gói'), c('Payment', 'Thanh toán'), c('Workspace', 'Không gian'),
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
      <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
    {showProgress && <div className="border-b border-border bg-card/60">
      <nav aria-label={c('Onboarding progress', 'Tiến trình đăng ký')} className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <p className="mb-3 text-caption font-medium text-muted-foreground md:hidden">
          {c('Step', 'Bước')} {currentStep} / {steps.length} · <span className="text-foreground">{steps[currentStep - 1]}</span>
        </p>
        <ol className="flex items-center">
          {steps.map((label, index) => <Fragment key={label}>
            <li aria-current={currentStep === index + 1 ? 'step' : undefined} className="flex shrink-0 items-center gap-2">
              <span className={`flex size-7 items-center justify-center rounded-full text-caption font-semibold ${index + 1 < currentStep ? 'bg-success/10 text-success' : index + 1 === currentStep ? 'bg-primary text-primary-foreground ring-4 ring-primary/10' : 'border border-border bg-card text-muted-foreground'}`}>
                {index + 1 < currentStep ? <Check size={15} aria-hidden="true" /> : index + 1}
              </span>
              <span className={`hidden text-caption md:inline ${currentStep === index + 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              <span className="sr-only md:hidden">{label}</span>
            </li>
            {index < steps.length - 1 && <li aria-hidden="true" className={`mx-2 h-px min-w-1 flex-1 md:mx-3 ${index + 1 < currentStep ? 'bg-success/30' : 'bg-border'}`} />}
          </Fragment>)}
        </ol>
      </nav>
    </div>}
    <main id="onboarding-content" className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-7 sm:px-6 sm:py-9">
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-card p-4 text-destructive">{error}</p>}
      {children}
    </main>
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-caption text-muted-foreground sm:px-6">
        <span className="flex items-center gap-2"><ShieldCheck size={16} aria-hidden="true" />{c('Account setup · Subscription onboarding', 'Thiết lập tài khoản · Đăng ký gói')}</span>
        <span>© {new Date().getFullYear()} Adapt-Learn-Graph</span>
      </div>
    </footer>
  </div>
}
