import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  Briefcase,
  CheckSquare,
  Compass,
  GraduationCap,
  Layers,
  Network,
  Palette,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import './WorkspaceLayout.css'

interface SidebarItem {
  label: string
  href: string
  icon: React.ReactNode
}

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const path = location.pathname

  const isLearner =
    path === '/' || path === '/learner' || path.startsWith('/learner') || path === '/assessment'
  const isManager = path.startsWith('/manager')
  const isAdmin =
    path.startsWith('/admin') ||
    path.startsWith('/knowledge-graph') ||
    path.startsWith('/design-system')
  const isSystemStatus = path.startsWith('/system-status')

  // Domain-specific sidebar links
  let sidebarTitle = ''
  let sidebarItems: SidebarItem[] = []

  if (isLearner) {
    sidebarTitle = 'Learner Portal'
    sidebarItems = [
      {
        label: 'Adaptive Pathway',
        href: '/learner/pathway',
        icon: <Compass size={17} />,
      },
      {
        label: 'Gap Analysis',
        href: '/learner/gap-analysis',
        icon: <Award size={17} />,
      },
      {
        label: 'Assessment Quiz',
        href: '/learner/assessment',
        icon: <CheckSquare size={17} />,
      },
    ]
  } else if (isManager) {
    sidebarTitle = 'Manager Console'
    sidebarItems = [
      {
        label: 'Team Matrix',
        href: '/manager/team-matrix',
        icon: <Users size={17} />,
      },
      {
        label: 'Upskilling & ROI',
        href: '/manager/roi-forecast',
        icon: <TrendingUp size={17} />,
      },
      {
        label: '360° Evaluations',
        href: '/manager/evaluations',
        icon: <UserCheck size={17} />,
      },
    ]
  } else if (isAdmin) {
    sidebarTitle = 'Administration'
    sidebarItems = [
      {
        label: 'Role-Skill Taxonomy',
        href: '/admin/dashboard',
        icon: <Layers size={17} />,
      },
      {
        label: 'Knowledge Graph',
        href: '/admin/knowledge-graph',
        icon: <Network size={17} />,
      },
      {
        label: 'Design System',
        href: '/admin/design-system',
        icon: <Palette size={17} />,
      },
    ]
  }

  const showSidebar = sidebarItems.length > 0

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="flex items-center space-x-6">
          <Link className="brand" to="/">
            <Network size={24} aria-hidden="true" />
            <span>Adapt-Learn-Graph</span>
          </Link>

          {/* Actor Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <Link
              to="/learner/pathway"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isLearner
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <GraduationCap size={16} />
              <span>Learner</span>
            </Link>

            <Link
              to="/manager/team-matrix"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isManager
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Briefcase size={16} />
              <span>Manager</span>
            </Link>

            <Link
              to="/admin/dashboard"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isAdmin
                  ? 'bg-secondary text-secondary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <ShieldCheck size={16} />
              <span>Admin</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            to="/admin/design-system"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
              path === '/admin/design-system' || path === '/design-system'
                ? 'bg-secondary text-secondary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Palette size={12} className="text-primary" />
            <span>Design System</span>
          </Link>

          <Link
            to="/system-status"
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
              isSystemStatus
                ? 'bg-secondary text-secondary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Activity size={12} className="text-primary" />
            <span>Status</span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 text-muted-foreground font-medium hidden sm:inline-block">
            Development
          </span>
        </div>
      </header>

      <div className="workspace-body">
        {showSidebar && (
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-header">
              <span className="workspace-sidebar-title">{sidebarTitle}</span>
            </div>
            <nav className="workspace-sidebar-nav">
              {sidebarItems.map((item) => {
                const isActive =
                  path === item.href ||
                  (item.href === '/learner/pathway' && (path === '/' || path === '/learner')) ||
                  (item.href === '/manager/team-matrix' && path === '/manager') ||
                  (item.href === '/admin/dashboard' && path === '/admin') ||
                  (item.href === '/admin/knowledge-graph' && path === '/knowledge-graph') ||
                  (item.href === '/admin/design-system' && path === '/design-system') ||
                  (item.href === '/learner/assessment' && path === '/assessment')

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`workspace-sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </aside>
        )}

        <main className={`workspace-main ${!showSidebar ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>

      <footer className="workspace-footer">
        <div>
          <strong>Adapt-Learn-Graph</strong> &bull; Knowledge Graph-Based Adaptive Learning Platform
        </div>
        <div>
          <span>Enterprise Competency Intelligence</span>
        </div>
      </footer>
    </div>
  )
}