import * as React from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  Briefcase,
  CheckSquare,
  Compass,
  GraduationCap,
  Layers,
  LogOut,
  Mail,
  MoreHorizontal,
  Network,
  Palette,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
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

interface SidebarItem {
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
      {
        label: 'Server Status',
        href: '/system-status?portal=learner',
        icon: <Activity size={17} />,
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
      {
        label: 'Server Status',
        href: '/system-status?portal=manager',
        icon: <Activity size={17} />,
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
      {
        label: 'Server Status',
        href: '/system-status?portal=admin',
        icon: <Activity size={17} />,
      },
    ]
  }

  // Active user profile metadata based on role
  const userProfile = isLearner
    ? {
        name: 'Alex Chen',
        email: 'alex.chen@adaptlearn.internal',
        role: 'AI Knowledge Architect Track',
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

  const showSidebar = sidebarItems.length > 0

  return (
    <div className="workspace">
      <header className="topbar">
        <div className="flex items-center space-x-6">
          <Link className="brand" to="/learner/pathway">
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

        {/* Topbar Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/40 border border-border text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success inline-block" />
            <span>Org SSO: Active</span>
          </div>
          <Link
            to="/login"
            className="text-xs px-3 py-1 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
            title="Switch account or login"
          >
            Sign Out
          </Link>
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
                  (item.href.startsWith('/system-status') && path.startsWith('/system-status')) ||
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

            {/* Bottom User Card & Options Menu */}
            <div ref={userMenuRef} className="workspace-sidebar-user relative">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors group">
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  onClick={() => setIsProfileDialogOpen(true)}
                  title="Click to view profile"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {userProfile.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {userProfile.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {userProfile.portal}
                    </div>
                  </div>
                </div>

                {/* The "..." Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsUserMenuOpen((prev) => !prev)
                  }}
                  className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isUserMenuOpen
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  title="More user options"
                  aria-label="User actions menu"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {/* Popover Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground truncate">{userProfile.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">{userProfile.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        setIsProfileDialogOpen(true)
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <User size={14} className="text-primary" />
                      <span>View Profile</span>
                    </button>

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
                      className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        <main className={`workspace-main ${!showSidebar ? 'full-width' : ''}`}>
          {children}
        </main>
      </div>

      {/* Profile Dialog */}
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