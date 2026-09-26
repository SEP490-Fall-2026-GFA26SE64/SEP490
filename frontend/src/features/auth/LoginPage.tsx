import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Globe, Check, Network, UserPlus, LogIn } from 'lucide-react'
import { useToast } from '../../shared/hooks/useToast'
import './LoginPage.css'

interface DemoAccount {
  role: 'Employee' | 'Expert' | 'L&D Manager' | 'Admin' | 'Guest'
  actorKey: 'employee' | 'expert' | 'ld-manager' | 'admin' | 'guest'
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
  {
    role: 'Guest',
    actorKey: 'guest',
    email: 'guest.new@example.com',
    label: 'New Guest (Package Purchase)',
    targetRoute: '/packages',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = React.useState('alex.chen@adaptlearn.internal')
  const [password, setPassword] = React.useState('••••••••••••')
  const [signupName, setSignupName] = React.useState('')
  const [signupEmail, setSignupEmail] = React.useState('')
  const [signupPassword, setSignupPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSelectDemo = (account: DemoAccount) => {
    setAuthMode('signin')
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

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signupEmail.trim() || !signupPassword.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please provide both your work email and password.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      const displayName = signupName.trim() || signupEmail.split('@')[0]
      localStorage.setItem('auth_user', signupEmail)
      localStorage.setItem('auth_display_name', displayName)
      localStorage.setItem('active_actor', 'guest')

      toast({
        title: 'Guest Account Created',
        description: `Welcome, ${displayName}! Next, select a package and name your company to activate your workspace.`,
        variant: 'success',
      })

      navigate('/packages')
    }, 600)
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

        <div className="razor-nav-right">
          <button
            type="button"
            className="razor-globe-btn"
            title="Region: Global Enterprise"
            onClick={() => {
              toast({
                title: 'Language & Locale',
                description: 'Current Region: Enterprise US-East (English)',
                variant: 'info',
              })
            }}
          >
            <Globe size={24} />
          </button>
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
            {/* Mode Switcher: Sign In vs Sign Up */}
            <div className="flex items-center justify-center p-1 rounded-xl bg-muted/60 mb-5 border border-border">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-card text-primary shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus size={13} />
                <span>Guest Sign Up</span>
              </button>
            </div>

            <div className="razor-card-header">
              <h1 className="razor-card-title">
                {authMode === 'signin' ? 'Agent Login' : 'Guest Registration'}
              </h1>
              <p className="razor-card-subtitle">
                {authMode === 'signin'
                  ? 'Hey, Enter your details to get sign in to your account'
                  : 'Sign up as a guest, choose your package, and provision your organization.'}
              </p>
            </div>

            {authMode === 'signin' ? (
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
            ) : (
              <form onSubmit={handleSignUp} className="razor-form">
                <div className="razor-input-wrapper">
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="Full Name (e.g. Jordan Parker)"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="razor-input"
                    autoComplete="name"
                    required
                  />
                  <span className="razor-input-circle-icon" aria-hidden="true" />
                </div>

                <div className="razor-input-wrapper">
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Work Email (e.g. jordan@company.com)"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="razor-input"
                    autoComplete="email"
                    required
                  />
                  <span className="razor-input-circle-icon" aria-hidden="true" />
                </div>

                <div className="razor-input-wrapper">
                  <input
                    id="signup-pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="razor-input"
                    autoComplete="new-password"
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
                  {isLoading ? 'Creating Guest Account...' : 'Continue to Packages →'}
                </button>
              </form>
            )}

            {/* Quick Demo Role Switcher */}
            <div className="razor-demo-strip">
              <span className="razor-demo-label">FAST DEMO ROLE SWITCHER:</span>
              <div className="razor-demo-buttons">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = email === acc.email && authMode === 'signin'
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
