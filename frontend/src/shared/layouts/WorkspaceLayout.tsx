import * as React from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  CheckSquare,
  ChevronDown,
  Compass,
  FileQuestion,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Network,
  Palette,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Dialog'
import { NotificationDropdown } from '../components/ui/NotificationDropdown'
import { useToast } from '../hooks/useToast'
import './WorkspaceLayout.css'

interface NavTabItem {
  label: string
  href: string
  icon: React.ReactNode
}

export type ActorRole = 'employee' | 'line-manager' | 'ld-manager' | 'admin'

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const path = location.pathname

  // User menu & profile dialog states
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false)
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Persist and resolve active actor context across the 4 roles
  const getActiveActor = (): ActorRole => {
    if (path.startsWith('/line-manager')) {
      localStorage.setItem('active_actor', 'line-manager')
      return 'line-manager'
    }
    if (path.startsWith('/ld-manager') || path.startsWith('/manager')) {
      localStorage.setItem('active_actor', 'ld-manager')
      return 'ld-manager'
    }
    if (
      path.startsWith('/admin') ||
      path.startsWith('/knowledge-graph') ||
      path.startsWith('/design-system')
    ) {
      localStorage.setItem('active_actor', 'admin')
      return 'admin'
    }
    if (path.startsWith('/employee') || path.startsWith('/learner') || path === '/assessment') {
      localStorage.setItem('active_actor', 'employee')
      return 'employee'
    }

    const savedActor = localStorage.getItem('active_actor') as ActorRole | 'learner' | 'manager' | null
    if (savedActor === 'line-manager' || savedActor === 'ld-manager' || savedActor === 'admin') {
      return savedActor
    }
    if (savedActor === 'manager') return 'ld-manager'
    return 'employee'
  }

  const activeActor = getActiveActor()
  const isEmployee = activeActor === 'employee'
  const isLineManager = activeActor === 'line-manager'
  const isLdManager = activeActor === 'ld-manager'
  const isAdmin = activeActor === 'admin'

  // Actor-specific navigation tabs for the navbar
  let actorTabs: NavTabItem[] = []

  if (isEmployee) {
    actorTabs = [
      {
        label: 'Overview',
        href: '/employee/overview',
        icon: <LayoutDashboard size={15} />,
      },
      {
        label: 'Adaptive Pathway',
        href: '/employee/pathway',
        icon: <Compass size={15} />,
      },
      {
        label: 'Gap Analysis',
        href: '/employee/gap-analysis',
        icon: <Award size={15} />,
      },
      {
        label: 'Assessment Quiz',
        href: '/employee/assessment',
        icon: <CheckSquare size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=employee',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isLineManager) {
    actorTabs = [
      {
        label: 'Employee Management',
        href: '/line-manager/employees',
        icon: <Users size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=line-manager',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isLdManager) {
    actorTabs = [
      {
        label: 'Outcomes',
        href: '/ld-manager/learning-outcomes',
        icon: <BarChart3 size={15} />,
      },
      {
        label: 'Target Roles',
        href: '/ld-manager/target-roles',
        icon: <Briefcase size={15} />,
      },
      {
        label: 'Ontology & Skills',
        href: '/ld-manager/ontology',
        icon: <Network size={15} />,
      },
      {
        label: 'Learning Modules',
        href: '/ld-manager/modules',
        icon: <BookOpen size={15} />,
      },
      {
        label: 'Assessment Bank',
        href: '/ld-manager/assessment-bank',
        icon: <FileQuestion size={15} />,
      },
      {
        label: 'Team Matrix',
        href: '/ld-manager/team-matrix',
        icon: <Users size={15} />,
      },
      {
        label: 'Upskilling & ROI',
        href: '/ld-manager/roi-forecast',
        icon: <TrendingUp size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=ld-manager',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isAdmin) {
    actorTabs = [
      {
        label: 'User Management',
        href: '/admin/users',
        icon: <Users size={15} />,
      },
      {
        label: 'Role-Skill Taxonomy',
        href: '/admin/dashboard',
        icon: <Layers size={15} />,
      },
      {
        label: 'Knowledge Graph',
        href: '/admin/knowledge-graph',
        icon: <Network size={15} />,
      },
      {
        label: 'Design System',
        href: '/admin/design-system',
        icon: <Palette size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=admin',
        icon: <Activity size={15} />,
      },
    ]
  }

  // Active user profile metadata based on 4 actors
  const userProfile = isEmployee
    ? {
        name: 'Alex Chen',
        email: 'alex.chen@adaptlearn.internal',
        role: 'Employee (Learner)',
        initials: 'AC',
        portal: 'Employee Portal',
        details: [
          { label: 'Department', value: 'Machine Learning & Cognitive Architecture' },
          { label: 'Assigned Line Manager', value: 'David Miller' },
          { label: 'Target Role', value: 'AI Knowledge Architect' },
          { label: 'Current Status', value: 'Diagnostic Active • 92% Highest Score' },
        ],
      }
    : isLineManager
    ? {
        name: 'David Miller',
        email: 'david.miller@adaptlearn.internal',
        role: 'Engineering Line Manager',
        initials: 'DM',
        portal: 'Line Manager Console',
        details: [
          { label: 'Department', value: 'Machine Learning & Cognitive Architecture' },
          { label: 'Direct Reports', value: '4 Supervised Engineers' },
          { label: 'Management Scope', value: 'Target Role Assignment & Baseline Diagnostics' },
        ],
      }
    : isLdManager
    ? {
        name: 'Sarah Connor',
        email: 'sarah.connor@adaptlearn.internal',
        role: 'Enterprise L&D Director',
        initials: 'SC',
        portal: 'L&D Manager Console',
        details: [
          { label: 'Department', value: 'Enterprise Talent & Knowledge Development' },
          { label: 'Organization Scope', value: 'Cross-Departmental Skill Matrices' },
          { label: 'Readiness Benchmark', value: '78% Average Team Readiness' },
        ],
      }
    : {
        name: 'Elena Rostova',
        email: 'elena.rostova@adaptlearn.internal',
        role: 'Lead System Administrator',
        initials: 'ER',
        portal: 'Administration',
        details: [
          { label: 'Department', value: 'Corporate Ontology & Governance' },
          { label: 'Scope', value: 'RBAC User Management & Neo4j Knowledge Graph' },
          { label: 'Cluster Connectivity', value: 'Neo4j Bolt: Active' },
        ],
      }

  // Helper for determining whether a nav tab is active
  const isTabActive = (itemHref: string) => {
    if (itemHref.startsWith('/system-status')) {
      return (
        path.startsWith('/system-status') &&
        ((isEmployee && (!location.search || location.search.includes('portal=employee') || location.search.includes('portal=learner'))) ||
          (isLineManager && location.search.includes('portal=line-manager')) ||
          (isLdManager && (location.search.includes('portal=ld-manager') || location.search.includes('portal=manager'))) ||
          (isAdmin && location.search.includes('portal=admin')))
      )
    }
    if (itemHref === '/employee/overview') {
      return path === '/employee/overview' || path === '/employee' || path === '/learner/overview' || path === '/learner' || path === '/'
    }
    if (itemHref === '/employee/pathway') {
      return path === '/employee/pathway' || path === '/learner/pathway'
    }
    if (itemHref === '/employee/gap-analysis') {
      return path === '/employee/gap-analysis' || path === '/learner/gap-analysis'
    }
    if (itemHref === '/employee/assessment') {
      return path === '/employee/assessment' || path === '/assessment' || path === '/learner/assessment'
    }
    if (itemHref === '/line-manager/employees') {
      return path.startsWith('/line-manager')
    }
    if (itemHref === '/ld-manager/learning-outcomes') {
      return (
        path === '/ld-manager/learning-outcomes' ||
        path === '/ld-manager' ||
        path === '/manager/learning-outcomes' ||
        path === '/manager'
      )
    }
    if (itemHref === '/ld-manager/target-roles') {
      return path === '/ld-manager/target-roles' || path === '/manager/target-roles'
    }
    if (itemHref === '/ld-manager/ontology') {
      return path === '/ld-manager/ontology' || path === '/manager/ontology'
    }
    if (itemHref === '/ld-manager/modules') {
      return path === '/ld-manager/modules' || path === '/manager/modules'
    }
    if (itemHref === '/ld-manager/assessment-bank') {
      return path === '/ld-manager/assessment-bank' || path === '/manager/assessment-bank'
    }
    if (itemHref === '/ld-manager/team-matrix') {
      return path === '/ld-manager/team-matrix' || path === '/manager/team-matrix'
    }
    if (itemHref === '/ld-manager/roi-forecast') {
      return path === '/ld-manager/roi-forecast' || path === '/manager/roi-forecast'
    }
    if (itemHref === '/admin/users') {
      return path === '/admin/users'
    }
    if (itemHref === '/admin/dashboard') {
      return path === '/admin/dashboard' || path === '/admin'
    }
    if (itemHref === '/admin/knowledge-graph') {
      return path === '/admin/knowledge-graph' || path === '/knowledge-graph'
    }
    if (itemHref === '/admin/design-system') {
      return path === '/admin/design-system' || path === '/design-system'
    }
    return path === itemHref
  }

  const brandHomeUrl = isEmployee
    ? '/employee/overview'
    : isLineManager
    ? '/line-manager/employees'
    : isLdManager
    ? '/ld-manager/learning-outcomes'
    : '/admin/users'

  return (
    <div className="workspace">
      {/* Top Navigation Header with Tabs directly in Navbar and Far-Right Account */}
      <header className="workspace-header">
        <div className="workspace-topbar">
          {/* Left: Brand */}
          <div className="flex items-center justify-start min-w-0">
            <Link className="brand shrink-0" to={brandHomeUrl}>
              <Network size={22} className="text-primary shrink-0" aria-hidden="true" />
              <span className="font-bold text-sm sm:text-base tracking-tight text-foreground truncate">
                Adapt-Learn-Graph
              </span>
            </Link>
          </div>

          {/* Center: Feature Tabs Directly in Navbar */}
          <nav className="workspace-tabs-nav" aria-label="Feature navigation tabs">
            {actorTabs.map((item) => {
              const active = isTabActive(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`workspace-nav-tab ${active ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Far-Right: Notifications & User Account Card */}
          <div className="flex items-center justify-end gap-2">
            {/* Real-time Employee Notification Bell & Dropdown */}
            <NotificationDropdown />

            {/* Account Menu Button */}
            <div ref={userMenuRef} className="workspace-account relative shrink-0">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`workspace-account-btn ${isUserMenuOpen ? 'active' : ''}`}
                title="Account actions and profile"
                aria-label="User actions menu"
                aria-expanded={isUserMenuOpen}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {userProfile.initials}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left min-w-0">
                  <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[130px]">
                    {userProfile.name}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight truncate">
                    {userProfile.portal}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform duration-150 ${
                    isUserMenuOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="workspace-account-dropdown">
                  {/* Header with enlarged name and email */}
                  <div className="px-4 py-3 border-b border-border bg-muted/25">
                    <p className="text-sm font-bold text-foreground leading-snug truncate">{userProfile.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{userProfile.email}</p>
                  </div>

                  <div className="py-1">
                    {/* Switch Persona Shortcuts Across 4 Actors */}
                    <div className="px-3.5 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Switch Role Portal
                      </span>
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {/* 1. Employee */}
                        <Link
                          to="/employee/overview"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isEmployee
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <GraduationCap size={13} />
                            <span>Employee Portal</span>
                          </span>
                          {isEmployee && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                        </Link>

                        {/* 2. Line Manager */}
                        <Link
                          to="/line-manager/employees"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isLineManager
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Users size={13} />
                            <span>Line Manager</span>
                          </span>
                          {isLineManager && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                        </Link>

                        {/* 3. L&D Manager */}
                        <Link
                          to="/ld-manager/learning-outcomes"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isLdManager
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} />
                            <span>L&D Manager</span>
                          </span>
                          {isLdManager && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                        </Link>

                        {/* 4. Admin */}
                        <Link
                          to="/admin/users"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isAdmin
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck size={13} />
                            <span>Administrator</span>
                          </span>
                          {isAdmin && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                        </Link>
                      </div>
                    </div>

                    <div className="my-1 border-t border-border" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        setIsProfileDialogOpen(true)
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Shield size={13} className="text-primary" />
                      <span>Account Profile Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        toast({
                          title: 'Signed Out',
                          description: 'You have been signed out of Adapt-Learn-Graph.',
                          variant: 'info',
                        })
                        navigate('/login')
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="workspace-body">
        <main className="workspace-main">{children}</main>
      </div>

      {/* User Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <div className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shadow-xs">
                {userProfile.initials}
              </div>
              <div>
                <DialogTitle>{userProfile.name}</DialogTitle>
                <DialogDescription>{userProfile.role}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Shield size={14} className="text-primary" /> Active Portal
              </span>
              <Badge variant="secondary" className="font-semibold">
                {userProfile.portal}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Mail size={14} className="text-primary" /> Enterprise Email
              </span>
              <span className="font-mono text-foreground">{userProfile.email}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Account Credentials & Scope
              </div>
              {userProfile.details.map((d) => (
                <div
                  key={d.label}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/50 last:border-0"
                >
                  <span className="text-muted-foreground">{d.label}:</span>
                  <strong className="text-foreground">{d.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LogOut size={14} />}
              onClick={() => {
                setIsProfileDialogOpen(false)
                toast({
                  title: 'Signed Out',
                  description: 'You have been signed out of Adapt-Learn-Graph.',
                  variant: 'info',
                })
                navigate('/login')
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Sign Out
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsProfileDialogOpen(false)}
            >
              Close Profile
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  )
}