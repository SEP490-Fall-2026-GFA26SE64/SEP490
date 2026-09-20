import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Globe, Check, Network } from 'lucide-react'
import { useToast } from '../../shared/hooks/useToast'
import './LoginPage.css'

interface DemoAccount {
  role: 'Learner' | 'Manager' | 'Admin'
  username: string
  label: string
  targetRoute: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'Learner',
    username: 'learner.alex',
    label: 'Alex Chen (Learner)',
    targetRoute: '/learner/pathway',
  },
  {
    role: 'Manager',
    username: 'manager.sarah',
    label: 'Sarah Connor (Manager)',
    targetRoute: '/manager/team-matrix',
  },
  {
    role: 'Admin',
    username: 'admin.elena',
    label: 'Elena Rostova (Admin)',
    targetRoute: '/admin/dashboard',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [username, setUsername] = React.useState('learner.alex')
  const [password, setPassword] = React.useState('••••••••••••')
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSelectDemo = (account: DemoAccount) => {
    setUsername(account.username)
    setPassword('enterprisePass2026!')
    toast({
      title: `${account.role} Selected`,
      description: `Loaded credentials for ${account.label}.`,
      variant: 'info',
    })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      toast({
        title: 'Username Required',
        description: 'Please enter your organization-issued username or email.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      const matched = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === username.toLowerCase())
      const target = matched ? matched.targetRoute : '/learner/pathway'

      localStorage.setItem('auth_user', username)
      if (matched) {
        localStorage.setItem('active_actor', matched.role.toLowerCase())
      }

      toast({
        title: 'Sign In Successful',
        description: `Welcome back, ${username}! Redirecting to workspace...`,
        variant: 'success',
      })

      navigate(target)
    }, 500)
  }

  return (
    <div className="razor-login-page">
      {/* =========================================================================
          TOP NAVBAR
         ========================================================================= */}
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

      {/* =========================================================================
          MAIN CONTAINER WITH PROMINENT ILLUSTRATIONS COVERING AMPLE SPACE
         ========================================================================= */}
      <main className="razor-main-content">
        <div className="razor-stage">
          {/* LEFT ILLUSTRATION: Idea Discovery & Brainstorming Lightbulb */}
          <div className="razor-illustration-left" aria-hidden="true">
            <img
              src="/illustrations/ill_left_opt.webp"
              alt="Adaptive Learning & Idea Discovery"
              className="razor-illustration-img"
              loading="eager"
            />
          </div>

          {/* =========================================================================
              CENTER FLOATING WHITE CARD (Enlarged & Prominent)
             ========================================================================= */}
          <div className="razor-card">
            <div className="razor-card-header">
              <h1 className="razor-card-title">Agent Login</h1>
              <p className="razor-card-subtitle">
                Hey, Enter your details to get sign in to your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="razor-form">
              {/* Input 1: Email / Username */}
              <div className="razor-input-wrapper">
                <input
                  id="username"
                  type="text"
                  placeholder="Enter Email / Username / Phone No"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="razor-input"
                  autoComplete="username"
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

              {/* Submit Button (Uses System Primary Orange #ea580c with high-contrast text) */}
              <button
                type="submit"
                disabled={isLoading}
                className="razor-submit-btn"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Quick Demo Role Switcher */}
            <div className="razor-demo-strip">
              <span className="razor-demo-label">FAST DEMO ROLE SWITCHER:</span>
              <div className="razor-demo-buttons">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = username === acc.username
                  return (
                    <button
                      key={acc.username}
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

          {/* =========================================================================
              RIGHT ILLUSTRATION: Project 162 Study & Skill Advancement Team
             ========================================================================= */}
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

      {/* =========================================================================
          FOOTER
         ========================================================================= */}
      <footer className="razor-footer">
        <span>Copyright @Adapt-Learn-Graph 2026</span>
        <span className="razor-footer-divider">|</span>
        <button
          type="button"
          onClick={() =>
            toast({
              title: 'Enterprise Privacy Policy',
              description: 'All learner tracing and competency data is strictly retained within enterprise boundaries.',
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
