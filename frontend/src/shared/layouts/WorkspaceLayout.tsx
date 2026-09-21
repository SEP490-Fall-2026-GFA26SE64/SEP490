import * as React from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  Briefcase,
  CheckSquare,
  ChevronDown,
  Compass,
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
  UserCheck,
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
import { useToast } from '../hooks/useToast'
import './WorkspaceLayout.css'

interface NavTabItem {
  label: string
  href: string
  icon: React.ReactNode
}

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

  // Persist and resolve active actor context
  const getActiveActor = (): 'learner' | 'manager' | 'admin' => {
    if (path.startsWith('/manager')) {
      localStorage.setItem('active_actor', 'manager')
      return 'manager'
    }
    if (
      path.startsWith('/admin') ||
      path.startsWith('/knowledge-graph') ||
      path.startsWith('/design-system')
    ) {
      localStorage.setItem('active_actor', 'admin')
      return 'admin'
    }
    if (path.startsWith('/learner') || path === '/assessment') {
      localStorage.setItem('active_actor', 'learner')
      return 'learner'
    }

    const savedActor = localStorage.getItem('active_actor') as 'learner' | 'manager' | 'admin' | null
    if (savedActor === 'manager' || savedActor === 'admin') {
      return savedActor
    }
    return 'learner'
  }

  const activeActor = getActiveActor()
  const isLearner = activeActor === 'learner'
  const isManager = activeActor === 'manager'
  const isAdmin = activeActor === 'admin'

  // Actor-specific navigation tabs for the navbar
  let actorTabs: NavTabItem[] = []

  if (isLearner) {
    actorTabs = [
      {
        label: 'Overview',
        href: '/learner/overview',
        icon: <LayoutDashboard size={15} />,
      },
      {
        label: 'Adaptive Pathway',
        href: '/learner/pathway',
        icon: <Compass size={15} />,
      },
      {
        label: 'Gap Analysis',
        href: '/learner/gap-analysis',
        icon: <Award size={15} />,
      },
      {
        label: 'Assessment Quiz',
        href: '/learner/assessment',
        icon: <CheckSquare size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=learner',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isManager) {
    actorTabs = [
      {
        label: 'Team Matrix',
        href: '/manager/team-matrix',
        icon: <Users size={15} />,
      },
      {
        label: 'Upskilling & ROI',
        href: '/manager/roi-forecast',
        icon: <TrendingUp size={15} />,
      },
      {
        label: '360° Evaluations',
        href: '/manager/evaluations',
        icon: <UserCheck size={15} />,
      },
      {
        label: 'Server Status',
        href: '/system-status?portal=manager',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isAdmin) {
    actorTabs = [
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

  // Active user profile metadata based on role
  const userProfile = isLearner
    ? {
        name: 'Alex Chen',
        email: 'alex.chen@adaptlearn.internal',
        role: 'Learner',
        initials: 'AC',
        portal: 'Learner Portal',
        details: [
          { label: 'Department', value: 'Machine Learning & Cognitive Architecture' },
          { label: 'Competencies', value: 'GNN Embeddings, Neo4j Traversal, SPARQL' },
          { label: 'Current Status', value: 'Fast-Track Active • 92% Highest Score' },
        ],
      }
    : isManager
      ? {
          name: 'Sarah Connor',
          email: 'sarah.connor@adaptlearn.internal',
          role: 'Engineering Director',
          initials: 'SC',
          portal: 'Manager Console',
          details: [
            { label: 'Department', value: 'Enterprise Knowledge Systems Team' },
            { label: 'Team Scope', value: '3 Direct Members Scoped' },
            { label: 'Readiness Benchmark', value: '78% Average Team Readiness' },
          ],
        }
      : {
          name: 'Elena Rostova',
          email: 'elena.rostova@adaptlearn.internal',
          role: 'Lead Knowledge Ontologist',
          initials: 'ER',
          portal: 'Administration',
          details: [
            { label: 'Department', value: 'Corporate Ontology & Governance' },
            { label: 'Knowledge Graph Scope', value: '641 Nodes • 1,174 Relationship Edges' },
            { label: 'Cluster Connectivity', value: 'Neo4j Bolt: Active' },
          ],
        }

  // Helper for determining whether a nav tab is active
  const isTabActive = (itemHref: string) => {
    if (itemHref.startsWith('/system-status')) {
      return (
        path.startsWith('/system-status') &&
        ((isLearner && (!location.search || location.search.includes('portal=learner'))) ||
          (isManager && location.search.includes('portal=manager')) ||
          (isAdmin && location.search.includes('portal=admin')))
      )
    }
    if (itemHref === '/learner/overview') {
      return path === '/learner/overview' || path === '/learner' || path === '/'
    }
    if (itemHref === '/learner/pathway') {
      return path === '/learner/pathway'
    }
    if (itemHref === '/learner/gap-analysis') {
      return path === '/learner/gap-analysis'
    }
    if (itemHref === '/learner/assessment') {
      return path === '/learner/assessment' || path === '/assessment'
    }
    if (itemHref === '/manager/team-matrix') {
      return path === '/manager/team-matrix' || path === '/manager'
    }
    if (itemHref === '/manager/roi-forecast') {
      return path === '/manager/roi-forecast'
    }
    if (itemHref === '/manager/evaluations') {
      return path === '/manager/evaluations'
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

  return (
    <div className="workspace">
      {/* Top Navigation Header with Tabs directly in Navbar and Far-Right Account */}
      <header className="workspace-header">
        <div className="workspace-topbar">
          {/* Left: Brand */}
          <div className="flex items-center justify-start min-w-0">
            <Link className="brand shrink-0" to={isLearner ? '/learner/overview' : isManager ? '/manager/team-matrix' : '/admin/dashboard'}>
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

          {/* Far-Right: User Account Card & Dropdown */}
          <div className="flex items-center justify-end">
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
                  {/* Switch Persona Shortcuts */}
                  <div className="px-3.5 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Switch Role Portal
                    </span>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      <Link
                        to="/learner/overview"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                          isLearner
                            ? 'bg-secondary text-primary font-semibold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <GraduationCap size={13} />
                          <span>Learner Portal</span>
                        </span>
                        {isLearner && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                      </Link>

                      <Link
                        to="/manager/team-matrix"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                          isManager
                            ? 'bg-secondary text-primary font-semibold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={13} />
                          <span>Manager Console</span>
                        </span>
                        {isManager && <span className="text-[9px] font-mono font-bold">ACTIVE</span>}
                      </Link>

                      <Link
                        to="/admin/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                          isAdmin
                            ? 'bg-secondary text-primary font-semibold'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={13} />
                          <span>Administration</span>
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

      {/* Main Content Area (Full-Width, No Sidebar) */}
      <div className="workspace-body">
        <main className="workspace-main">
          {children}
        </main>
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
                <div key={d.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/50 last:border-0">
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