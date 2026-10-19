import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, Network } from 'lucide-react'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher'
import { useTranslation } from '../../shared/i18n/LanguageContext'
import { useToast } from '../../shared/hooks/useToast'
import './LoginPage.css'

interface DemoAccount {
  role: 'Employee' | 'Expert' | 'L&D Manager' | 'Admin'
  actorKey: 'employee' | 'expert' | 'ld-manager' | 'admin'
  email: string
  label: string
  targetRoute: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'Employee',
    actorKey: 'employee',
    email: 'alex.chen@adaptlearn.internal',
    label: 'Alex Chen (Employee)',
    targetRoute: '/employee/overview',
  },
  {
    role: 'Expert',
    actorKey: 'expert',
    email: 'chen.wei@adaptlearn.internal',
    label: 'Chen Wei (Expert)',
    targetRoute: '/expert/ontology',
  },
  {
    role: 'L&D Manager',
    actorKey: 'ld-manager',
    email: 'sarah.connor@adaptlearn.internal',
    label: 'Sarah Connor (L&D Manager)',
    targetRoute: '/ld-manager/learning-outcomes',
  },
  {
    role: 'Admin',
    actorKey: 'admin',
    email: 'admin.elena@adaptlearn.internal',
    label: 'Elena Rostova (Admin)',
    targetRoute: '/admin/dashboard',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [email, setEmail] = React.useState('alex.chen@adaptlearn.internal')
  const [password, setPassword] = React.useState('••••••••••••')
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSelectDemo = (account: DemoAccount) => {
    setEmail(account.email)
    setPassword('enterprisePass2026!')
    toast({
      title: `${account.role} Selected`,
      description: `Loaded credentials for ${account.label}.`,
      variant: 'info',
    })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your work or organization email address.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      const normalizedEmail = email.toLowerCase().trim()
      const matched =
        DEMO_ACCOUNTS.find(
          (a) =>
            a.email.toLowerCase() === normalizedEmail ||
            normalizedEmail.startsWith(a.actorKey) ||
            normalizedEmail.includes(a.actorKey)
        ) || (normalizedEmail.includes('alex') ? DEMO_ACCOUNTS[0] : undefined)

      const target = matched ? matched.targetRoute : '/employee/overview'

      localStorage.setItem('auth_user', email)
      if (matched) {
        localStorage.setItem('active_actor', matched.actorKey)
      } else {
        localStorage.setItem('active_actor', 'employee')
      }

      toast({
        title: 'Sign In Successful',
        description: `Welcome back! Redirecting to workspace...`,
        variant: 'success',
      })

      navigate(target)
    }, 500)
  }

  return (
    <div className="razor-login-page">
      {/* TOP NAVBAR */}
      <header className="razor-nav">
        <div className="razor-brand-box">
          <Link to="/login" className="razor-logo">
            <Network className="h-7 w-7 text-primary inline mr-3" />
            <span>Adapt-Learn-Graph</span>
          </Link>
        </div>

        <div className="razor-nav-right flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      {/* MAIN CONTAINER WITH ILLUSTRATIONS */}
      <main className="razor-main-content">
        <div className="razor-stage">
          {/* LEFT ILLUSTRATION */}
          <div className="razor-illustration-left" aria-hidden="true">
            <img
              src="/illustrations/ill_left_opt.webp"
              alt="Adaptive Learning & Idea Discovery"
              className="razor-illustration-img"
              loading="eager"
            />
          </div>

          {/* CENTER FLOATING CARD */}
          <div className="razor-card">
            <div className="razor-card-header">
              <h1 className="razor-card-title">Enterprise Sign In</h1>
              <p className="razor-card-subtitle">
                Enter your work credentials to access the adaptive learning platform.
              </p>
            </div>

            <form onSubmit={handleLogin} className="razor-form">
                {/* Input 1: Work / Organization Email */}
                <div className="razor-input-wrapper">
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="razor-input"
                    autoComplete="email"
                    required
                  />
                  <span className="razor-input-circle-icon" aria-hidden="true" />
                </div>

                {/* Input 2: Password with Show/Hide */}
                <div className="razor-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Passcode"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="razor-input"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="razor-hide-btn"
                  >
                    {showPassword ? 'Show' : 'Hide'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="razor-submit-btn"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

            {/* Guest Sign-Up Prompt */}
            <p className="razor-signup-caption">
              <span>{t("Don't have an account?")}</span>{' '}
              <Link
                to="/guest/register"
                className="razor-signup-link"
                id="guest-signup-link"
              >
                {t('Sign Up as Guest')}
              </Link>
            </p>

            {/* Quick Demo Role Switcher */}
            <div className="razor-demo-strip">
              <span className="razor-demo-label">FAST DEMO ROLE SWITCHER:</span>
              <div className="razor-demo-buttons">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = email === acc.email
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectDemo(acc)}
                      className={`razor-demo-pill ${isSelected ? 'active' : ''}`}
                    >
                      {isSelected && <Check size={12} className="mr-1 inline text-primary" />}
                      {acc.role}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT ILLUSTRATION */}
          <div className="razor-illustration-right" aria-hidden="true">
            <img
              src="/illustrations/ill_right_opt.webp"
              alt="Adaptive Study & Learning Team"
              className="razor-illustration-img"
              loading="eager"
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="razor-footer">
        <span>Copyright @Adapt-Learn-Graph 2026</span>
        <span className="razor-footer-divider">|</span>
        <button
          type="button"
          onClick={() =>
            toast({
              title: 'Enterprise Privacy Policy',
              description: 'All employee tracing and competency data is strictly retained within enterprise boundaries.',
              variant: 'info',
            })
          }
          className="razor-privacy-link"
        >
          Privacy Policy
        </button>
      </footer>
    </div>
  )
}
