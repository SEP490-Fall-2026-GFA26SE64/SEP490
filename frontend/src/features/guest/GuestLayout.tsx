import * as React from 'react'
import { Link } from 'react-router-dom'
import { Check, Network, ShieldCheck } from 'lucide-react'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher'

interface GuestLayoutProps {
  children: React.ReactNode
  currentStep?: 1 | 2 | 3 | 4
}

export function GuestLayout({ children, currentStep = 1 }: GuestLayoutProps) {

  const STEPS = [
    { number: 1, label: 'Organization & Admin', href: '/guest/register' },
    { number: 2, label: 'Subscription Plan', href: '/guest/plans' },
    { number: 3, label: 'PayOS Checkout', href: '/guest/checkout' },
    { number: 4, label: 'Workspace Setup', href: '/guest/onboarding-status' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 font-bold text-base sm:text-lg tracking-tight group">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
              <Network size={20} className="text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-bold leading-tight">Adapt-Learn-Graph</span>
              <span className="text-[11px] text-muted-foreground font-medium">Competency Intelligence Platform</span>
            </div>
          </Link>

          {/* Right Action: Language switcher & Sign in link */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-foreground/80 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              Already registered? <span className="text-primary font-bold">Sign In</span>
            </Link>
          </div>
        </div>

        {/* Multi-step progress bar */}
        <div className="border-t border-border/60 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const isPast = step.number < currentStep
                const isCurrent = step.number === currentStep
                return (
                  <React.Fragment key={step.number}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isPast
                            ? 'bg-success text-white'
                            : isCurrent
                            ? 'bg-primary text-white shadow-xs ring-4 ring-primary/20'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isPast ? <Check size={13} strokeWidth={3} /> : step.number}
                      </div>
                      <span
                        className={`text-xs font-medium hidden md:inline truncate ${
                          isCurrent
                            ? 'text-foreground font-bold'
                            : isPast
                            ? 'text-foreground/80'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 sm:mx-4 rounded transition-colors ${
                          step.number < currentStep ? 'bg-success' : 'bg-border'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Guest Footer */}
      <footer className="border-t border-border bg-card/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-primary" />
            <span>Enterprise Multi-Tenant Isolation & Zero-Trust Security</span>
          </div>
          <p>© 2026 Adapt-Learn-Graph Platform. Enterprise Competency Intelligence.</p>
        </div>
      </footer>
    </div>
  )
}
