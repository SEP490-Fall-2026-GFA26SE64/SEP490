import { useLocalDemoSession } from '../hooks/useLocalDemoSession'
import * as React from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  Award,
  BookOpen,
  Briefcase,
  Building,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Compass,
  CreditCard,
  FileQuestion,
  FileText,
  FolderTree,
  GitFork,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Network,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Users,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GlobalSearchbar } from '../components/ui/GlobalSearchbar'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { NotificationDropdown } from '../components/ui/NotificationDropdown'
import { useToast } from '../hooks/useToast'
import { useTranslation } from '../i18n/LanguageContext'
import { Badge } from '../components/ui/Badge'
import {
  getActiveCompany,
  loadCompanies,
  setActiveCompanyId,
  type CompanyRecord,
} from '../stores/companyStore'
import { getUserProfile } from '../stores/userProfileStore'
import './WorkspaceLayout.css'

interface NavTabItem {
  label: string
  href: string
  icon: React.ReactNode
}

export type ActorRole = 'learner' | 'employee' | 'expert' | 'ld-manager' | 'admin' | 'platform-admin'

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const demo = useLocalDemoSession()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const path = location.pathname

  // Active Company tracking
  const [activeCompany, setActiveCompanyState] = React.useState<CompanyRecord>(getActiveCompany)

  React.useEffect(() => {
    const handleUpdate = () => {
      setActiveCompanyState(getActiveCompany())
    }
    window.addEventListener('active_company_changed', handleUpdate)
    window.addEventListener('companies_updated', handleUpdate)
    return () => {
      window.removeEventListener('active_company_changed', handleUpdate)
      window.removeEventListener('companies_updated', handleUpdate)
    }
  }, [])

  // User menu state & profile update listener
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const [, setProfileRevision] = React.useState(0)
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileRevision((prev) => prev + 1)
    }
    window.addEventListener('user_profile_updated', handleProfileUpdate)
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate)
  }, [])

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

  // Persist active actor context across route changes in useEffect
  React.useEffect(() => {
    if (path.startsWith('/platform-admin')) {
      localStorage.setItem('active_actor', 'platform-admin')
    } else if (path.startsWith('/expert')) {
      localStorage.setItem('active_actor', 'expert')
    } else if (path.startsWith('/ld-manager') || path.startsWith('/manager')) {
      localStorage.setItem('active_actor', 'ld-manager')
    } else if (
      path.startsWith('/admin') ||
      path.startsWith('/knowledge-graph') ||
      path.startsWith('/design-system')
    ) {
      localStorage.setItem('active_actor', 'admin')
    } else if (
      path.startsWith('/employee') ||
      path.startsWith('/learner') ||
      path === '/assessment'
    ) {
      localStorage.setItem('active_actor', 'employee')
    }
  }, [path])

  // Pure resolver for active actor context
  const getActiveActor = (): ActorRole => {
    if (path.startsWith('/platform-admin')) return 'platform-admin'
    if (path.startsWith('/expert')) return 'expert'
    if (path.startsWith('/ld-manager') || path.startsWith('/manager')) return 'ld-manager'
    if (
      path.startsWith('/admin') ||
      path.startsWith('/knowledge-graph') ||
      path.startsWith('/design-system')
    ) {
      return 'admin'
    }
    if (
      path.startsWith('/employee') ||
      path.startsWith('/learner') ||
      path === '/assessment'
    ) {
      return 'employee'
    }

    const savedActor = localStorage.getItem('active_actor') as ActorRole | null
    if (savedActor === 'platform-admin' || savedActor === 'expert' || savedActor === 'ld-manager' || savedActor === 'admin') {
      return savedActor
    }
    return 'employee'
  }

  const activeActor = getActiveActor()
  const isEmployee = activeActor === 'employee' || activeActor === 'learner'
  const isExpert = activeActor === 'expert'
  const isLdManager = activeActor === 'ld-manager'
  const isAdmin = activeActor === 'admin'
  const isPlatformAdmin = activeActor === 'platform-admin'

  // Actor-specific navigation tabs for the navbar
  let actorTabs: NavTabItem[] = []

  if (isEmployee) {
    actorTabs = [
      {
        label: t('nav.overview'),
        href: '/employee/overview',
        icon: <LayoutDashboard size={15} />,
      },
      {
        label: t('nav.upskilling'),
        href: '/employee/upskilling',
        icon: <Target size={15} />,
      },
      {
        label: t('baselineUi.myMastery'),
        href: '/employee/my-mastery',
        icon: <Award size={15} />,
      },
      {
        label: t('nav.pathway'),
        href: '/employee/pathway',
        icon: <GitFork size={15} />,
      },
      {
        label: t('nav.assessmentQuiz'),
        href: '/employee/assessment',
        icon: <CheckSquare size={15} />,
      },
      {
        label: t('nav.serverStatus'),
        href: '/system-status?portal=employee',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isExpert) {
    actorTabs = [
      {
        label: t('nav.targetRoles'),
        href: '/expert/target-roles',
        icon: <Briefcase size={15} />,
      },
      {
        label: t('nav.pathwayReview', 'Pathway Review'),
        href: '/expert/pathway-review',
        icon: <Compass size={15} />,
      },
      {
        label: t('nav.ontology'),
        href: '/expert/ontology',
        icon: <Network size={15} />,
      },
      {
        label: t('nav.learningContent', 'Learning Content'),
        href: '/expert/learning-content',
        icon: <FileText size={15} />,
      },
      {
        label: t('nav.modules'),
        href: '/expert/modules',
        icon: <BookOpen size={15} />,
      },
      {
        label: t('nav.assessmentBank'),
        href: '/expert/assessment-bank',
        icon: <FileQuestion size={15} />,
      },
      {
        label: t('nav.serverStatus'),
        href: '/system-status?portal=expert',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isLdManager) {
    actorTabs = [
      {
        label: t('nav.learningOutcomes'),
        href: '/ld-manager/dashboard',
        icon: <LayoutDashboard size={15} />,
      },
      {
        label: t('nav.teamMatrix'),
        href: '/ld-manager/team-matrix',
        icon: <Users size={15} />,
      },
      {
        label: t('nav.occupations', 'Occupations'),
        href: '/ld-manager/occupations',
        icon: <FolderTree size={15} />,
      },
      {
        label: t('nav.targetRoles'),
        href: '/ld-manager/target-roles',
        icon: <Briefcase size={15} />,
      },
      {
        label: t('nav.baselineAssessments'),
        href: '/ld-manager/baseline-assessments',
        icon: <ClipboardCheck size={15} />,
      },
      {
        label: t('nav.userDirectory'),
        href: '/ld-manager/users',
        icon: <Users size={15} />,
      },
      {
        label: t('nav.contentApprovals', 'Content Approvals'),
        href: '/ld-manager/approvals',
        icon: <CheckCircle2 size={15} />,
      },
      {
        label: t('nav.serverStatus'),
        href: '/system-status?portal=ld-manager',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isAdmin) {
    actorTabs = [
      {
        label: t('nav.adminConsole', 'System Console'),
        href: '/admin/dashboard',
        icon: <ShieldCheck size={15} />,
      },
      {
        label: t('nav.departments', 'Departments'),
        href: '/admin/departments',
        icon: <Building2 size={15} />,
      },
      {
        label: t('nav.userDirectory', 'User Accounts'),
        href: '/admin/users',
        icon: <Users size={15} />,
      },
      {
        label: t('nav.orgSettings', 'Org Settings'),
        href: '/admin/organization-settings',
        icon: <Settings size={15} />,
      },
      {
        label: t('nav.subscription', 'Subscription'),
        href: '/admin/subscription',
        icon: <CreditCard size={15} />,
      },
      {
        label: t('nav.knowledgeGraph'),
        href: '/admin/knowledge-graph',
        icon: <Network size={15} />,
      },
      {
        label: t('nav.designSystem'),
        href: '/admin/design-system',
        icon: <Palette size={15} />,
      },
      {
        label: t('nav.serverStatus'),
        href: '/system-status?portal=admin',
        icon: <Activity size={15} />,
      },
    ]
  } else if (isPlatformAdmin) {
    actorTabs = [
      {
        label: t('nav.platformOrgs', 'Organizations'),
        href: '/platform-admin/organizations',
        icon: <Building size={15} />,
      },
      {
        label: t('nav.platformSubs', 'Subscriptions'),
        href: '/platform-admin/subscriptions',
        icon: <CreditCard size={15} />,
      },
      {
        label: t('nav.platformActivity', 'Platform Activity'),
        href: '/platform-admin/activity',
        icon: <Activity size={15} />,
      },
      {
        label: t('nav.serverStatus'),
        href: '/system-status?portal=platform-admin',
        icon: <Server size={15} />,
      },
    ]
  }

  // Active user profile metadata based on active actor
  const userProfile = getUserProfile(activeActor)
  function switchPortal(event: React.MouseEvent<HTMLAnchorElement>, persona: string) {
    setIsUserMenuOpen(false)
    if (!demo.enabled) return
    event.preventDefault()
    const destination = event.currentTarget.href
    void demo.choose(persona, destination).then(success => {
      if (!success) toast({ title: t('common.error', 'Error'), description: t('employeeBaseline.requestError'), variant: 'destructive' })
    })
  }

  // Helper for determining whether a nav tab is active
  const isTabActive = (itemHref: string) => {
    if (itemHref.startsWith('/system-status')) {
      return (
        path.startsWith('/system-status') &&
        ((isEmployee && (!location.search || location.search.includes('portal=employee') || location.search.includes('portal=learner'))) ||
          (isExpert && location.search.includes('portal=expert')) ||
          (isLdManager && (location.search.includes('portal=ld-manager') || location.search.includes('portal=manager'))) ||
          (isAdmin && location.search.includes('portal=admin')) ||
          (isPlatformAdmin && location.search.includes('portal=platform-admin')))
      )
    }
    if (itemHref === '/employee/overview' || itemHref === '/learner/overview') {
      return (
        path === '/employee/overview' ||
        path === '/employee' ||
        path === '/learner/overview' ||
        path === '/learner' ||
        path === '/'
      )
    }
    if (itemHref === '/employee/upskilling' || itemHref === '/learner/upskilling') {
      return path === '/employee/upskilling' || path === '/learner/upskilling' || path === '/employee/target-roles' || path === '/learner/target-roles'
    }
    if (itemHref === '/employee/target-roles' || itemHref === '/learner/target-roles') {
      return path === '/employee/target-roles' || path === '/learner/target-roles'
    }
    if (itemHref === '/employee/riasec') {
      return path === '/employee/riasec' || path === '/learner/riasec'
    }
    if (itemHref === '/employee/guidance') {
      return path === '/employee/guidance'
    }
    if (itemHref === '/employee/pathway' || itemHref === '/learner/pathway') {
      return (
        path === '/employee/pathway' ||
        path === '/learner/pathway' ||
        path.startsWith('/employee/modules') ||
        path.startsWith('/learner/modules')
      )
    }
    if (itemHref === '/employee/skills-catalog') {
      return (
        path === '/employee/skills-catalog' ||
        path === '/employee/skills' ||
        path === '/learner/skills-catalog'
      )
    }
    if (itemHref === '/employee/assessment' || itemHref === '/learner/assessment') {
      return path === '/employee/assessment' || path === '/learner/assessment' || path === '/assessment'
    }
    if (itemHref === '/expert/target-roles' || itemHref === '/expert/assigned-roles') {
      return path === '/expert/target-roles' || path === '/expert/assigned-roles'
    }
    if (itemHref === '/expert/pathway-review' || itemHref === '/expert/guidance-review') {
      return path === '/expert/pathway-review' || path === '/expert/guidance-review'
    }
    if (itemHref === '/expert/ontology') {
      return path === '/expert/ontology' || path === '/ld-manager/ontology' || path === '/manager/ontology'
    }
    if (itemHref === '/expert/modules') {
      return path === '/expert/modules' || path === '/ld-manager/modules' || path === '/manager/modules'
    }
    if (itemHref === '/expert/assessment-bank') {
      return path === '/expert/assessment-bank'
    }
    if (itemHref === '/ld-manager/dashboard' || itemHref === '/ld-manager/learning-outcomes') {
      return (
        path === '/ld-manager/dashboard' ||
        path === '/ld-manager/learning-outcomes' ||
        path === '/ld-manager' ||
        path === '/manager/learning-outcomes' ||
        path === '/manager'
      )
    }
    if (itemHref === '/ld-manager/occupations') {
      return path === '/ld-manager/occupations' || path === '/ld-manager/disciplines'
    }
    if (itemHref === '/ld-manager/approvals') {
      return path === '/ld-manager/approvals'
    }
    if (itemHref === '/ld-manager/target-roles') {
      return path === '/ld-manager/target-roles' || path === '/manager/target-roles'
    }
    if (itemHref === '/ld-manager/baseline-assessments') {
      return path.startsWith('/ld-manager/baseline-assessments')
    }
    if (itemHref === '/ld-manager/users') {
      return path === '/ld-manager/users' || path === '/admin/users'
    }
    if (itemHref === '/ld-manager/team-matrix') {
      return path === '/ld-manager/team-matrix' || path === '/manager/team-matrix'
    }
    if (itemHref === '/admin/dashboard') {
      return path === '/admin/dashboard' || path === '/admin'
    }
    if (itemHref === '/admin/departments') {
      return path === '/admin/departments'
    }
    if (itemHref === '/admin/organization-settings') {
      return path === '/admin/organization-settings'
    }
    if (itemHref === '/admin/subscription') {
      return path === '/admin/subscription' || path === '/admin/billing'
    }
    if (itemHref === '/admin/knowledge-graph') {
      return path === '/admin/knowledge-graph' || path === '/knowledge-graph'
    }
    if (itemHref === '/admin/design-system') {
      return path === '/admin/design-system' || path === '/design-system'
    }
    if (itemHref === '/platform-admin/organizations') {
      return path === '/platform-admin/organizations' || path === '/platform-admin'
    }
    if (itemHref === '/platform-admin/subscriptions') {
      return path === '/platform-admin/subscriptions'
    }
    if (itemHref === '/platform-admin/activity') {
      return path === '/platform-admin/activity'
    }
    return path === itemHref
  }

  // Collapsible sidebar state (persisted per actor; default: collapsed for employee, expanded for other actors; automatically minimized on module learning)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() => {
    if (location.pathname.includes('/modules/')) {
      return true
    }
    const saved = localStorage.getItem(`sidebar_collapsed_${activeActor}`)
    if (saved !== null) {
      return saved === 'true'
    }
    return isEmployee
  })

  // Synchronize state when switching actor roles or entering module learning
  React.useEffect(() => {
    if (location.pathname.includes('/modules/')) {
      setIsSidebarCollapsed(true)
      return
    }
    const saved = localStorage.getItem(`sidebar_collapsed_${activeActor}`)
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true')
    } else {
      setIsSidebarCollapsed(isEmployee)
    }
  }, [activeActor, isEmployee, location.pathname])

  React.useEffect(() => {
    const handleMinimize = () => setIsSidebarCollapsed(true)
    window.addEventListener('minimize-system-sidebar', handleMinimize)
    return () => window.removeEventListener('minimize-system-sidebar', handleMinimize)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(`sidebar_collapsed_${activeActor}`, String(next))
      return next
    })
  }

  const brandHomeUrl = isPlatformAdmin
    ? '/platform-admin/organizations'
    : isEmployee
    ? '/employee/upskilling'
    : isExpert
    ? '/expert/assigned-roles'
    : isLdManager
    ? '/ld-manager/dashboard'
    : '/admin/dashboard'

  return (
    <div className={`workspace ${isEmployee ? 'workspace--employee' : ''}`}>
      {/* Top Header */}
      <header className="workspace-header">
        <div className="workspace-topbar">
          {/* Left: Sidebar Collapse/Expand Toggle + Brand + My Learning link */}
          <div className="flex items-center justify-start gap-2.5 sm:gap-3 shrink-0">
            {!location.pathname.includes('/modules/') && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
              </button>
            )}
            <Link className="brand shrink-0" to={brandHomeUrl}>
              <Network size={22} className="text-primary shrink-0" aria-hidden="true" />
              <span className="font-bold text-sm sm:text-base tracking-tight text-foreground truncate hidden md:inline">
                Adapt-Learn-Graph
              </span>
            </Link>

            {/* Home + My Learning links (Coursera style - Employee only) */}
            {isEmployee && (
              <>
                <Link
                  to="/employee/upskilling"
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                    path === '/employee/upskilling'
                      ? 'bg-secondary text-primary font-bold shadow-2xs border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                  title="Home (Upskilling)"
                >
                  Home
                </Link>
                <Link
                  to="/employee/pathway"
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                    path === '/employee/pathway'
                      ? 'bg-secondary text-primary font-bold shadow-2xs border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                  title="My Learning (Adaptive Pathway)"
                >
                  My Learning
                </Link>
              </>
            )}
          </div>

          {/* Center: Coursera-style Global Searchbar (Employee only) */}
          {isEmployee && (
            <div className="workspace-header-search flex-1 max-w-xl mx-2 sm:mx-4 min-w-0">
              <GlobalSearchbar />
            </div>
          )}

          {/* Far-Right: Help, Language Switcher, Notifications & User Account Card */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Help / Support Icon Button */}
            <button
              type="button"
              onClick={() => {
                toast({
                  title: 'Help & Knowledge Center',
                  description: isEmployee
                    ? 'Search skills or target roles to set milestones, or navigate to My Learning for your adaptive pathway.'
                    : 'Access system documentation, manage competency ontologies, or consult role catalogs.',
                })
              }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Help & Support"
              aria-label="Help & Support"
            >
              <HelpCircle size={18} />
            </button>

            {/* Language Switcher (EN / VI) */}
            <LanguageSwitcher />

            {/* Real-time Notification Bell & Dropdown */}
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
                    <p className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1">
                      <Building size={12} /> {activeCompany.name}
                    </p>
                  </div>

                  {/* Active Organization Switcher for Multi-Tenant Testing */}
                  <div className="px-3.5 py-2.5 border-b border-border bg-muted/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Building size={11} className="text-primary" /> Active Workspace
                      </span>
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                        {activeCompany.packageTier}
                      </Badge>
                    </div>
                    <select
                      value={activeCompany.id}
                      onChange={(e) => {
                        const newId = e.target.value
                        setActiveCompanyId(newId)
                        const target = loadCompanies().find((c) => c.id === newId)
                        toast({
                          title: 'Workspace Switched',
                          description: `Switched active organization to ${target?.name || newId}.`,
                          variant: 'info',
                        })
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                    >
                      {loadCompanies().map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} ({comp.packageTier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="py-1">
                    {/* Switch Persona Shortcuts Across 4 Primary Roles */}
                    <div className="px-3.5 py-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t('roles.switchRolePortal')}
                      </span>
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        {/* 1. Employee */}
                        <Link
                          to="/employee/overview"
                          onClick={event => switchPortal(event, 'employee-a')}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isEmployee
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <GraduationCap size={13} />
                            <span>{t('roles.employee')}</span>
                          </span>
                          {isEmployee && <span className="text-[9px] font-mono font-bold">{t('roles.active')}</span>}
                        </Link>

                        {/* 2. Expert */}
                        <Link
                          to={demo.enabled ? '/expert/pathway-review' : '/expert/assigned-roles'}
                          onClick={event => switchPortal(event, 'expert')}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isExpert
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-primary" />
                            <span>{t('roles.expert')}</span>
                          </span>
                          {isExpert && <span className="text-[9px] font-mono font-bold">{t('roles.active')}</span>}
                        </Link>

                        {/* 3. L&D Manager */}
                        <Link
                          to={demo.enabled ? '/ld-manager/baseline-assessments' : '/ld-manager/dashboard'}
                          onClick={event => switchPortal(event, 'ld')}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isLdManager
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} />
                            <span>{t('roles.ldManager')}</span>
                          </span>
                          {isLdManager && <span className="text-[9px] font-mono font-bold">{t('roles.active')}</span>}
                        </Link>

                        {/* 4. Org Admin */}
                        <Link
                          to="/admin/dashboard"
                          onClick={event => switchPortal(event, 'admin')}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isAdmin
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck size={13} />
                            <span>{t('roles.admin', 'System Admin')}</span>
                          </span>
                          {isAdmin && <span className="text-[9px] font-mono font-bold">{t('roles.active')}</span>}
                        </Link>

                        {/* 5. Platform Superadmin */}
                        <Link
                          to="/platform-admin/organizations"
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`px-2 py-1 rounded text-xs flex items-center justify-between transition-colors ${
                            isPlatformAdmin
                              ? 'bg-secondary text-primary font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Building size={13} className="text-primary" />
                            <span>Platform Admin</span>
                          </span>
                          {isPlatformAdmin && <span className="text-[9px] font-mono font-bold">{t('roles.active')}</span>}
                        </Link>
                      </div>
                    </div>

                    <div className="my-1 border-t border-border" />

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full text-left px-3.5 py-1.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <User size={13} className="text-primary" />
                      <span>{t('common.profile')}</span>
                    </Link>

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
                      <span>{t('common.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Workspace Body: Sidebar + Main Content */}
      <div className={`workspace-body ${location.pathname.includes('/modules/') ? 'module-reading-mode' : ''}`}>
        {/* Collapsible Left Sidebar - Hidden completely on module learning pages */}
        {!location.pathname.includes('/modules/') && (
          <aside
            className={`workspace-sidebar ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}
            aria-label="Sidebar navigation"
          >
            {/* Actor-specific feature navigation items */}
            <nav className="workspace-sidebar-nav" aria-label="Portal feature tabs">
              {actorTabs.map((item) => {
                const active = isTabActive(item.href)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`workspace-sidebar-link ${active ? 'active' : ''}`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    {!isSidebarCollapsed && (
                      <span className="sidebar-link-label">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Main Content Area */}
        <main
          className={`workspace-main ${
            location.pathname.includes('/modules/')
              ? '!p-0 !m-0 !max-w-none !w-full module-reading-main'
              : ''
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
