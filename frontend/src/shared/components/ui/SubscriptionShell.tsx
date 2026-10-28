import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from '../../i18n/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PageHeader } from './PageHeader'
import { Button } from './Button'

export function SubscriptionShell({ title, children, onSignOut }: { title: string; children: ReactNode; onSignOut?: () => Promise<unknown> }) {
  const { language } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="font-semibold text-primary">Adapt-Learn-Graph</Link>
        <div className="flex items-center gap-3"><LanguageSwitcher />
          {onSignOut && <Button variant="outline" onClick={async () => {
            try {
              await onSignOut()
              queryClient.clear()
              navigate('/login')
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Sign out failed.')
            }
          }}>{language === 'vi' ? 'Đăng xuất' : 'Sign out'}</Button>}
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <PageHeader title={title} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {children}
    </main>
  </div>
}
