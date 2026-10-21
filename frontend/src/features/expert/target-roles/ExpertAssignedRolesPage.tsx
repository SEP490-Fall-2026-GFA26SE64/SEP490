import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Eye,
  History,
  Layers,
  Lock,
  Network as NetworkIcon,
  Plus,
  Search,
  Sliders,
  Trash2,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Pagination } from '../../../shared/components/ui/Pagination'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany, updateActiveCompany } from '../../../shared/stores/companyStore'
import {
  CAREER_FAMILIES,
  ELIGIBLE_EXPERTS,
  JOB_DOMAINS,
  compareRoleVersions,
  sortTargetRolesWithDraftsBelowPublished,
  type MicroSkillModel,
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'
import { fetchMicroSkills } from '../../../shared/api/microSkillApi'
import { TargetRoleGraphModal } from '../../manager/target-roles/components/TargetRoleGraphModal'

export function ExpertAssignedRolesPage() {
  const { toast } = useToast()

  // Company state
  const activeCompany = getActiveCompany()
  const orgId = activeCompany?.id || 'comp-technova'
  const [realMicroSkills, setRealMicroSkills] = React.useState<MicroSkillModel[]>([])

  const fetchSkills = React.useCallback(async () => {
    try {
      const list = await fetchMicroSkills(orgId)
      if (list && list.length > 0) {
        const mapped: MicroSkillModel[] = list.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description || '',
          status: 'ACTIVE',
          macroCompetencyCode: s.macroCompetencyCode || 'KNOWLEDGE',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
        setRealMicroSkills(mapped)
      }
    } catch {
      // API error: realMicroSkills remains empty
    }
  }, [orgId])

  React.useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  // Strictly 100% real data fetched from Neo4j database via /api/v1/organizations/{orgId}/micro-skills
  const companyMicroSkills = realMicroSkills

  // Active Expert identity
  const [selectedExpertId] = React.useState<string>(() => {
    return localStorage.getItem('expert_active_id') || ELIGIBLE_EXPERTS[0].id
  })

  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const activeExpert = ELIGIBLE_EXPERTS.find((e) => e.id === selectedExpertId) || ELIGIBLE_EXPERTS[0]

  const fetchAssignedRoles = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/organizations/${orgId}/target-roles?assignedExpertId=${encodeURIComponent(selectedExpertId)}`,
        {
          headers: {
            'X-User-Role': 'DOMAIN_EXPERT',
            'X-User-Id': selectedExpertId,
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const mapped: TargetRoleModel[] = (data as Record<string, unknown>[]).map((r) => ({
          id: String(r.id || ''),
          stableId: String(r.code || ''),
          code: String(r.code || ''),
          title: String(r.name || ''),
          domainCode: String(r.domainCode || ''),
          familyCode: String(r.familyCode || ''),
          track: r.track as TargetRoleModel['track'],
          seniority: String(r.seniority || (r.track === 'MANAGEMENT' ? 'M3' : 'P3')),
          assignedExpertId: r.assignedExpertId ? String(r.assignedExpertId) : undefined,
          assignedExpertName: ELIGIBLE_EXPERTS.find((e) => e.id === r.assignedExpertId)?.name || String(r.assignedExpertId || ''),
          department: JOB_DOMAINS.find((d) => d.code === r.domainCode)?.name || String(r.domainCode || 'Information Technology'),
          description: String(r.description || ''),
          responsibilities: Array.isArray(r.responsibilities) ? (r.responsibilities as string[]) : [],
          version: String(r.version || '1.0'),
          status: (String(r.status || '').toLowerCase() === 'active' ? 'published' : String(r.status || 'draft').toLowerCase()) as TargetRoleModel['status'],
          rejectionReason: String(r.rejectionReason || ''),
          competencyIds: [],
          skillTargets: Array.isArray(r.skillTargets) ? (r.skillTargets as TargetRoleModel['skillTargets']) : [],
          activeEnrollments: 0,
          createdAt: String(r.createdAt || r.updatedAt || new Date().toISOString()),
          updatedAt: String(r.updatedAt || r.createdAt || new Date().toISOString()),
        }))
        setRoles(mapped)
      } else {
        const fallbackRoles = activeCompany?.targetRoles || []
        setRoles(fallbackRoles)
      }
    } catch {
      const fallbackRoles = activeCompany?.targetRoles || []
      setRoles(fallbackRoles)
    } finally {
      setIsLoading(false)
    }
  }, [orgId, selectedExpertId])

  React.useEffect(() => {
    fetchAssignedRoles()
  }, [fetchAssignedRoles])

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      fetchAssignedRoles()
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [fetchAssignedRoles])

  // Save roles update helper
  const saveAndSetRoles = React.useCallback(
    (updater: TargetRoleModel[] | ((prev: TargetRoleModel[]) => TargetRoleModel[])) => {
      setRoles((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({
          ...c,
          targetRoles: next,
        }))
        return next
      })
    },
    []
  )

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusTab, setStatusTab] = React.useState<'all' | 'sent' | 'draft' | 'published' | 'rejected'>('all')
  const [expandedLineages, setExpandedLineages] = React.useState<Record<string, boolean>>({})

  const toggleLineage = (lineageKey: string) => {
    setExpandedLineages((prev) => ({
      ...prev,
      [lineageKey]: !prev[lineageKey],
    }))
  }

  // Sort criteria: defaults to 'latest' so newly created or updated roles go to the top
  const [sortBy, setSortBy] = React.useState<'latest' | 'title'>('latest')

  // Filter roles: STRICT ISOLATION by assignedExpertId, sorted with drafts below published
  const assignedRoles = React.useMemo(() => {
    const expertRoles = roles.filter((r) => r.assignedExpertId === selectedExpertId)
    return sortTargetRolesWithDraftsBelowPublished(expertRoles, sortBy)
  }, [roles, selectedExpertId, sortBy])

  const filteredRoles = React.useMemo(() => {
    const sorted = sortTargetRolesWithDraftsBelowPublished(assignedRoles, sortBy)
    return sorted.filter((role) => {
      const matchesSearch =
        role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.department && role.department.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusTab === 'all'
          ? true
          : statusTab === 'draft'
          ? role.status === 'draft'
          : statusTab === 'sent'
          ? role.status === 'sent'
          : role.status === statusTab

      return matchesSearch && matchesStatus
    })
  }, [assignedRoles, searchQuery, statusTab, sortBy])

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Reset page when filter/search/expert/sort changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusTab, selectedExpertId, sortBy])

  // Visible roles considering collapsed/expanded lineages
  const visibleRoles = React.useMemo(() => {
    return filteredRoles.filter((role) => {
      const isPublished = role.status === 'published'
      const publishedInLineage = assignedRoles
        .filter((r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published')
        .sort((a, b) => compareRoleVersions(b.version, a.version))

      const newestPublished = publishedInLineage[0]
      const isOlderPublished = isPublished && newestPublished && role.id !== newestPublished.id
      const lineageKey = role.stableId || role.code
      const isLineageExpanded = Boolean(expandedLineages[lineageKey])

      return !(isOlderPublished && !isLineageExpanded)
    })
  }, [filteredRoles, assignedRoles, expandedLineages])

  const totalPages = Math.max(1, Math.ceil(visibleRoles.length / pageSize))
  const paginatedRoles = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return visibleRoles.slice(start, start + pageSize)
  }, [visibleRoles, currentPage, pageSize])

  // Aggregate Metrics: Expert views sent/dispatched roles separately from drafts
  const sentCount = assignedRoles.filter((r) => r.status === 'sent').length
  const draftCount = assignedRoles.filter((r) => r.status === 'draft').length
  const publishedCount = assignedRoles.filter((r) => r.status === 'published').length
  const rejectedCount = assignedRoles.filter((r) => r.status === 'rejected').length
  const totalSkillTargets = assignedRoles.reduce((sum, r) => sum + r.skillTargets.length, 0)

  // Target Role Details Modal State (Read-only view of role architecture)
  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)
  const [graphRole, setGraphRole] = React.useState<TargetRoleModel | null>(null)

  // Rejection Dialog State
  const [rejectingRole, setRejectingRole] = React.useState<TargetRoleModel | null>(null)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState('')

  const handleOpenRejectDialog = (role: TargetRoleModel) => {
    setRejectingRole(role)
    setRejectionReason(role.rejectionReason || '')
    setIsRejectDialogOpen(true)
  }

  const handleConfirmRejection = async () => {
    if (!rejectingRole || !rejectionReason.trim()) return

    const updatedRole: TargetRoleModel = {
      ...rejectingRole,
      status: 'rejected',
      rejectionReason: rejectionReason.trim(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${rejectingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: rejectingRole.title,
          domainCode: rejectingRole.domainCode,
          familyCode: rejectingRole.familyCode,
          track: rejectingRole.track,
          seniority: rejectingRole.seniority,
          responsibilities: rejectingRole.responsibilities,
          assignedExpertId: rejectingRole.assignedExpertId,
          description: rejectingRole.description,
          status: 'REJECTED',
          version: rejectingRole.version,
          skillTargets: rejectingRole.skillTargets,
          rejectionReason: rejectionReason.trim(),
        }),
      })
      await fetchAssignedRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
    }

    if (authoringRole?.id === updatedRole.id) {
      setAuthoringRole(updatedRole)
      setIsAuthoringModalOpen(false)
    }

    setIsRejectDialogOpen(false)
    setRejectingRole(null)

    toast({
      title: 'Target Role Rejected',
      description: `${updatedRole.title} (v${updatedRole.version}) has been rejected and returned to the L&D Manager.`,
      variant: 'warning',
    })
  }

  // Micro-Skill Authoring Modal State
  const [authoringRole, setAuthoringRole] = React.useState<TargetRoleModel | null>(null)
  const [isAuthoringModalOpen, setIsAuthoringModalOpen] = React.useState(false)
  const [configuredSkillSearch, setConfiguredSkillSearch] = React.useState('')

  // Skill target form state
  const [newSkillId, setNewSkillId] = React.useState('')
  const [newThreshold, setNewThreshold] = React.useState(80)
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = React.useState(false)

  const availableSkills = React.useMemo(() => {
    if (!authoringRole) return []
    return companyMicroSkills.filter((s) => !authoringRole.skillTargets.some((st) => st.skillId === s.id))
  }, [authoringRole, companyMicroSkills])

  const skillOptions: ComboboxOption[] = React.useMemo(() => {
    return availableSkills.map((skill) => ({
      value: skill.id,
      label: `${skill.code} — ${skill.name}`,
      description: skill.description || undefined,
    }))
  }, [availableSkills])

  const handleOpenAuthoring = (role: TargetRoleModel) => {
    setAuthoringRole(role)
    const available = companyMicroSkills.filter((s) => !role.skillTargets.some((st) => st.skillId === s.id))
    if (available.length > 0) {
      setNewSkillId(available[0].id)
    } else {
      setNewSkillId('')
    }
    setNewThreshold(80)
    setConfiguredSkillSearch('')
    setIsAuthoringModalOpen(true)
  }

  // Add micro-skill target
  const handleAddSkillTarget = async () => {
    if (!authoringRole || !newSkillId) return

    const skillObj = companyMicroSkills.find((s) => s.id === newSkillId)
    if (!skillObj) return

    if (authoringRole.skillTargets.some((st) => st.skillId === newSkillId)) {
      toast({
        title: 'Duplicate Skill',
        description: 'This micro-skill is already assigned to this target role.',
        variant: 'destructive',
      })
      return
    }

    const newTarget: SkillTargetConfig = {
      skillId: skillObj.id,
      skillCode: skillObj.code,
      skillName: skillObj.name,
      threshold: Number(newThreshold) || 80,
    }

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      skillTargets: [...authoringRole.skillTargets, newTarget],
      updatedAt: new Date().toISOString(),
    }

    setAuthoringRole(updatedRole)
    saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))

    // Reset skill selector
    const remaining = companyMicroSkills.filter(
      (s) => s.id !== newSkillId && !updatedRole.skillTargets.some((st) => st.skillId === s.id)
    )
    setNewSkillId(remaining.length > 0 ? remaining[0].id : '')

    // Persist immediately to database so reload preserves authored micro-skills
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: updatedRole.title,
          domainCode: updatedRole.domainCode,
          familyCode: updatedRole.familyCode,
          track: updatedRole.track,
          seniority: updatedRole.seniority,
          responsibilities: updatedRole.responsibilities,
          assignedExpertId: updatedRole.assignedExpertId,
          description: updatedRole.description,
          version: updatedRole.version,
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : updatedRole.status === 'sent' ? 'SENT' : 'DRAFT',
          skillTargets: updatedRole.skillTargets,
        }),
      })
    } catch (e) {
      console.error('Failed to auto-persist skill target:', e)
    }

    toast({
      title: 'Micro-skill Target Added',
      description: `Mapped ${skillObj.name} (${newThreshold}%) to ${updatedRole.title}.`,
      variant: 'success',
    })
  }

  // Remove micro-skill target
  const handleRemoveSkillTarget = async (skillId: string) => {
    if (!authoringRole) return

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      skillTargets: authoringRole.skillTargets.filter((st) => st.skillId !== skillId),
      updatedAt: new Date().toISOString(),
    }

    setAuthoringRole(updatedRole)
    saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))

    // Persist immediately to database so reload preserves removal
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: updatedRole.title,
          domainCode: updatedRole.domainCode,
          familyCode: updatedRole.familyCode,
          track: updatedRole.track,
          seniority: updatedRole.seniority,
          responsibilities: updatedRole.responsibilities,
          assignedExpertId: updatedRole.assignedExpertId,
          description: updatedRole.description,
          version: updatedRole.version,
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : updatedRole.status === 'sent' ? 'SENT' : 'DRAFT',
          skillTargets: updatedRole.skillTargets,
        }),
      })
    } catch (e) {
      console.error('Failed to auto-persist skill target removal:', e)
    }

    toast({
      title: 'Micro-skill Removed',
      description: 'The micro-skill benchmark threshold has been detached from this draft role.',
      variant: 'info',
    })
  }

  // Publish Role from Expert portal once skill requirements are satisfied
  const handlePublishFromExpert = async () => {
    if (!authoringRole) return

    if (authoringRole.skillTargets.length === 0) {
      toast({
        title: 'Micro-skills Required',
        description: 'You must configure at least one micro-skill target before publishing.',
        variant: 'destructive',
      })
      return
    }

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      status: 'published',
      updatedAt: new Date().toISOString(),
    }

    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: authoringRole.title,
          domainCode: authoringRole.domainCode,
          familyCode: authoringRole.familyCode,
          track: authoringRole.track,
          seniority: authoringRole.seniority,
          responsibilities: authoringRole.responsibilities,
          assignedExpertId: authoringRole.assignedExpertId,
          description: authoringRole.description,
          status: 'ACTIVE',
          version: authoringRole.version,
          skillTargets: authoringRole.skillTargets,
        }),
      })
      await fetchAssignedRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
    }

    setAuthoringRole(updatedRole)
    setIsAuthoringModalOpen(false)

    toast({
      title: 'Target Role Published',
      description: `${updatedRole.title} (${updatedRole.code} v${updatedRole.version}) is now active in the enterprise knowledge graph!`,
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Clock className="h-4 w-4 text-sky-500" />}
            title="Assigned Roles (Sent)"
            value={sentCount.toString()}
            valueClassName="text-sky-600 dark:text-sky-400"
            description="Awaiting expert review & skills"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Published Roles"
            value={publishedCount.toString()}
            valueClassName="text-success"
            description="Active in knowledge graph"
          />

          <StatCard
            variant="gradient"
            icon={<Sliders className="h-4 w-4 text-primary" />}
            title="Configured Micro-skills"
            value={totalSkillTargets.toString()}
            valueClassName="text-primary"
            description="Benchmark thresholds defined"
          />

          <StatCard
            variant="gradient"
            icon={<XCircle className="h-4 w-4 text-destructive" />}
            title="Rejected Roles"
            value={rejectedCount.toString()}
            valueClassName="text-destructive"
            description="Returned to L&D with feedback"
          />
        </div>

        {/* Target Roles Catalog Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Target Roles Catalog
                </CardTitle>
                <CardDescription>
                  Configure micro-skill prerequisites, proficiency thresholds (1–100%), and weighting.
                </CardDescription>
              </div>

              {/* Status and Search Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search target roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
                  />
                </div>

                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusTab('all')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'all'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({assignedRoles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('sent')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'sent'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sent ({sentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('draft')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'draft'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Drafts ({draftCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('published')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'published'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Published ({publishedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('rejected')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'rejected'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Rejected ({rejectedCount})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'title')}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="latest">Latest Created / Updated</option>
                    <option value="title">Role Title (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground space-y-3 px-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
                <p className="text-sm font-medium">Loading assigned target roles from database...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-3 px-4">
                <div className="h-12 w-12 rounded-full bg-muted/50 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    No Target Roles Assigned
                  </p>
                  <p className="text-xs max-w-md mx-auto mt-1">
                    There are no target roles assigned to <strong className="text-foreground">{activeExpert.name}</strong> matching your criteria. Target roles must be assigned to your profile by an L&D Manager.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Role Code</th>
                        <th className="py-2.5 px-3">Role Title &amp; Version</th>
                        <th className="py-2.5 px-3">Domain &amp; Family</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Track &amp; Seniority</th>
                        <th className="py-2.5 px-3 text-center">Competency</th>
                        <th className="py-2.5 px-3 text-center">Micro-skill</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Expert Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedRoles.map((role) => {
                      const isDraft = role.status === 'draft'
                      const isSent = role.status === 'sent'
                      const isRejected = role.status === 'rejected'
                      const isPublished = role.status === 'published'

                      // Lineage identification for published versions
                      const publishedInLineage = assignedRoles
                        .filter((r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published')
                        .sort((a, b) => compareRoleVersions(b.version, a.version))

                      const newestPublished = publishedInLineage[0]
                      const isNewestPublished = isPublished && newestPublished && role.id === newestPublished.id
                      const isOlderPublished = isPublished && !isNewestPublished
                      const hasOlderPublished = isNewestPublished && publishedInLineage.length > 1
                      const lineageKey = role.stableId || role.code
                      const isLineageExpanded = Boolean(expandedLineages[lineageKey])

                      // Collapse older published versions if lineage dropdown is not expanded
                      if (isOlderPublished && !isLineageExpanded) {
                        return null
                      }

                      // Identify successor role placed under a published role
                      const predecessorPublished = assignedRoles.find(
                        (r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published' && r.id !== role.id
                      )
                      const isSuccessor = !isPublished && Boolean(predecessorPublished)

                      const domainObj = JOB_DOMAINS.find((d) => d.code === role.domainCode)
                      const familyObj = CAREER_FAMILIES.find((f) => f.code === role.familyCode)

                      return (
                        <tr
                          key={role.id}
                          onClick={() => {
                            if (hasOlderPublished) {
                              toggleLineage(lineageKey)
                            }
                          }}
                          className={`transition-colors ${
                            hasOlderPublished
                              ? 'cursor-pointer select-none hover:bg-primary/5'
                              : 'hover:bg-muted/20'
                          } ${
                            isOlderPublished
                              ? 'bg-muted/5 text-muted-foreground'
                              : isSuccessor
                              ? 'bg-muted/10 border-l-2 border-l-primary/60'
                              : ''
                          }`}
                          title={
                            hasOlderPublished
                              ? isLineageExpanded
                                ? 'Click row to collapse previous versions'
                                : 'Click row to view previous versions'
                              : undefined
                          }
                        >
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            {isOlderPublished ? (
                              <div className="flex items-center gap-1.5 pl-6 text-muted-foreground" title={`Historical version v${role.version}`}>
                                <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground font-normal">{role.code}</span>
                              </div>
                            ) : isSuccessor ? (
                              <div className="flex items-center gap-1.5 pl-3" title="Successor draft positioned below published version">
                                <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{role.code}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {hasOlderPublished && (
                                  <span className="text-primary/70 shrink-0">
                                    {isLineageExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                )}
                                <span>{role.code}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>{role.title}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                v{role.version}
                              </span>
                              {isOlderPublished && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground border-border">
                                  Previous v{role.version}
                                </Badge>
                              )}

                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs mt-0.5">
                              {role.description}
                            </div>
                            {isRejected && role.rejectionReason && (
                              <div className="text-[11px] text-destructive flex items-center gap-1 mt-1 bg-destructive/5 px-2 py-0.5 rounded border border-destructive/20 w-fit" title={role.rejectionReason}>
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span className="font-semibold">Reason:</span>
                                <span className="truncate max-w-xs">{role.rejectionReason}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-foreground">
                              {domainObj ? domainObj.code : role.department || 'ICT'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {familyObj ? familyObj.name : role.familyCode || 'General'}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <Badge variant={role.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px] font-semibold whitespace-nowrap">
                                {role.track || 'PROFESSIONAL'}
                              </Badge>
                              {role.seniority && (
                                <Badge variant="primary" className="text-[10px] font-semibold whitespace-nowrap">
                                  {role.seniority}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              {role.competencyIds.length} linked
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {role.skillTargets.length > 0 ? (
                              <Badge variant="success" className="text-[10px] font-mono">
                                {role.skillTargets.length} configured
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] font-mono animate-pulse">
                                0 configured
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isPublished && <Badge variant="success">PUBLISHED</Badge>}
                            {isSent && (
                              <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400">
                                SENT
                              </Badge>
                            )}
                            {isDraft && <Badge variant="warning">DRAFT</Badge>}
                            {isRejected && <Badge variant="destructive">REJECTED</Badge>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setGraphRole(role)
                                }}
                                title="View Competency Knowledge Graph"
                                aria-label="View Competency Knowledge Graph"
                              >
                                <NetworkIcon className="h-4 w-4 text-primary" />
                              </Button>
                              {(isPublished || isRejected) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setViewingDetailsRole(role)
                                  }}
                                  title="View Role Details"
                                  aria-label="View Role Details"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              {(isSent || isDraft) ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="h-8 w-8 p-0 shadow-2xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenAuthoring(role)
                                    }}
                                    title="Configure Micro-skills"
                                    aria-label="Configure Micro-skills"
                                  >
                                    <Sliders className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:border-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenRejectDialog(role)
                                    }}
                                    title="Reject Role with Feedback"
                                    aria-label="Reject Role with Feedback"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : isRejected ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenAuthoring(role)
                                  }}
                                  title="Revise Micro-skills"
                                  aria-label="Revise Micro-skills"
                                >
                                  <Sliders className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {visibleRoles.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={visibleRoles.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  itemLabel="assigned roles"
                />
              )}
            </>
          )}
          </CardContent>
        </Card>
      </div>

      {/* MICRO-SKILL AUTHORING MODAL (EXCLUSIVE TO DOMAIN EXPERT) */}
      {authoringRole && (
        <Dialog open={isAuthoringModalOpen} onOpenChange={setIsAuthoringModalOpen} className="max-w-3xl min-h-[580px] max-h-[92vh] flex flex-col p-6 overflow-hidden transition-all duration-200">
          <DialogHeader className="shrink-0 mb-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary shrink-0" />
                  <span>
                    Micro-skill Authoring: {authoringRole.title}
                  </span>
                </DialogTitle>
                <Badge
                  variant={
                    authoringRole.status === 'published'
                      ? 'success'
                      : authoringRole.status === 'sent'
                      ? 'primary'
                      : authoringRole.status === 'rejected'
                      ? 'destructive'
                      : 'warning'
                  }
                  className={
                    authoringRole.status === 'sent'
                      ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400'
                      : 'font-bold'
                  }
                >
                  v{authoringRole.version} {authoringRole.status.toUpperCase()}
                </Badge>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Read-Only Macro Role Architecture Overview (Cannot be edited by Domain Expert) */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    Macro Role Architecture (Read-Only)
                  </span>
                  <span className="text-[10px] text-muted-foreground italic">
                    Authored by L&amp;D Manager · Uneditable
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>
                    <span className="font-mono font-bold text-foreground mt-0.5 block">{authoringRole.code}</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Track &amp; Seniority</span>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <Badge variant={authoringRole.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px]">
                        {authoringRole.track || 'PROFESSIONAL'}
                      </Badge>
                      {authoringRole.seniority && (
                        <Badge variant="primary" className="text-[10px]">
                          {authoringRole.seniority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                    <span className="font-mono font-bold text-foreground mt-0.5 block">v{authoringRole.version}</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Job Domain</span>
                    <span className="font-semibold text-foreground mt-0.5 truncate block">
                      {JOB_DOMAINS.find((d) => d.code === authoringRole.domainCode)?.name || authoringRole.domainCode || authoringRole.department || 'ICT'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Career Family</span>
                    <span className="font-mono font-semibold text-foreground mt-0.5 truncate block">
                      {authoringRole.familyCode || 'GENERAL'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>
                    <span className="font-semibold text-primary mt-0.5 truncate block">
                      {authoringRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === authoringRole.assignedExpertId)?.name || activeExpert.name}
                    </span>
                  </div>
                </div>

                {authoringRole.description && (
                  <div className="p-2.5 rounded bg-card border border-border text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                      Role Objective &amp; Scope
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {authoringRole.description}
                    </p>
                  </div>
                )}

                {authoringRole.responsibilities && authoringRole.responsibilities.length > 0 && (
                  <div className="p-2.5 rounded bg-card border border-border space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Core Responsibilities ({authoringRole.responsibilities.length})
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-foreground leading-relaxed">
                      {authoringRole.responsibilities.map((resp, idx) => (
                        <li key={idx} className="pl-0.5 text-xs">
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Form to Add New Micro-Skill Target */}
              {authoringRole.status !== 'published' && (
                <div className={`p-3.5 rounded-lg border border-border bg-card space-y-3 transition-all duration-200 ${isSkillDropdownOpen ? 'pb-64' : ''}`}>
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-primary" />
                      Add Micro-skill Target
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Select from verified organization micro-skills
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-8">
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Micro-skill <span className="text-destructive">*</span>
                      </label>
                      <Combobox
                        size="sm"
                        clearable={false}
                        options={skillOptions}
                        value={newSkillId}
                        onChange={(val) => setNewSkillId(val)}
                        onOpenChange={setIsSkillDropdownOpen}
                        placeholder="Search & select micro-skill..."
                        searchPlaceholder="Search by skill code or title..."
                        emptyMessage="All micro-skills are already assigned"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Threshold (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={5}
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!newSkillId}
                        onClick={handleAddSkillTarget}
                        className="w-full font-semibold shadow-2xs"
                      >
                        + Assign
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of Assigned Micro-Skill Targets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Configured Micro-skills ({authoringRole.skillTargets.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Threshold Required
                  </span>
                </div>

                {authoringRole.skillTargets.length > 2 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter configured targets by code or name..."
                      value={configuredSkillSearch}
                      onChange={(e) => setConfiguredSkillSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {authoringRole.skillTargets.length === 0 ? (
                  <div className="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">
                    <AlertCircle className="h-5 w-5 mx-auto text-warning" />
                    <p className="font-semibold text-foreground">No Micro-skills Configured Yet</p>
                    <p className="text-[11px]">
                      Add the required micro-skills above to specify competencies needed for this role.
                    </p>
                  </div>
                ) : (() => {
                  const filteredTargets = authoringRole.skillTargets.filter(
                    (st) =>
                      !configuredSkillSearch.trim() ||
                      st.skillCode.toLowerCase().includes(configuredSkillSearch.toLowerCase()) ||
                      st.skillName.toLowerCase().includes(configuredSkillSearch.toLowerCase())
                  )

                  if (filteredTargets.length === 0) {
                    return (
                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                        No configured targets match &ldquo;{configuredSkillSearch}&rdquo;.
                      </div>
                    )
                  }

                  return (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-3">Skill Code &amp; Name</th>
                            <th className="py-2.5 px-3 text-center">Required Threshold</th>
                            {authoringRole.status !== 'published' && (
                              <th className="py-2.5 px-3 text-right">Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTargets.map((st) => (
                            <tr key={st.skillId} className="hover:bg-muted/20">
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-foreground mr-1.5">{st.skillCode}</span>
                                <span className="text-muted-foreground">{st.skillName}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-primary">
                                {st.threshold}%
                              </td>
                              {authoringRole.status !== 'published' && (
                                <td className="py-2.5 px-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveSkillTarget(st.skillId)}
                                    title="Detach Micro-skill"
                                    aria-label="Detach Micro-skill"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </div>

            <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between w-full pt-3 border-t border-border mt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAuthoringModalOpen(false)}>
                Close
              </Button>
              {authoringRole.status !== 'published' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    leftIcon={<XCircle className="h-4 w-4 text-destructive" />}
                    onClick={() => {
                      setIsAuthoringModalOpen(false)
                      handleOpenRejectDialog(authoringRole)
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={authoringRole.skillTargets.length === 0}
                    onClick={handlePublishFromExpert}
                    className="font-semibold shadow-2xs"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Publish
                  </Button>
                </div>
              )}
            </DialogFooter>
        </Dialog>
      )}

      {/* REJECT CONFIRMATION DIALOG */}
      {rejectingRole && (
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} className="max-w-md">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Reject Target Role: {rejectingRole.title}</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this target role? The role status will become REJECTED and returned to the L&amp;D Manager for adjustment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground font-mono">{rejectingRole.code}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    v{rejectingRole.version}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs font-medium">
                  {rejectingRole.title}
                </div>
                <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-destructive/10 flex items-center justify-between">
                  <span>Assigned Domain Expert:</span>
                  <span className="font-semibold text-foreground">{activeExpert.name}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Reason for Rejection <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed feedback on why this target role is rejected (e.g. required skill competencies are incomplete, incorrect baseline thresholds, or out-of-scope taxonomy)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmRejection}
                leftIcon={<XCircle className="h-4 w-4" />}
                className="font-semibold shadow-2xs"
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* TARGET ROLE DETAILS MODAL (Read-Only Architectural Metadata for Domain Expert) */}
      {viewingDetailsRole && (
        <Dialog
          open={Boolean(viewingDetailsRole)}
          onOpenChange={(open) => !open && setViewingDetailsRole(null)}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary shrink-0" />
                  <span>Target Role Details: {viewingDetailsRole.title}</span>
                </DialogTitle>
                <Badge
                  variant={
                    viewingDetailsRole.status === 'published'
                      ? 'success'
                      : viewingDetailsRole.status === 'sent'
                      ? 'primary'
                      : viewingDetailsRole.status === 'rejected'
                      ? 'destructive'
                      : 'warning'
                  }
                  className={
                    viewingDetailsRole.status === 'sent'
                      ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400 text-xs'
                      : 'font-bold text-xs'
                  }
                >
                  {viewingDetailsRole.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                Comprehensive role architecture, ontology requirements, and active enterprise enrollments.
              </DialogDescription>
            </DialogHeader>

            {/* Rejection Feedback Callout (if rejected) */}
            {viewingDetailsRole.status === 'rejected' && viewingDetailsRole.rejectionReason && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                <div>
                  <div className="font-bold text-foreground">Rejection Feedback to L&amp;D Manager:</div>
                  <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">{viewingDetailsRole.rejectionReason}</div>
                </div>
              </div>
            )}

            {/* Meta Grid (Exactly matching screenshot) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsRole.code}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Track &amp; Seniority</span>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant={viewingDetailsRole.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px] font-semibold">
                    {viewingDetailsRole.track || 'PROFESSIONAL'}
                  </Badge>
                  {viewingDetailsRole.seniority && (
                    <Badge variant="primary" className="text-[10px] font-semibold">
                      {viewingDetailsRole.seniority}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsRole.version}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Job Domain</span>
                <span className="font-semibold text-foreground mt-0.5 truncate block">
                  {JOB_DOMAINS.find((d) => d.code === viewingDetailsRole.domainCode)?.name || viewingDetailsRole.domainCode || viewingDetailsRole.department || 'ICT'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Career Family</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 truncate block">
                  {viewingDetailsRole.familyCode || 'GENERAL'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>
                <span className="font-semibold text-primary mt-0.5 truncate block">
                  {viewingDetailsRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === viewingDetailsRole.assignedExpertId)?.name || activeExpert.name}
                </span>
              </div>
            </div>

            {/* Role Objective & Scope (Read-only) */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Role Objective &amp; Scope
                </span>
                <p className="text-foreground leading-relaxed">
                  {viewingDetailsRole.description || 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection. Awaiting domain expert micro-skill configuration.'}
                </p>
              </div>
            </div>

            {/* Core Responsibilities (Read-only) */}
            {viewingDetailsRole.responsibilities && viewingDetailsRole.responsibilities.length > 0 && (
              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Core Responsibilities ({viewingDetailsRole.responsibilities.length})
                </span>
                <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed">
                  {viewingDetailsRole.responsibilities.map((resp, idx) => (
                    <li key={idx} className="pl-1 text-xs">
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Micro-skill Benchmark Thresholds */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Configured Micro-skills ({viewingDetailsRole.skillTargets.length})
              </span>
              {viewingDetailsRole.skillTargets.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
                  No micro-skill proficiency thresholds configured yet.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Skill Code &amp; Name</th>
                        <th className="py-2 px-3 text-center">Required Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewingDetailsRole.skillTargets.map((st) => {
                        const skill = companyMicroSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                        const code = st.skillCode || skill?.code || 'SKILL'
                        const name = st.skillName || skill?.name || ''
                        return (
                          <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-foreground mr-1">{code}</span>
                              <span className="text-muted-foreground">{name}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-primary">
                              {st.threshold}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setViewingDetailsRole(null)}>
                Close
              </Button>
              {viewingDetailsRole.status !== 'published' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const r = viewingDetailsRole
                    setViewingDetailsRole(null)
                    handleOpenAuthoring(r)
                  }}
                  leftIcon={<Sliders className="h-3.5 w-3.5" />}
                >
                  Configure Micro-skills
                </Button>
              )}
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Target-Role Knowledge Graph View Modal (REQ-018-F01) */}
      <TargetRoleGraphModal
        open={Boolean(graphRole)}
        onOpenChange={(open) => !open && setGraphRole(null)}
        roleId={graphRole?.id || null}
        organizationId={orgId}
        roleTitle={graphRole?.title}
      />
    </WorkspaceLayout>
  )
}
