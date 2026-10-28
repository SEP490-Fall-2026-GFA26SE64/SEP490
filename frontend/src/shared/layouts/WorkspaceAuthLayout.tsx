import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useTranslation } from '../i18n/LanguageContext'
import '../../features/auth/LoginPage.css'

export function WorkspaceAuthLayout({ title, description, children }: {
  title: string; description: string; children: ReactNode
}) {
  const { language } = useTranslation()
  return <div className="razor-login-page">
    <header className="razor-nav">
      <div className="razor-brand-box">
        <Link to="/" className="razor-logo">
          <Network className="mr-3 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
          <span>Adapt-Learn-Graph</span>
        </Link>
      </div>
      <div className="razor-nav-right"><LanguageSwitcher /></div>
    </header>
    <main className="razor-main-content">
      <div className="razor-stage">
        <div className="razor-illustration-left" aria-hidden="true">
          <img src="/illustrations/ill_left_opt.webp" alt="" className="razor-illustration-img" />
        </div>
        <Card className="razor-card">
          <PageHeader className="razor-card-header" title={title} description={description} />
          <div className="razor-auth-content space-y-5">{children}</div>
        </Card>
        <div className="razor-illustration-right" aria-hidden="true">
          <img src="/illustrations/ill_right_opt.webp" alt="" className="razor-illustration-img" />
        </div>
      </div>
    </main>
    <footer className="razor-footer">
      <span>Copyright @Adapt-Learn-Graph 2026</span>
      <span className="razor-footer-divider" aria-hidden="true">|</span>
      <Link className="razor-privacy-link" to="/">{language === 'vi' ? 'Về trang chủ' : 'Back to home'}</Link>
    </footer>
  </div>
}
